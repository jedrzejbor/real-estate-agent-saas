import { DataSource, EntityManager } from 'typeorm';
import { ListingPublicationStatus } from '../common/enums';
import { Listing } from '../listings/entities';
import { ListingEntitlement } from './entities';
import { ListingEntitlementsService } from './listing-entitlements.service';
import {
  ListingEntitlementStatus,
  ListingEntitlementType,
} from './listing-commerce.types';

describe('ListingEntitlementsService lifecycle', () => {
  it('activates scheduled benefits and expires ended benefits idempotently', async () => {
    const now = new Date('2026-09-07T12:00:00.000Z');
    const scheduled = Object.assign(new ListingEntitlement(), {
      id: 'scheduled',
      listingId: 'listing-1',
      type: ListingEntitlementType.FEATURED,
      status: ListingEntitlementStatus.SCHEDULED,
      startsAt: new Date('2026-09-07T11:00:00.000Z'),
      endsAt: new Date('2026-09-14T11:00:00.000Z'),
    });
    const ended = Object.assign(new ListingEntitlement(), {
      id: 'ended',
      listingId: 'listing-1',
      type: ListingEntitlementType.FEATURED,
      status: ListingEntitlementStatus.ACTIVE,
      startsAt: new Date('2026-08-31T11:00:00.000Z'),
      endsAt: new Date('2026-09-07T11:00:00.000Z'),
    });
    const manager = {
      find: jest
        .fn()
        .mockResolvedValueOnce([scheduled])
        .mockResolvedValueOnce([ended])
        .mockResolvedValueOnce([]),
      save: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };
    const service = new ListingEntitlementsService({
      transaction: (callback: (tx: EntityManager) => unknown) =>
        callback(manager as unknown as EntityManager),
    } as unknown as DataSource);

    await expect(service.processDueEntitlements(now)).resolves.toEqual({
      activated: 1,
      expired: 1,
    });
    expect(scheduled.status).toBe(ListingEntitlementStatus.ACTIVE);
    expect(ended.status).toBe(ListingEntitlementStatus.EXPIRED);
    expect(manager.save).toHaveBeenCalledWith(ListingEntitlement, [
      scheduled,
      ended,
    ]);
  });

  it('unpublishes a listing after its last publication entitlement expires', async () => {
    const now = new Date('2026-09-07T12:00:00.000Z');
    const expired = Object.assign(new ListingEntitlement(), {
      id: 'publication-expired',
      listingId: 'listing-1',
      type: ListingEntitlementType.PUBLICATION,
      status: ListingEntitlementStatus.EXPIRED,
      startsAt: new Date('2026-08-01T12:00:00.000Z'),
      endsAt: new Date('2026-09-07T11:00:00.000Z'),
    });
    const listing = {
      id: 'listing-1',
      publicationStatus: ListingPublicationStatus.PUBLISHED,
      unpublishedAt: null,
    };
    const manager = {
      find: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([expired]),
      findOne: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(listing),
      save: jest.fn().mockResolvedValue(listing),
    };
    const service = new ListingEntitlementsService({
      transaction: (callback: (tx: EntityManager) => unknown) =>
        callback(manager as unknown as EntityManager),
    } as unknown as DataSource);

    await service.processDueEntitlements(now);

    expect(listing.publicationStatus).toBe(ListingPublicationStatus.UNPUBLISHED);
    expect(listing.unpublishedAt).toBe(now);
    expect(manager.save).toHaveBeenCalledWith(expect.anything(), listing);
  });

  it('clears legacy premium cache after the last active featured entitlement expires', async () => {
    const now = new Date('2026-09-07T12:00:00.000Z');
    const ended = Object.assign(new ListingEntitlement(), {
      id: 'featured-ended',
      listingId: 'listing-1',
      type: ListingEntitlementType.FEATURED,
      status: ListingEntitlementStatus.ACTIVE,
      startsAt: new Date('2026-08-31T12:00:00.000Z'),
      endsAt: new Date('2026-09-07T11:00:00.000Z'),
    });
    const listing = {
      id: 'listing-1',
      isPremium: true,
      publicationStatus: ListingPublicationStatus.PUBLISHED,
      unpublishedAt: null,
    };
    const manager = {
      find: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([ended])
        .mockResolvedValueOnce([]),
      findOne: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(listing),
      save: jest.fn().mockResolvedValue(listing),
    };
    const service = new ListingEntitlementsService({
      transaction: (callback: (tx: EntityManager) => unknown) =>
        callback(manager as unknown as EntityManager),
    } as unknown as DataSource);

    await service.processDueEntitlements(now);

    expect(ended.status).toBe(ListingEntitlementStatus.EXPIRED);
    expect(listing.isPremium).toBe(false);
    expect(manager.save).toHaveBeenCalledWith(Listing, listing);
  });
});
