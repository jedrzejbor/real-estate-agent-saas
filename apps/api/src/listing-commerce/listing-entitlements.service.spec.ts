import { ConflictException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  ListingPublicationStatus,
  ListingStatus,
  PublicListingSubmissionStatus,
} from '../common/enums';
import { Listing } from '../listings/entities';
import { PublicListingSubmission } from '../public-listing-submissions/entities';
import { ListingEntitlement, ListingOrder, ListingOrderItem } from './entities';
import { ListingEntitlementsService } from './listing-entitlements.service';
import {
  ListingEntitlementSource,
  ListingEntitlementStatus,
  ListingEntitlementType,
  ListingOrderStatus,
  ListingProductType,
} from './listing-commerce.types';

function buildListing(overrides: Partial<Listing> = {}): Listing {
  return Object.assign(new Listing(), {
    id: 'listing-1',
    status: ListingStatus.DRAFT,
    publicationStatus: ListingPublicationStatus.DRAFT,
    publicSlug: 'mieszkanie-testowe',
    publishedAt: null,
    unpublishedAt: null,
    expiresAt: null,
    ...overrides,
  });
}

function buildSubmission(
  overrides: Partial<PublicListingSubmission> = {},
): PublicListingSubmission {
  return Object.assign(new PublicListingSubmission(), {
    id: 'submission-1',
    status: PublicListingSubmissionStatus.APPROVED,
    publishedListingId: 'listing-1',
    publishedAt: null,
    expiresAt: null,
    ...overrides,
  });
}

function buildItem(
  overrides: Partial<ListingOrderItem> = {},
): ListingOrderItem {
  return Object.assign(new ListingOrderItem(), {
    id: 'item-1',
    productTypeSnapshot: ListingProductType.PUBLICATION,
    durationDays: 60,
    fulfillmentParameters: { durationDays: 60 },
    ...overrides,
  });
}

function buildOrder(overrides: Partial<ListingOrder> = {}): ListingOrder {
  return Object.assign(new ListingOrder(), {
    id: 'order-1',
    listingId: 'listing-1',
    status: ListingOrderStatus.PAID,
    paidAt: new Date('2026-09-07T10:00:00.000Z'),
    metadata: {},
    items: [buildItem()],
    ...overrides,
  });
}

function buildHarness(options?: {
  listing?: Listing;
  submission?: PublicListingSubmission;
  previous?: ListingEntitlement | null;
  existing?: ListingEntitlement[];
}) {
  const listing = options?.listing ?? buildListing();
  const submission = options?.submission ?? buildSubmission();
  const manager = {
    findOne: jest.fn(async (entity: unknown) => {
      if (entity === Listing) return listing;
      if (entity === PublicListingSubmission) return submission;
      if (entity === ListingEntitlement) return options?.previous ?? null;
      return null;
    }),
    find: jest.fn().mockResolvedValue(options?.existing ?? []),
    create: jest.fn((_entity: unknown, value: object) =>
      Object.assign(new ListingEntitlement(), value),
    ),
    save: jest.fn(async (entity: unknown, value: object) => {
      if (entity === ListingEntitlement) {
        return Object.assign(value, { id: 'entitlement-created' });
      }
      return value;
    }),
  };
  const dataSource = {
    transaction: jest.fn((callback: (manager: EntityManager) => unknown) =>
      callback(manager as unknown as EntityManager),
    ),
  };
  const service = new ListingEntitlementsService(
    dataSource as unknown as DataSource,
  );
  return { service, manager, dataSource, listing, submission };
}

describe('ListingEntitlementsService', () => {
  const fulfilledAt = new Date('2026-09-07T10:00:00.000Z');

  it('publishes an approved listing from one active publication entitlement', async () => {
    const order = buildOrder();
    const { service, manager, listing, submission } = buildHarness();

    const result = await service.fulfillPaidOrderInTransaction(
      manager as unknown as EntityManager,
      order,
      fulfilledAt,
    );

    expect(result).toEqual({
      orderId: order.id,
      entitlementIds: ['entitlement-created'],
      alreadyFulfilled: false,
    });
    const entitlement = manager.save.mock.calls.find(
      ([entity]) => entity === ListingEntitlement,
    )?.[1] as ListingEntitlement;
    expect(entitlement).toMatchObject({
      listingId: listing.id,
      type: ListingEntitlementType.PUBLICATION,
      status: ListingEntitlementStatus.ACTIVE,
      sourceType: ListingEntitlementSource.ORDER_ITEM,
      orderItemId: 'item-1',
      startsAt: fulfilledAt,
    });
    expect(entitlement.endsAt.toISOString()).toBe('2026-11-06T10:00:00.000Z');
    expect(listing.status).toBe(ListingStatus.ACTIVE);
    expect(listing.publicationStatus).toBe(ListingPublicationStatus.PUBLISHED);
    expect(listing.expiresAt?.toISOString()).toBe('2026-11-06T10:00:00.000Z');
    expect(submission.status).toBe(PublicListingSubmissionStatus.PUBLISHED);
    expect(order.metadata.fulfilledAt).toBe(fulfilledAt.toISOString());
  });

  it('returns existing entitlements without extending dates a second time', async () => {
    const existing = Object.assign(new ListingEntitlement(), {
      id: 'entitlement-existing',
      orderItemId: 'item-1',
    });
    const order = buildOrder();
    const { service, manager } = buildHarness({ existing: [existing] });

    await expect(
      service.fulfillPaidOrderInTransaction(
        manager as unknown as EntityManager,
        order,
        fulfilledAt,
      ),
    ).resolves.toEqual({
      orderId: order.id,
      entitlementIds: ['entitlement-existing'],
      alreadyFulfilled: true,
    });
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('rejects fulfillment before the order is paid', async () => {
    const order = buildOrder({
      status: ListingOrderStatus.PENDING_PAYMENT,
      paidAt: null,
    });
    const { service, manager } = buildHarness();

    await expect(
      service.fulfillPaidOrderInTransaction(
        manager as unknown as EntityManager,
        order,
        fulfilledAt,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(manager.findOne).not.toHaveBeenCalled();
  });

  it('schedules renewal after the current publication end and extends expiry', async () => {
    const currentEnd = new Date('2026-10-01T10:00:00.000Z');
    const listing = buildListing({
      status: ListingStatus.ACTIVE,
      publicationStatus: ListingPublicationStatus.PUBLISHED,
      publishedAt: new Date('2026-08-01T10:00:00.000Z'),
      expiresAt: currentEnd,
    });
    const previous = Object.assign(new ListingEntitlement(), {
      id: 'previous-publication',
      endsAt: currentEnd,
    });
    const order = buildOrder({
      items: [
        buildItem({
          productTypeSnapshot: ListingProductType.RENEWAL,
          durationDays: 60,
        }),
      ],
    });
    const { service, manager } = buildHarness({ listing, previous });

    await service.fulfillPaidOrderInTransaction(
      manager as unknown as EntityManager,
      order,
      fulfilledAt,
    );

    const entitlement = manager.save.mock.calls.find(
      ([entity]) => entity === ListingEntitlement,
    )?.[1] as ListingEntitlement;
    expect(entitlement.status).toBe(ListingEntitlementStatus.SCHEDULED);
    expect(entitlement.startsAt).toEqual(currentEnd);
    expect(entitlement.endsAt.toISOString()).toBe('2026-11-30T10:00:00.000Z');
    expect(listing.expiresAt).toEqual(entitlement.endsAt);
  });

  it('locks an order before fulfillment in the standalone webhook entry point', async () => {
    const order = buildOrder();
    const { service, manager } = buildHarness();
    manager.findOne.mockResolvedValueOnce(order as never);

    await service.fulfillPaidOrder(order.id, fulfilledAt);

    expect(manager.findOne).toHaveBeenCalledWith(ListingOrder, {
      where: { id: order.id },
      relations: ['items'],
      lock: { mode: 'pessimistic_write' },
    });
  });

  it('keeps legacy premium cache enabled for an active featured entitlement', async () => {
    const listing = buildListing({
      status: ListingStatus.ACTIVE,
      publicationStatus: ListingPublicationStatus.PUBLISHED,
      publishedAt: new Date('2026-09-01T10:00:00.000Z'),
      expiresAt: new Date('2026-11-01T10:00:00.000Z'),
      isPremium: false,
    });
    const order = buildOrder({
      items: [
        buildItem({
          productTypeSnapshot: ListingProductType.FEATURED,
          durationDays: 7,
          fulfillmentParameters: {
            durationDays: 7,
            featuredTier: 'standard',
            priorityWeight: 100,
          },
        }),
      ],
    });
    const { service, manager } = buildHarness({ listing });
    const activeFeatured = Object.assign(new ListingEntitlement(), {
      id: 'entitlement-created',
      listingId: listing.id,
      type: ListingEntitlementType.FEATURED,
      status: ListingEntitlementStatus.ACTIVE,
      startsAt: fulfilledAt,
      endsAt: new Date('2026-09-14T10:00:00.000Z'),
    });
    manager.findOne.mockImplementation(async (entity: unknown) => {
      if (entity === Listing) return listing;
      if (entity === PublicListingSubmission) return buildSubmission();
      if (entity === ListingEntitlement) return activeFeatured;
      return null;
    });

    await service.fulfillPaidOrderInTransaction(
      manager as unknown as EntityManager,
      order,
      fulfilledAt,
    );

    expect(listing.isPremium).toBe(true);
    expect(manager.save).toHaveBeenCalledWith(Listing, listing);
  });

  it('queues another featured period after the current featured entitlement end', async () => {
    const currentFeaturedEnd = new Date('2026-09-14T10:00:00.000Z');
    const listing = buildListing({
      status: ListingStatus.ACTIVE,
      publicationStatus: ListingPublicationStatus.PUBLISHED,
      publishedAt: new Date('2026-09-01T10:00:00.000Z'),
      expiresAt: new Date('2026-11-01T10:00:00.000Z'),
      isPremium: true,
    });
    const previous = Object.assign(new ListingEntitlement(), {
      id: 'previous-featured',
      listingId: listing.id,
      type: ListingEntitlementType.FEATURED,
      tier: 'standard',
      status: ListingEntitlementStatus.ACTIVE,
      startsAt: new Date('2026-09-07T10:00:00.000Z'),
      endsAt: currentFeaturedEnd,
    });
    const order = buildOrder({
      items: [
        buildItem({
          productTypeSnapshot: ListingProductType.FEATURED,
          durationDays: 7,
          fulfillmentParameters: {
            durationDays: 7,
            featuredTier: 'standard',
            priorityWeight: 100,
          },
        }),
      ],
    });
    const { service, manager } = buildHarness({ listing, previous });

    await service.fulfillPaidOrderInTransaction(
      manager as unknown as EntityManager,
      order,
      fulfilledAt,
    );

    const entitlement = manager.save.mock.calls.find(
      ([entity]) => entity === ListingEntitlement,
    )?.[1] as ListingEntitlement;
    expect(entitlement.status).toBe(ListingEntitlementStatus.SCHEDULED);
    expect(entitlement.startsAt).toEqual(currentFeaturedEnd);
    expect(entitlement.endsAt.toISOString()).toBe('2026-09-21T10:00:00.000Z');
    expect(listing.isPremium).toBe(true);
  });

  it('grants a free admin publication through the entitlement lifecycle', async () => {
    const { service, manager, listing, submission } = buildHarness();

    await service.grantAdminEntitlementInTransaction(
      manager as unknown as EntityManager,
      {
        actorUserId: 'admin-1',
        listingId: listing.id,
        productType: ListingProductType.PUBLICATION,
        durationDays: 60,
        reason: 'Rekompensata po zgłoszeniu klienta',
        now: fulfilledAt,
      },
    );

    const entitlement = manager.save.mock.calls.find(
      ([entity]) => entity === ListingEntitlement,
    )?.[1] as ListingEntitlement;
    expect(entitlement).toMatchObject({
      listingId: listing.id,
      type: ListingEntitlementType.PUBLICATION,
      status: ListingEntitlementStatus.ACTIVE,
      sourceType: ListingEntitlementSource.ADMIN_GRANT,
      orderItemId: null,
      grantedByUserId: 'admin-1',
      startsAt: fulfilledAt,
    });
    expect(entitlement.endsAt.toISOString()).toBe('2026-11-06T10:00:00.000Z');
    expect(entitlement.parameters).toMatchObject({
      durationDays: 60,
      adminGrant: {
        reason: 'Rekompensata po zgłoszeniu klienta',
        grantedByUserId: 'admin-1',
        grantedAt: fulfilledAt.toISOString(),
        productType: ListingProductType.PUBLICATION,
      },
    });
    expect(listing.publicationStatus).toBe(ListingPublicationStatus.PUBLISHED);
    expect(listing.expiresAt).toEqual(entitlement.endsAt);
    expect(submission.status).toBe(PublicListingSubmissionStatus.PUBLISHED);
  });

  it('schedules an admin renewal after the current publication end', async () => {
    const currentEnd = new Date('2026-10-01T10:00:00.000Z');
    const listing = buildListing({
      status: ListingStatus.ACTIVE,
      publicationStatus: ListingPublicationStatus.PUBLISHED,
      publishedAt: new Date('2026-08-01T10:00:00.000Z'),
      expiresAt: currentEnd,
    });
    const previous = Object.assign(new ListingEntitlement(), {
      id: 'previous-publication',
      listingId: listing.id,
      type: ListingEntitlementType.PUBLICATION,
      status: ListingEntitlementStatus.ACTIVE,
      startsAt: new Date('2026-08-01T10:00:00.000Z'),
      endsAt: currentEnd,
    });
    const { service, manager } = buildHarness({ listing, previous });

    await service.grantAdminEntitlementInTransaction(
      manager as unknown as EntityManager,
      {
        actorUserId: 'admin-1',
        listingId: listing.id,
        productType: ListingProductType.RENEWAL,
        durationDays: 60,
        reason: 'Przedłużenie obsługi posprzedażowej',
        now: fulfilledAt,
      },
    );

    const entitlement = manager.save.mock.calls.find(
      ([entity]) => entity === ListingEntitlement,
    )?.[1] as ListingEntitlement;
    expect(entitlement).toMatchObject({
      type: ListingEntitlementType.PUBLICATION,
      status: ListingEntitlementStatus.SCHEDULED,
      sourceType: ListingEntitlementSource.ADMIN_GRANT,
      grantedByUserId: 'admin-1',
    });
    expect(entitlement.startsAt).toEqual(currentEnd);
    expect(entitlement.endsAt.toISOString()).toBe('2026-11-30T10:00:00.000Z');
    expect(entitlement.parameters.adminGrant).toMatchObject({
      productType: ListingProductType.RENEWAL,
    });
    expect(listing.expiresAt).toEqual(entitlement.endsAt);
  });

  it('grants an admin featured entitlement and refreshes premium cache', async () => {
    const listing = buildListing({
      status: ListingStatus.ACTIVE,
      publicationStatus: ListingPublicationStatus.PUBLISHED,
      publishedAt: new Date('2026-09-01T10:00:00.000Z'),
      expiresAt: new Date('2026-11-01T10:00:00.000Z'),
      isPremium: false,
    });
    const { service, manager } = buildHarness({ listing });
    const savedFeatured = Object.assign(new ListingEntitlement(), {
      id: 'entitlement-created',
      listingId: listing.id,
      type: ListingEntitlementType.FEATURED,
      status: ListingEntitlementStatus.ACTIVE,
      startsAt: fulfilledAt,
      endsAt: new Date('2026-09-14T10:00:00.000Z'),
    });
    manager.findOne.mockImplementation(async (entity: unknown) => {
      if (entity === Listing) return listing;
      if (entity === PublicListingSubmission) return buildSubmission();
      if (entity === ListingEntitlement) return savedFeatured;
      return null;
    });

    await service.grantAdminEntitlementInTransaction(
      manager as unknown as EntityManager,
      {
        actorUserId: 'admin-1',
        listingId: listing.id,
        productType: ListingProductType.FEATURED,
        durationDays: 7,
        featuredTier: 'standard',
        priorityWeight: 100,
        reason: 'Promocyjne wyróżnienie po kontakcie z supportem',
        now: fulfilledAt,
      },
    );

    const entitlement = manager.save.mock.calls.find(
      ([entity]) => entity === ListingEntitlement,
    )?.[1] as ListingEntitlement;
    expect(entitlement).toMatchObject({
      type: ListingEntitlementType.FEATURED,
      tier: 'standard',
      sourceType: ListingEntitlementSource.ADMIN_GRANT,
      grantedByUserId: 'admin-1',
    });
    expect(entitlement.parameters).toMatchObject({
      durationDays: 7,
      featuredTier: 'standard',
      priorityWeight: 100,
      adminGrant: {
        productType: ListingProductType.FEATURED,
      },
    });
    expect(listing.isPremium).toBe(true);
  });

  it('rejects an admin grant without an audit reason', async () => {
    const { service, manager, listing } = buildHarness();

    await expect(
      service.grantAdminEntitlementInTransaction(
        manager as unknown as EntityManager,
        {
          actorUserId: 'admin-1',
          listingId: listing.id,
          productType: ListingProductType.PUBLICATION,
          durationDays: 60,
          reason: ' ',
          now: fulfilledAt,
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(manager.findOne).not.toHaveBeenCalled();
  });

  it('rejects an admin featured grant without a featured tier', async () => {
    const { service, manager, listing } = buildHarness();

    await expect(
      service.grantAdminEntitlementInTransaction(
        manager as unknown as EntityManager,
        {
          actorUserId: 'admin-1',
          listingId: listing.id,
          productType: ListingProductType.FEATURED,
          durationDays: 7,
          reason: 'Promocyjne wyróżnienie',
          now: fulfilledAt,
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(manager.save).not.toHaveBeenCalledWith(
      ListingEntitlement,
      expect.any(ListingEntitlement),
    );
  });

  it('sends 2-day featured expiry reminders once per entitlement end date', async () => {
    const now = new Date('2026-09-12T10:00:00.000Z');
    const endsAt = new Date('2026-09-14T09:00:00.000Z');
    const entitlement = Object.assign(new ListingEntitlement(), {
      id: 'featured-ending',
      listingId: 'listing-1',
      type: ListingEntitlementType.FEATURED,
      status: ListingEntitlementStatus.ACTIVE,
      startsAt: new Date('2026-09-07T10:00:00.000Z'),
      endsAt,
      parameters: { featuredTier: 'standard', priorityWeight: 100 },
    });
    const listing = buildListing({
      id: 'listing-1',
      title: 'Mieszkanie testowe',
      publicTitle: 'Publiczne mieszkanie testowe',
      ownerUser: { email: 'owner@example.test' },
    } as Partial<Listing>);
    const manager = {
      find: jest
        .fn()
        .mockResolvedValueOnce([entitlement])
        .mockResolvedValueOnce([listing]),
      save: jest.fn().mockResolvedValue(entitlement),
    };
    const emailService = { send: jest.fn().mockResolvedValue(undefined) };
    const configService = {
      get: jest.fn().mockReturnValue('https://podadresem.test'),
    };
    const service = new ListingEntitlementsService(
      {
        transaction: (callback: (tx: EntityManager) => unknown) =>
          callback(manager as unknown as EntityManager),
      } as unknown as DataSource,
      emailService as never,
      configService as never,
    );

    await expect(service.sendFeaturedExpiryReminders(now)).resolves.toEqual({
      processed: 1,
      sent: 1,
      skipped: 0,
    });
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'owner@example.test',
        subject: 'Wyróżnienie ogłoszenia kończy się za 2 dni',
        text: expect.stringContaining(
          'Możesz przedłużyć wyróżnienie w panelu właściciela: https://podadresem.test/seller',
        ),
      }),
    );
    expect(entitlement.parameters.featuredExpiryReminder2Days).toMatchObject({
      endsAt: endsAt.toISOString(),
      sentAt: now.toISOString(),
    });
    expect(manager.save).toHaveBeenCalledWith(ListingEntitlement, entitlement);
  });

  it('skips a featured expiry reminder already sent for the same end date', async () => {
    const now = new Date('2026-09-12T10:00:00.000Z');
    const endsAt = new Date('2026-09-14T09:00:00.000Z');
    const entitlement = Object.assign(new ListingEntitlement(), {
      id: 'featured-ending',
      listingId: 'listing-1',
      type: ListingEntitlementType.FEATURED,
      status: ListingEntitlementStatus.ACTIVE,
      startsAt: new Date('2026-09-07T10:00:00.000Z'),
      endsAt,
      parameters: {
        featuredExpiryReminder2Days: {
          sentAt: '2026-09-12T08:00:00.000Z',
          endsAt: endsAt.toISOString(),
        },
      },
    });
    const manager = {
      find: jest.fn().mockResolvedValue([entitlement]),
      save: jest.fn(),
    };
    const emailService = { send: jest.fn() };
    const service = new ListingEntitlementsService(
      {
        transaction: (callback: (tx: EntityManager) => unknown) =>
          callback(manager as unknown as EntityManager),
      } as unknown as DataSource,
      emailService as never,
    );

    await expect(service.sendFeaturedExpiryReminders(now)).resolves.toEqual({
      processed: 1,
      sent: 0,
      skipped: 1,
    });
    expect(emailService.send).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
  });
});
