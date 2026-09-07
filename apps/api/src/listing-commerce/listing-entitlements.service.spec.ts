import { ConflictException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  ListingPublicationStatus,
  ListingStatus,
  PublicListingSubmissionStatus,
} from '../common/enums';
import { Listing } from '../listings/entities';
import { PublicListingSubmission } from '../public-listing-submissions/entities';
import {
  ListingEntitlement,
  ListingOrder,
  ListingOrderItem,
} from './entities';
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
    expect(entitlement.endsAt.toISOString()).toBe(
      '2026-11-06T10:00:00.000Z',
    );
    expect(listing.status).toBe(ListingStatus.ACTIVE);
    expect(listing.publicationStatus).toBe(
      ListingPublicationStatus.PUBLISHED,
    );
    expect(listing.expiresAt?.toISOString()).toBe(
      '2026-11-06T10:00:00.000Z',
    );
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
    expect(entitlement.endsAt.toISOString()).toBe(
      '2026-11-30T10:00:00.000Z',
    );
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
});
