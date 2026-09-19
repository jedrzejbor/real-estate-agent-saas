import { Repository } from 'typeorm';
import {
  ListingOrder,
  ListingProductCatalog,
  ListingPromotionCampaign,
  ListingPromotionCode,
  ListingPromotionRedemption,
  ListingPromotionReservation,
} from './entities';
import {
  ListingOrderStatus,
  ListingProductType,
  ListingPromotionCampaignStatus,
  ListingPromotionDiscountType,
  ListingPromotionReservationStatus,
  ListingPromotionTargetScope,
} from './listing-commerce.types';
import {
  hashPromotionCode,
  ListingPromotionsService,
} from './listing-promotions.service';

function buildProduct(
  overrides: Partial<ListingProductCatalog> = {},
): ListingProductCatalog {
  return Object.assign(new ListingProductCatalog(), {
    id: 'product-1',
    code: 'publication_60_days',
    name: 'Publikacja ogłoszenia',
    type: ListingProductType.PUBLICATION,
    priceGrossAmount: 4_900,
    currency: 'PLN',
    durationDays: 60,
    ...overrides,
  });
}

function buildCampaign(
  overrides: Partial<ListingPromotionCampaign> = {},
): ListingPromotionCampaign {
  return Object.assign(new ListingPromotionCampaign(), {
    id: 'campaign-1',
    code: 'START',
    name: 'Promocja startowa',
    status: ListingPromotionCampaignStatus.ACTIVE,
    discountType: ListingPromotionDiscountType.PERCENTAGE,
    discountValue: 2_000,
    maxDiscountGrossAmount: null,
    targetScope: ListingPromotionTargetScope.ALL_PRODUCTS,
    targetRules: {},
    isAutomatic: true,
    isCombinable: false,
    usageLimitTotal: null,
    usageLimitPerUser: null,
    usageCount: 0,
    startsAt: null,
    endsAt: null,
    archivedAt: null,
    ...overrides,
  });
}

function buildCode(
  overrides: Partial<ListingPromotionCode> = {},
): ListingPromotionCode {
  const campaign = buildCampaign({
    id: 'campaign-code',
    name: 'Kampania kodowa',
    isAutomatic: false,
  });

  return Object.assign(new ListingPromotionCode(), {
    id: 'code-1',
    campaign,
    campaignId: campaign.id,
    codeHash: hashPromotionCode('START10'),
    codeLast4: 'RT10',
    label: 'Kod promocyjny',
    status: ListingPromotionCampaignStatus.ACTIVE,
    discountType: null,
    discountValue: null,
    maxDiscountGrossAmount: null,
    isCombinable: null,
    usageLimitTotal: null,
    usageLimitPerUser: null,
    usageCount: 0,
    startsAt: null,
    endsAt: null,
    archivedAt: null,
    ...overrides,
  });
}

function buildService(options?: {
  campaigns?: ListingPromotionCampaign[];
  code?: ListingPromotionCode | null;
}) {
  const campaignRepo = {
    find: jest.fn().mockResolvedValue(options?.campaigns ?? []),
  };
  const codeRepo = {
    findOne: jest.fn().mockResolvedValue(options?.code ?? null),
  };
  const service = new ListingPromotionsService(
    campaignRepo as unknown as Repository<ListingPromotionCampaign>,
    codeRepo as unknown as Repository<ListingPromotionCode>,
  );

  return { service, campaignRepo, codeRepo };
}

function buildOrder(overrides: Partial<ListingOrder> = {}): ListingOrder {
  return Object.assign(new ListingOrder(), {
    id: 'order-1',
    listingId: 'listing-1',
    buyerUserId: 'buyer-1',
    status: ListingOrderStatus.DRAFT,
    currency: 'PLN',
    discountGrossAmount: 1_000,
    quoteExpiresAt: new Date('2026-09-10T12:30:00.000Z'),
    pricingSnapshot: {
      listingId: 'listing-1',
      currency: 'PLN',
      quotedAt: '2026-09-10T12:00:00.000Z',
      expiresAt: '2026-09-10T12:30:00.000Z',
      items: [],
      subtotalGrossAmount: 4_900,
      discountGrossAmount: 1_000,
      totalGrossAmount: 3_900,
      vatGrossAmount: null,
      discounts: [
        {
          sourceType: 'promotion_code',
          sourceReference: 'code-1',
          label: 'Kod promocyjny',
          grossAmount: 1_000,
        },
      ],
    },
    ...overrides,
  });
}

function buildManager(options?: {
  campaign?: ListingPromotionCampaign | null;
  code?: ListingPromotionCode | null;
  reservations?: ListingPromotionReservation[];
  counts?: number[];
}) {
  const counts = [...(options?.counts ?? [0, 0])];
  return {
    findOne: jest.fn(async (entity: unknown) => {
      if (entity === ListingPromotionCode) return options?.code ?? null;
      if (entity === ListingPromotionCampaign) return options?.campaign ?? null;
      return null;
    }),
    count: jest.fn().mockImplementation(() => Promise.resolve(counts.shift() ?? 0)),
    find: jest.fn().mockResolvedValue(options?.reservations ?? []),
    create: jest.fn((entity: unknown, values: object) =>
      Object.assign(
        entity === ListingPromotionRedemption
          ? new ListingPromotionRedemption()
          : new ListingPromotionReservation(),
        values,
      ),
    ),
    save: jest.fn(async (_entity: unknown, value: object) => value),
  };
}

describe('ListingPromotionsService', () => {
  it('normalizes and hashes codes without exposing plaintext in references', async () => {
    const code = buildCode();
    const { service, codeRepo } = buildService({ code });

    const discounts = await service.resolveDiscounts({
      products: [buildProduct()],
      promotionCode: ' start 10 ',
      now: new Date('2026-09-10T12:00:00.000Z'),
    });

    expect(codeRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: ['campaign'],
        where: expect.arrayContaining([
          expect.objectContaining({ codeHash: hashPromotionCode('START10') }),
        ]),
      }),
    );
    expect(discounts).toEqual([
      expect.objectContaining({
        sourceType: 'promotion_code',
        sourceReference: code.id,
        label: 'Kod promocyjny',
      }),
    ]);
    expect(JSON.stringify(discounts)).not.toContain('START10');
  });

  it('selects the better non-combinable discount between automatic campaign and code', async () => {
    const automatic = buildCampaign({
      id: 'campaign-auto',
      name: 'Automatycznie -20%',
      discountType: ListingPromotionDiscountType.PERCENTAGE,
      discountValue: 2_000,
    });
    const codeCampaign = buildCampaign({
      id: 'campaign-code',
      name: 'Kod 1000 zł',
      discountType: ListingPromotionDiscountType.FIXED_GROSS,
      discountValue: 1_000,
      isAutomatic: false,
    });
    const code = buildCode({ campaign: codeCampaign, campaignId: codeCampaign.id });
    const { service } = buildService({ campaigns: [automatic], code });

    const discounts = await service.resolveDiscounts({
      products: [buildProduct()],
      promotionCode: 'START10',
      now: new Date('2026-09-10T12:00:00.000Z'),
    });

    expect(discounts).toEqual([
      expect.objectContaining({
        sourceType: 'promotion_code',
        sourceReference: code.id,
        grossAmount: 1_000,
      }),
    ]);
  });

  it('does not reserve admin adjustment discounts as promotion usage', async () => {
    const order = buildOrder({
      pricingSnapshot: {
        ...buildOrder().pricingSnapshot,
        discounts: [
          {
            sourceType: 'admin_adjustment',
            sourceReference: 'adjustment-1',
            label: 'Ręczna korekta ceny',
            grossAmount: 1_000,
          },
        ],
      },
    });
    const { service } = buildService();
    const manager = buildManager();

    await expect(
      service.reserveDiscountsForOrder(manager as never, order),
    ).resolves.toEqual([]);
    expect(manager.findOne).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('targets discounts to configured product types', async () => {
    const campaign = buildCampaign({
      targetScope: ListingPromotionTargetScope.PRODUCT_TYPES,
      targetRules: { productTypes: [ListingProductType.FEATURED] },
      discountType: ListingPromotionDiscountType.PERCENTAGE,
      discountValue: 5_000,
    });
    const publication = buildProduct();
    const featured = buildProduct({
      id: 'product-featured',
      code: 'featured_7_days',
      type: ListingProductType.FEATURED,
      priceGrossAmount: 1_900,
      durationDays: 7,
    });
    const { service } = buildService({ campaigns: [campaign] });

    await expect(
      service.resolveDiscounts({
        products: [publication, featured],
        now: new Date('2026-09-10T12:00:00.000Z'),
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        grossAmount: 950,
        productCodes: ['featured_7_days'],
      }),
    ]);
  });

  it('ignores campaigns and codes whose total usage limit is exhausted', async () => {
    const campaign = buildCampaign({ usageLimitTotal: 1, usageCount: 1 });
    const code = buildCode({ usageLimitTotal: 1, usageCount: 1 });
    const { service } = buildService({ campaigns: [campaign], code });

    await expect(
      service.resolveDiscounts({
        products: [buildProduct()],
        promotionCode: 'START10',
        now: new Date('2026-09-10T12:00:00.000Z'),
      }),
    ).resolves.toEqual([]);
  });

  it('treats promotion end time as exclusive for code campaigns', async () => {
    const now = new Date('2026-09-10T12:00:00.000Z');
    const codeCampaign = buildCampaign({
      id: 'campaign-code',
      isAutomatic: false,
      startsAt: new Date('2026-09-10T10:00:00.000Z'),
      endsAt: now,
    });
    const code = buildCode({
      campaign: codeCampaign,
      campaignId: codeCampaign.id,
    });
    const { service } = buildService({ code });

    await expect(
      service.resolveDiscounts({
        products: [buildProduct()],
        promotionCode: 'START10',
        now,
      }),
    ).resolves.toEqual([]);
  });

  it('ignores code campaigns that start in the future', async () => {
    const now = new Date('2026-09-10T12:00:00.000Z');
    const codeCampaign = buildCampaign({
      id: 'campaign-code',
      isAutomatic: false,
      startsAt: new Date('2026-09-10T12:00:01.000Z'),
      endsAt: new Date('2026-09-10T13:00:00.000Z'),
    });
    const code = buildCode({
      campaign: codeCampaign,
      campaignId: codeCampaign.id,
    });
    const { service } = buildService({ code });

    await expect(
      service.resolveDiscounts({
        products: [buildProduct()],
        promotionCode: 'START10',
        now,
      }),
    ).resolves.toEqual([]);
  });

  it('reserves a promotion discount under locked campaign and code counters', async () => {
    const campaign = buildCampaign({
      id: 'campaign-code',
      isAutomatic: false,
      usageLimitTotal: 10,
      usageLimitPerUser: 2,
      usageCount: 0,
    });
    const code = buildCode({
      id: 'code-1',
      campaign,
      campaignId: campaign.id,
      usageLimitTotal: 5,
      usageLimitPerUser: 1,
      usageCount: 0,
    });
    const manager = buildManager({ campaign, code, counts: [0, 0] });
    const { service } = buildService();
    const now = new Date('2026-09-10T12:00:00.000Z');

    await expect(
      service.reserveDiscountsForOrder(
        manager as never,
        buildOrder(),
        now,
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        campaignId: campaign.id,
        codeId: code.id,
        orderId: 'order-1',
        buyerUserId: 'buyer-1',
        status: ListingPromotionReservationStatus.RESERVED,
        discountGrossAmount: 1_000,
        reservedAt: now,
      }),
    ]);
    expect(manager.findOne).toHaveBeenCalledWith(
      ListingPromotionCode,
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
    expect(manager.findOne).toHaveBeenCalledWith(
      ListingPromotionCampaign,
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
    expect(campaign.usageCount).toBe(1);
    expect(code.usageCount).toBe(1);
  });

  it('blocks reservation when a locked usage limit is already exhausted', async () => {
    const campaign = buildCampaign({
      id: 'campaign-code',
      isAutomatic: false,
      usageLimitTotal: 1,
      usageCount: 1,
    });
    const code = buildCode({ id: 'code-1', campaign, campaignId: campaign.id });
    const manager = buildManager({ campaign, code });
    const { service } = buildService();

    await expect(
      service.reserveDiscountsForOrder(manager as never, buildOrder()),
    ).rejects.toThrow('Limit użyć promocji został wyczerpany');
  });

  it('does not allow a second reservation to consume the final total limit', async () => {
    const campaign = buildCampaign({
      id: 'campaign-code',
      isAutomatic: false,
      usageLimitTotal: 1,
      usageCount: 0,
    });
    const code = buildCode({
      id: 'code-1',
      campaign,
      campaignId: campaign.id,
      usageLimitTotal: 1,
      usageCount: 0,
    });
    const manager = buildManager({ campaign, code });
    const { service } = buildService();

    await expect(
      service.reserveDiscountsForOrder(
        manager as never,
        buildOrder({ id: 'order-first' }),
      ),
    ).resolves.toHaveLength(1);
    await expect(
      service.reserveDiscountsForOrder(
        manager as never,
        buildOrder({ id: 'order-second' }),
      ),
    ).rejects.toThrow('Limit użyć promocji został wyczerpany');
    expect(campaign.usageCount).toBe(1);
    expect(code.usageCount).toBe(1);
  });

  it('applies reserved discounts as durable redemptions idempotently by reservation', async () => {
    const reservation = Object.assign(new ListingPromotionReservation(), {
      id: 'reservation-1',
      campaignId: 'campaign-1',
      codeId: 'code-1',
      orderId: 'order-1',
      buyerUserId: 'buyer-1',
      status: ListingPromotionReservationStatus.RESERVED,
      currency: 'PLN',
      discountGrossAmount: 1_000,
      pricingSnapshot: { label: 'Kod promocyjny' },
      appliedAt: null,
    });
    const manager = buildManager({ reservations: [reservation] });
    const { service } = buildService();
    const appliedAt = new Date('2026-09-10T12:05:00.000Z');

    await service.applyReservedDiscountsForPaidOrder(
      manager as never,
      buildOrder({ status: ListingOrderStatus.PAID }),
      appliedAt,
    );

    expect(reservation.status).toBe(ListingPromotionReservationStatus.APPLIED);
    expect(reservation.appliedAt).toBe(appliedAt);
    expect(manager.save).toHaveBeenCalledWith(
      ListingPromotionRedemption,
      [
        expect.objectContaining({
          reservationId: reservation.id,
          orderId: 'order-1',
          discountGrossAmount: 1_000,
        }),
      ],
    );
  });

  it('releases reserved discounts and decrements counters for expired orders', async () => {
    const campaign = buildCampaign({ id: 'campaign-1', usageCount: 1 });
    const code = buildCode({
      id: 'code-1',
      campaign,
      campaignId: campaign.id,
      usageCount: 1,
    });
    const reservation = Object.assign(new ListingPromotionReservation(), {
      id: 'reservation-1',
      campaignId: campaign.id,
      codeId: code.id,
      orderId: 'order-1',
      status: ListingPromotionReservationStatus.RESERVED,
      releasedAt: null,
    });
    const manager = buildManager({ campaign, code, reservations: [reservation] });
    const { service } = buildService();
    const releasedAt = new Date('2026-09-10T12:31:00.000Z');

    await expect(
      service.releaseReservationsForOrders(
        manager as never,
        [buildOrder()],
        releasedAt,
      ),
    ).resolves.toBe(1);

    expect(campaign.usageCount).toBe(0);
    expect(code.usageCount).toBe(0);
    expect(reservation.status).toBe(ListingPromotionReservationStatus.RELEASED);
    expect(reservation.releasedAt).toBe(releasedAt);
  });
});
