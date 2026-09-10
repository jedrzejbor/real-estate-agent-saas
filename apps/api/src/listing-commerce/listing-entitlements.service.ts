import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DataSource,
  EntityManager,
  In,
  LessThanOrEqual,
  MoreThan,
} from 'typeorm';
import {
  ListingPublicationStatus,
  ListingStatus,
  PublicListingSubmissionStatus,
} from '../common/enums';
import { EmailService } from '../email';
import { Listing } from '../listings/entities';
import { PublicListingSubmission } from '../public-listing-submissions/entities';
import type { ListingOrderFulfillmentContract } from './contracts';
import type { ListingEntitlementContract } from './contracts';
import { ListingEntitlement, ListingOrder } from './entities';
import { toListingEntitlementContract } from './listing-entitlement.presenter';
import { getEntitlementTypeForProduct } from './listing-commerce.policy';
import {
  ListingEntitlementSource,
  ListingEntitlementStatus,
  ListingEntitlementType,
  ListingOrderStatus,
  ListingProductType,
} from './listing-commerce.types';

const ACTIVE_ENTITLEMENT_STATUSES = [
  ListingEntitlementStatus.ACTIVE,
  ListingEntitlementStatus.SCHEDULED,
] as const;
const DAY_MS = 24 * 60 * 60 * 1000;
const FEATURED_EXPIRY_REMINDER_DAYS = 2;

@Injectable()
export class ListingEntitlementsService {
  private readonly logger = new Logger(ListingEntitlementsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Optional()
    private readonly emailService?: EmailService,
    @Optional()
    private readonly configService?: ConfigService,
  ) {}

  async findOwnedForListing(
    buyerUserId: string,
    listingId: string,
  ): Promise<ListingEntitlementContract[]> {
    const listing = await this.dataSource.getRepository(Listing).findOne({
      where: { id: listingId, ownerUserId: buyerUserId },
      select: { id: true },
    });
    if (!listing) throw new NotFoundException('Ogłoszenie nie istnieje');

    const entitlements = await this.dataSource
      .getRepository(ListingEntitlement)
      .find({
        where: {
          listingId,
          status: In([
            ListingEntitlementStatus.SCHEDULED,
            ListingEntitlementStatus.ACTIVE,
          ]),
        },
        order: { startsAt: 'ASC' },
      });
    return entitlements.map(toListingEntitlementContract);
  }

  /**
   * Advances scheduled benefits and expires benefits whose period has ended.
   * The operation is deliberately idempotent so it can be safely retried by a
   * scheduler or an operational command.
   */
  async processDueEntitlements(
    now = new Date(),
    batchSize = 500,
  ): Promise<{ activated: number; expired: number }> {
    return this.dataSource.transaction(async (manager) => {
      const scheduled = await manager.find(ListingEntitlement, {
        where: {
          status: ListingEntitlementStatus.SCHEDULED,
          startsAt: LessThanOrEqual(now),
        },
        order: { startsAt: 'ASC' },
        take: batchSize,
        lock: { mode: 'pessimistic_write' },
      });
      const ending = await manager.find(ListingEntitlement, {
        where: {
          status: In([...ACTIVE_ENTITLEMENT_STATUSES]),
          endsAt: LessThanOrEqual(now),
        },
        order: { endsAt: 'ASC' },
        take: batchSize,
        lock: { mode: 'pessimistic_write' },
      });

      const due = new Map<string, ListingEntitlement>();
      [...scheduled, ...ending].forEach((entitlement) =>
        due.set(entitlement.id, entitlement),
      );

      let activated = 0;
      let expired = 0;
      const changed: ListingEntitlement[] = [];
      const featuredListingIdsToSync = new Set<string>();
      for (const entitlement of due.values()) {
        if (entitlement.endsAt.getTime() <= now.getTime()) {
          if (entitlement.status !== ListingEntitlementStatus.EXPIRED) {
            entitlement.status = ListingEntitlementStatus.EXPIRED;
            expired += 1;
            changed.push(entitlement);
            if (entitlement.type === ListingEntitlementType.FEATURED) {
              featuredListingIdsToSync.add(entitlement.listingId);
            }
          }
          continue;
        }
        if (
          entitlement.status === ListingEntitlementStatus.SCHEDULED &&
          entitlement.startsAt.getTime() <= now.getTime()
        ) {
          entitlement.status = ListingEntitlementStatus.ACTIVE;
          activated += 1;
          changed.push(entitlement);
          if (entitlement.type === ListingEntitlementType.FEATURED) {
            featuredListingIdsToSync.add(entitlement.listingId);
          }
        }
      }

      if (changed.length) await manager.save(ListingEntitlement, changed);
      await this.syncPremiumCacheForListings(
        manager,
        featuredListingIdsToSync,
        now,
      );
      await this.unpublishListingsWithoutActivePublication(manager, now);
      return { activated, expired };
    });
  }

  fulfillPaidOrder(
    orderId: string,
    fulfilledAt = new Date(),
  ): Promise<ListingOrderFulfillmentContract> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(ListingOrder, {
        where: { id: orderId },
        relations: ['items'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Zamówienie nie istnieje');
      return this.fulfillPaidOrderInTransaction(manager, order, fulfilledAt);
    });
  }

  async sendFeaturedExpiryReminders(
    now = new Date(),
    batchSize = 250,
  ): Promise<{ processed: number; sent: number; skipped: number }> {
    const windowEnd = new Date(
      now.getTime() + FEATURED_EXPIRY_REMINDER_DAYS * DAY_MS,
    );

    return this.dataSource.transaction(async (manager) => {
      const entitlements = await manager.find(ListingEntitlement, {
        where: {
          type: ListingEntitlementType.FEATURED,
          status: ListingEntitlementStatus.ACTIVE,
          endsAt: LessThanOrEqual(windowEnd),
        },
        relations: ['listing', 'listing.ownerUser'],
        order: { endsAt: 'ASC' },
        take: batchSize,
        lock: { mode: 'pessimistic_write' },
      });
      const candidates = entitlements.filter(
        (entitlement) => entitlement.endsAt.getTime() > now.getTime(),
      );

      let sent = 0;
      let skipped = 0;

      for (const entitlement of candidates) {
        if (
          hasSentFeaturedExpiryReminder(
            entitlement.parameters,
            entitlement.endsAt,
          )
        ) {
          skipped += 1;
          continue;
        }

        const listing = entitlement.listing;
        const ownerEmail = listing?.ownerUser?.email;
        if (!listing || !ownerEmail) {
          skipped += 1;
          continue;
        }

        await this.sendFeaturedExpiryReminderEmail({
          to: ownerEmail,
          listingTitle: listing.publicTitle || listing.title,
          endsAt: entitlement.endsAt,
        });
        entitlement.parameters = {
          ...entitlement.parameters,
          featuredExpiryReminder2Days: {
            sentAt: now.toISOString(),
            endsAt: entitlement.endsAt.toISOString(),
          },
        };
        await manager.save(ListingEntitlement, entitlement);
        sent += 1;
      }

      return {
        processed: candidates.length,
        sent,
        skipped,
      };
    });
  }

  async fulfillPaidOrderInTransaction(
    manager: EntityManager,
    order: ListingOrder,
    fulfilledAt: Date,
  ): Promise<ListingOrderFulfillmentContract> {
    if (order.status !== ListingOrderStatus.PAID || !order.paidAt) {
      throw new ConflictException(
        'Korzyści można przyznać wyłącznie dla opłaconego zamówienia',
      );
    }
    if (!order.listingId || !order.items?.length) {
      throw new ConflictException(
        'Zamówienie nie ma kompletnego zakresu realizacji',
      );
    }

    const listing = await manager.findOne(Listing, {
      where: { id: order.listingId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!listing) throw new NotFoundException('Ogłoszenie nie istnieje');

    const itemIds = order.items.map((item) => item.id);
    const existing = await manager.find(ListingEntitlement, {
      where: { orderItemId: In(itemIds) },
      order: { createdAt: 'ASC' },
    });
    if (existing.length === itemIds.length) {
      return {
        orderId: order.id,
        entitlementIds: existing.map((entitlement) => entitlement.id),
        alreadyFulfilled: true,
      };
    }

    const existingItemIds = new Set(
      existing.map((entitlement) => entitlement.orderItemId),
    );
    const created: ListingEntitlement[] = [];
    const featuredListingIdsToSync = new Set<string>();
    for (const item of order.items) {
      if (existingItemIds.has(item.id)) continue;

      const entitlementType = getEntitlementTypeForProduct(
        item.productTypeSnapshot,
      );
      const previous = await this.findLatestActiveEntitlement(
        manager,
        listing.id,
        entitlementType,
        item.productTypeSnapshot === ListingProductType.FEATURED
          ? (item.fulfillmentParameters.featuredTier as string | undefined)
          : undefined,
      );
      const startsAt = getEntitlementStart(
        item.productTypeSnapshot,
        fulfilledAt,
        listing.expiresAt ?? null,
        previous?.endsAt ?? null,
      );
      const endsAt = new Date(startsAt.getTime() + item.durationDays * DAY_MS);
      const entitlement = manager.create(ListingEntitlement, {
        listingId: listing.id,
        type: entitlementType,
        status:
          startsAt.getTime() > fulfilledAt.getTime()
            ? ListingEntitlementStatus.SCHEDULED
            : ListingEntitlementStatus.ACTIVE,
        tier:
          entitlementType === ListingEntitlementType.FEATURED
            ? getRequiredFeaturedTier(item.fulfillmentParameters.featuredTier)
            : null,
        sourceType: ListingEntitlementSource.ORDER_ITEM,
        orderItemId: item.id,
        startsAt,
        endsAt,
        parameters: item.fulfillmentParameters,
      });
      created.push(await manager.save(ListingEntitlement, entitlement));

      if (entitlementType === ListingEntitlementType.PUBLICATION) {
        await this.applyPublicationEntitlement(
          manager,
          listing,
          endsAt,
          fulfilledAt,
        );
      }
      if (entitlementType === ListingEntitlementType.FEATURED) {
        featuredListingIdsToSync.add(listing.id);
      }
    }

    await this.syncPremiumCacheForListings(
      manager,
      featuredListingIdsToSync,
      fulfilledAt,
    );

    order.metadata = {
      ...order.metadata,
      fulfilledAt: fulfilledAt.toISOString(),
    };
    await manager.save(ListingOrder, order);

    return {
      orderId: order.id,
      entitlementIds: [
        ...existing.map((entitlement) => entitlement.id),
        ...created.map((entitlement) => entitlement.id),
      ],
      alreadyFulfilled: false,
    };
  }

  private findLatestActiveEntitlement(
    manager: EntityManager,
    listingId: string,
    type: ListingEntitlementType,
    tier?: string,
  ): Promise<ListingEntitlement | null> {
    return manager.findOne(ListingEntitlement, {
      where: {
        listingId,
        type,
        status: In([...ACTIVE_ENTITLEMENT_STATUSES]),
        ...(tier ? { tier } : {}),
      },
      order: { endsAt: 'DESC' },
      lock: { mode: 'pessimistic_write' },
    });
  }

  private async applyPublicationEntitlement(
    manager: EntityManager,
    listing: Listing,
    endsAt: Date,
    fulfilledAt: Date,
  ): Promise<void> {
    if (!listing.publicSlug) {
      throw new ConflictException(
        'Ogłoszenie nie ma sluga wymaganego do publikacji',
      );
    }
    listing.status = ListingStatus.ACTIVE;
    listing.publicationStatus = ListingPublicationStatus.PUBLISHED;
    listing.publishedAt = listing.publishedAt ?? fulfilledAt;
    listing.unpublishedAt = null;
    listing.expiresAt = maxDate(listing.expiresAt ?? null, endsAt);
    await manager.save(Listing, listing);

    const submission = await manager.findOne(PublicListingSubmission, {
      where: { publishedListingId: listing.id },
      order: { createdAt: 'DESC' },
      lock: { mode: 'pessimistic_write' },
    });
    if (!submission) {
      throw new ConflictException(
        'Ogłoszenie nie ma zgłoszenia wymaganego do publikacji',
      );
    }
    submission.status = PublicListingSubmissionStatus.PUBLISHED;
    submission.publishedAt = submission.publishedAt ?? fulfilledAt;
    submission.expiresAt = listing.expiresAt;
    await manager.save(PublicListingSubmission, submission);
  }

  private async unpublishListingsWithoutActivePublication(
    manager: EntityManager,
    now: Date,
  ): Promise<void> {
    const expiredPublicationListings = await manager.find(ListingEntitlement, {
      where: {
        type: ListingEntitlementType.PUBLICATION,
        status: ListingEntitlementStatus.EXPIRED,
        endsAt: LessThanOrEqual(now),
      },
      order: { endsAt: 'DESC' },
      take: 500,
    });
    const listingIds = [
      ...new Set(expiredPublicationListings.map((e) => e.listingId)),
    ];
    for (const listingId of listingIds) {
      const active = await manager.findOne(ListingEntitlement, {
        where: {
          listingId,
          type: ListingEntitlementType.PUBLICATION,
          status: In([...ACTIVE_ENTITLEMENT_STATUSES]),
          endsAt: MoreThan(now),
        },
      });
      if (active) continue;
      const listing = await manager.findOne(Listing, {
        where: { id: listingId },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !listing ||
        listing.publicationStatus !== ListingPublicationStatus.PUBLISHED
      ) {
        continue;
      }
      listing.publicationStatus = ListingPublicationStatus.UNPUBLISHED;
      listing.unpublishedAt = now;
      await manager.save(Listing, listing);
    }
  }

  private async syncPremiumCacheForListings(
    manager: EntityManager,
    listingIds: Iterable<string>,
    now: Date,
  ): Promise<void> {
    for (const listingId of new Set(listingIds)) {
      const activeFeatured = await manager.findOne(ListingEntitlement, {
        where: {
          listingId,
          type: ListingEntitlementType.FEATURED,
          status: ListingEntitlementStatus.ACTIVE,
          startsAt: LessThanOrEqual(now),
          endsAt: MoreThan(now),
        },
      });
      const listing = await manager.findOne(Listing, {
        where: { id: listingId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!listing) continue;

      const shouldBePremium = Boolean(activeFeatured);
      if (listing.isPremium === shouldBePremium) continue;

      listing.isPremium = shouldBePremium;
      await manager.save(Listing, listing);
    }
  }

  private async sendFeaturedExpiryReminderEmail(input: {
    to: string;
    listingTitle: string;
    endsAt: Date;
  }): Promise<void> {
    if (!this.emailService) {
      this.logger.warn(
        `Skipping featured expiry reminder for "${input.listingTitle}": email service is unavailable`,
      );
      return;
    }

    const sellerUrl = this.buildFrontendUrl('/seller');
    await this.emailService.send({
      to: input.to,
      subject: 'Wyróżnienie ogłoszenia kończy się za 2 dni',
      text: [
        `Wyróżnienie ogłoszenia "${input.listingTitle}" kończy się za 2 dni, ${formatDateForEmail(input.endsAt)}.`,
        '',
        'Po tym czasie oferta wróci do standardowej kolejności w katalogu.',
        '',
        `Możesz przedłużyć wyróżnienie w panelu właściciela: ${sellerUrl}`,
      ].join('\n'),
    });
  }

  private buildFrontendUrl(path: string): string {
    const frontendUrl = this.configService?.get(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const normalizedFrontendUrl = String(frontendUrl).replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    return `${normalizedFrontendUrl}${normalizedPath}`;
  }
}

function hasSentFeaturedExpiryReminder(
  parameters: Record<string, unknown> | null | undefined,
  endsAt: Date,
): boolean {
  const reminder = parameters?.featuredExpiryReminder2Days;
  if (typeof reminder !== 'object' || reminder === null) return false;

  return (reminder as { endsAt?: unknown }).endsAt === endsAt.toISOString();
}

function formatDateForEmail(value: Date): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value);
}

function getEntitlementStart(
  productType: ListingProductType,
  fulfilledAt: Date,
  listingExpiresAt: Date | null,
  previousEndsAt: Date | null,
): Date {
  if (productType === ListingProductType.PUBLICATION) {
    return fulfilledAt;
  }
  if (productType === ListingProductType.RENEWAL) {
    return maxDate(fulfilledAt, listingExpiresAt, previousEndsAt);
  }
  return maxDate(fulfilledAt, previousEndsAt);
}

function maxDate(first: Date | null, ...rest: Array<Date | null>): Date {
  const values = [first, ...rest].filter((date): date is Date => Boolean(date));
  return new Date(Math.max(...values.map((date) => date.getTime())));
}

function getRequiredFeaturedTier(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ConflictException(
      'Pozycja wyróżnienia nie ma kompletnej konfiguracji realizacji',
    );
  }
  return value.trim();
}
