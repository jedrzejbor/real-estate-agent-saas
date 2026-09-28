import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Listing } from '../listings/entities';
import {
  ListingManualAdjustment,
  ListingProductCatalog,
} from './entities';
import {
  ListingProductType,
  ListingPromotionDiscountType,
  ListingPromotionTargetScope,
} from './listing-commerce.types';
import { ListingManualAdjustmentsService } from './listing-manual-adjustments.service';

function buildProduct(
  overrides: Partial<ListingProductCatalog> = {},
): ListingProductCatalog {
  return Object.assign(new ListingProductCatalog(), {
    id: 'product-1',
    code: 'publication_60_days',
    type: ListingProductType.PUBLICATION,
    priceGrossAmount: 4_900,
    ...overrides,
  });
}

function buildAdjustment(
  overrides: Partial<ListingManualAdjustment> = {},
): ListingManualAdjustment {
  return Object.assign(new ListingManualAdjustment(), {
    id: 'adjustment-1',
    listingId: 'listing-1',
    label: 'Ręczna korekta ceny',
    reason: 'Rekompensata po kontakcie z supportem',
    discountType: ListingPromotionDiscountType.FIXED_GROSS,
    discountValue: 1_000,
    maxDiscountGrossAmount: null,
    targetScope: ListingPromotionTargetScope.ALL_PRODUCTS,
    targetRules: {},
    startsAt: new Date('2026-09-12T10:00:00.000Z'),
    endsAt: new Date('2026-09-20T10:00:00.000Z'),
    archivedAt: null,
    createdByUserId: 'admin-1',
    archivedByUserId: null,
    archivedReason: null,
    ...overrides,
  });
}

function buildService(options?: {
  listing?: Listing | null;
  adjustments?: ListingManualAdjustment[];
}) {
  const listingRepo = {
    findOne: jest.fn().mockResolvedValue(
      options && 'listing' in options ? options.listing : { id: 'listing-1' },
    ),
  };
  const adjustmentRepo = {
    create: jest.fn((_value: object) =>
      Object.assign(new ListingManualAdjustment(), _value),
    ),
    save: jest.fn(async (value: ListingManualAdjustment) =>
      Object.assign(value, { id: value.id ?? 'adjustment-created' }),
    ),
    findOne: jest.fn().mockResolvedValue(options?.adjustments?.[0] ?? null),
    find: jest.fn().mockResolvedValue(options?.adjustments ?? []),
  };
  const service = new ListingManualAdjustmentsService(
    listingRepo as unknown as Repository<Listing>,
    adjustmentRepo as unknown as Repository<ListingManualAdjustment>,
  );
  return { service, listingRepo, adjustmentRepo };
}

describe('ListingManualAdjustmentsService', () => {
  it('creates a listing-scoped adjustment with audit metadata', async () => {
    const now = new Date('2026-09-12T10:00:00.000Z');
    const { service, adjustmentRepo } = buildService();

    await service.createAdjustment({
      listingId: 'listing-1',
      actorUserId: 'admin-1',
      label: 'Ręczna korekta ceny',
      reason: 'Rekompensata po kontakcie z supportem',
      discountType: ListingPromotionDiscountType.FIXED_GROSS,
      discountValue: 1_000,
      endsAt: new Date('2026-09-20T10:00:00.000Z'),
      now,
    });

    expect(adjustmentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        listingId: 'listing-1',
        label: 'Ręczna korekta ceny',
        reason: 'Rekompensata po kontakcie z supportem',
        discountValue: 1_000,
        startsAt: now,
        createdByUserId: 'admin-1',
        archivedAt: null,
      }),
    );
  });

  it('rejects creating an adjustment for a missing listing', async () => {
    const { service, adjustmentRepo } = buildService({ listing: null });

    await expect(
      service.createAdjustment({
        listingId: 'missing',
        actorUserId: 'admin-1',
        label: 'Korekta',
        reason: 'Rekompensata',
        discountType: ListingPromotionDiscountType.FIXED_GROSS,
        discountValue: 1_000,
        endsAt: new Date('2026-09-20T10:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(adjustmentRepo.save).not.toHaveBeenCalled();
  });

  it('rejects invalid adjustment periods and audit reasons', async () => {
    const now = new Date('2026-09-12T10:00:00.000Z');
    const { service } = buildService();

    await expect(
      service.createAdjustment({
        listingId: 'listing-1',
        actorUserId: 'admin-1',
        label: 'Korekta',
        reason: 'x',
        discountType: ListingPromotionDiscountType.FIXED_GROSS,
        discountValue: 1_000,
        startsAt: now,
        endsAt: new Date('2026-09-11T10:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resolves active listing adjustments as admin adjustment quote discounts', async () => {
    const adjustment = buildAdjustment();
    const { service } = buildService({ adjustments: [adjustment] });

    const discounts = await service.resolveDiscounts({
      listingId: 'listing-1',
      products: [buildProduct()],
      now: new Date('2026-09-12T12:00:00.000Z'),
    });

    expect(discounts).toEqual([
      {
        sourceType: 'admin_adjustment',
        sourceReference: 'adjustment-1',
        label: 'Ręczna korekta ceny',
        grossAmount: 1_000,
        productCodes: ['publication_60_days'],
      },
    ]);
  });

  it('archives an adjustment with audit metadata', async () => {
    const adjustment = buildAdjustment();
    const now = new Date('2026-09-13T10:00:00.000Z');
    const { service, adjustmentRepo } = buildService({
      adjustments: [adjustment],
    });

    await service.archiveAdjustment({
      listingId: 'listing-1',
      adjustmentId: adjustment.id,
      actorUserId: 'admin-2',
      reason: 'Korekta nie jest już potrzebna',
      now,
    });

    expect(adjustment).toMatchObject({
      archivedAt: now,
      archivedByUserId: 'admin-2',
      archivedReason: 'Korekta nie jest już potrzebna',
    });
    expect(adjustmentRepo.save).toHaveBeenCalledWith(adjustment);
  });
});
