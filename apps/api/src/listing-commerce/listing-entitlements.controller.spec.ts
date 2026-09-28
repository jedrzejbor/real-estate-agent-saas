import { NotFoundException } from '@nestjs/common';
import { Listing } from '../listings/entities';
import { ListingEntitlement } from './entities';
import { ListingEntitlementsService } from './listing-entitlements.service';
import {
  ListingEntitlementSource,
  ListingEntitlementStatus,
  ListingEntitlementType,
} from './listing-commerce.types';

describe('ListingEntitlementsService owner scope', () => {
  it('returns only active and scheduled entitlements for the owner', async () => {
    const entitlement = Object.assign(new ListingEntitlement(), {
      id: 'entitlement-1',
      type: ListingEntitlementType.FEATURED,
      status: ListingEntitlementStatus.ACTIVE,
      tier: 'standard',
      sourceType: ListingEntitlementSource.ORDER_ITEM,
      startsAt: new Date('2026-09-01T00:00:00.000Z'),
      endsAt: new Date('2026-09-08T00:00:00.000Z'),
    });
    const listingRepo = { findOne: jest.fn().mockResolvedValue({ id: 'listing-1' }) };
    const entitlementRepo = { find: jest.fn().mockResolvedValue([entitlement]) };
    const service = new ListingEntitlementsService({
      getRepository: (entity: unknown) =>
        entity === Listing ? listingRepo : entitlementRepo,
    } as never);

    await expect(
      service.findOwnedForListing('owner-1', 'listing-1'),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'entitlement-1',
        type: ListingEntitlementType.FEATURED,
        status: ListingEntitlementStatus.ACTIVE,
        tier: 'standard',
      }),
    ]);
    expect(entitlementRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ listingId: 'listing-1' }) }),
    );
  });

  it('does not disclose a listing owned by another user', async () => {
    const service = new ListingEntitlementsService({
      getRepository: () => ({ findOne: jest.fn().mockResolvedValue(null) }),
    } as never);

    await expect(
      service.findOwnedForListing('intruder', 'listing-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
