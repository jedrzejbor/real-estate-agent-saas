import { AgencyPlan } from '../common/enums';
import { PlanCatalog } from '../plans/entities';
import {
  AgencyPlanBillingInterval,
  AgencyPlanPromotionApplicationTiming,
  AgencyPlanPromotionDiscountType,
  AgencyPlanPromotionReservationStatus,
  AgencyPlanPromotionStatus,
  AgencyPlanPromotionTargetScope,
  AgencyPlanQuoteStatus,
} from './agency-plan-commerce.types';
import {
  AgencyPlanPromotionsService,
  hashAgencyPlanPromotionCode,
} from './agency-plan-promotions.service';
import {
  AgencyPlanPromotionCampaign,
  AgencyPlanPromotionCode,
  AgencyPlanPromotionRedemption,
  AgencyPlanPromotionReservation,
  AgencyPlanQuote,
} from './entities';

function buildPlan(overrides: Partial<PlanCatalog> = {}): PlanCatalog {
  return {
    code: AgencyPlan.PROFESSIONAL,
    label: 'Professional',
    description: null,
    priceMonthlyPln: 19_900,
    priceYearlyPln: 199_000,
    limits: {},
    features: {},
    isPublic: true,
    sortOrder: 1,
    createdAt: new Date('2026-09-16T08:00:00.000Z'),
    updatedAt: new Date('2026-09-16T08:00:00.000Z'),
    ...overrides,
  } as PlanCatalog;
}

function buildCampaign(
  overrides: Partial<AgencyPlanPromotionCampaign> = {},
): AgencyPlanPromotionCampaign {
  return {
    id: 'campaign-1',
    code: 'agent_start',
    name: 'Start dla agentów',
    description: null,
    status: AgencyPlanPromotionStatus.ACTIVE,
    discountType: AgencyPlanPromotionDiscountType.PERCENTAGE,
    discountValue: 5_000,
    maxDiscountGrossAmount: null,
    targetScope: AgencyPlanPromotionTargetScope.ALL_PLANS,
    targetRules: {},
    durationBillingCycles: 3,
    applicationTiming: AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
    isAutomatic: true,
    isCombinable: false,
    usageLimitTotal: null,
    usageLimitPerAccount: null,
    usageCount: 0,
    startsAt: null,
    endsAt: null,
    archivedAt: null,
    createdAt: new Date('2026-09-16T09:00:00.000Z'),
    updatedAt: new Date('2026-09-16T09:00:00.000Z'),
    ...overrides,
  } as AgencyPlanPromotionCampaign;
}

function buildCode(
  campaign: AgencyPlanPromotionCampaign,
  overrides: Partial<AgencyPlanPromotionCode> = {},
): AgencyPlanPromotionCode {
  return {
    id: 'code-1',
    campaign,
    campaignId: campaign.id,
    codeHash: hashAgencyPlanPromotionCode('AGENT50')!,
    codeLast4: 'NT50',
    label: 'Kod AGENT50',
    status: AgencyPlanPromotionStatus.ACTIVE,
    discountType: null,
    discountValue: null,
    maxDiscountGrossAmount: null,
    durationBillingCycles: null,
    applicationTiming: null,
    isCombinable: null,
    usageLimitTotal: null,
    usageLimitPerAccount: null,
    usageCount: 0,
    startsAt: null,
    endsAt: null,
    archivedAt: null,
    createdAt: new Date('2026-09-16T09:05:00.000Z'),
    updatedAt: new Date('2026-09-16T09:05:00.000Z'),
    ...overrides,
  } as AgencyPlanPromotionCode;
}

function buildQuote(overrides: Partial<AgencyPlanQuote> = {}): AgencyPlanQuote {
  const quotedAt = new Date('2026-09-16T10:00:00.000Z');
  const expiresAt = new Date('2026-09-16T10:15:00.000Z');
  return {
    id: 'quote-1',
    userId: 'user-1',
    agencyId: 'agency-1',
    planCode: AgencyPlan.PROFESSIONAL,
    billingInterval: AgencyPlanBillingInterval.MONTHLY,
    status: AgencyPlanQuoteStatus.QUOTED,
    currency: 'PLN',
    subtotalGrossAmount: 19_900,
    discountGrossAmount: 9_950,
    totalGrossAmount: 9_950,
    pricingSnapshot: {
      quoteId: 'quote-1',
      planCode: AgencyPlan.PROFESSIONAL,
      planLabel: 'Professional',
      billingInterval: AgencyPlanBillingInterval.MONTHLY,
      currency: 'PLN',
      quotedAt: quotedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      subtotalGrossAmount: 19_900,
      discountGrossAmount: 9_950,
      totalGrossAmount: 9_950,
      discounts: [
        {
          sourceType: 'campaign',
          sourceReference: 'campaign-1',
          label: 'Start dla agentów',
          grossAmount: 9_950,
          durationBillingCycles: 3,
          applicationTiming:
            AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
        },
      ],
    },
    quotedAt,
    expiresAt,
    metadata: {},
    createdAt: quotedAt,
    updatedAt: quotedAt,
    ...overrides,
  } as AgencyPlanQuote;
}

function buildReservation(
  quote: AgencyPlanQuote,
  overrides: Partial<AgencyPlanPromotionReservation> = {},
): AgencyPlanPromotionReservation {
  return {
    id: 'reservation-1',
    quoteId: quote.id,
    campaignId: 'campaign-1',
    codeId: null,
    agencyId: quote.agencyId ?? null,
    status: AgencyPlanPromotionReservationStatus.RESERVED,
    discountGrossAmount: 9_950,
    durationBillingCycles: 3,
    applicationTiming: AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
    reservedAt: new Date('2026-09-16T10:01:00.000Z'),
    expiresAt: quote.expiresAt,
    appliedAt: null,
    releasedAt: null,
    metadata: {},
    createdAt: new Date('2026-09-16T10:01:00.000Z'),
    updatedAt: new Date('2026-09-16T10:01:00.000Z'),
    ...overrides,
  } as AgencyPlanPromotionReservation;
}

function buildManager(options: {
  campaign?: AgencyPlanPromotionCampaign | null;
  code?: AgencyPlanPromotionCode | null;
  existingReservations?: AgencyPlanPromotionReservation[];
  reservedReservations?: AgencyPlanPromotionReservation[];
  reservationCount?: number;
  redemptionCount?: number;
} = {}) {
  const saved: unknown[] = [];
  const createdReservations: AgencyPlanPromotionReservation[] = [];
  const createdRedemptions: AgencyPlanPromotionRedemption[] = [];
  const manager = {
    findOne: jest.fn(async (entity, query) => {
      if (entity === AgencyPlanPromotionCampaign) {
        if (query.where.id === options.campaign?.id) return options.campaign;
        return null;
      }
      if (entity === AgencyPlanPromotionCode) {
        if (query.where.id === options.code?.id) return options.code;
        return null;
      }
      return null;
    }),
    find: jest.fn(async (entity, query) => {
      if (entity !== AgencyPlanPromotionReservation) return [];
      const status = query.where.status;
      if (status && typeof status === 'object') {
        return options.existingReservations ?? [];
      }
      return options.reservedReservations ?? [];
    }),
    count: jest.fn(async (entity) => {
      if (entity === AgencyPlanPromotionReservation) {
        return options.reservationCount ?? 0;
      }
      if (entity === AgencyPlanPromotionRedemption) {
        return options.redemptionCount ?? 0;
      }
      return 0;
    }),
    create: jest.fn((entity, value) => {
      if (entity === AgencyPlanPromotionReservation) {
        const reservation = {
          id: `reservation-${createdReservations.length + 1}`,
          createdAt: new Date('2026-09-16T10:02:00.000Z'),
          updatedAt: new Date('2026-09-16T10:02:00.000Z'),
          ...value,
        } as AgencyPlanPromotionReservation;
        createdReservations.push(reservation);
        return reservation;
      }
      if (entity === AgencyPlanPromotionRedemption) {
        const redemption = {
          id: `redemption-${createdRedemptions.length + 1}`,
          createdAt: new Date('2026-09-16T10:03:00.000Z'),
          ...value,
        } as AgencyPlanPromotionRedemption;
        createdRedemptions.push(redemption);
        return redemption;
      }
      return value;
    }),
    save: jest.fn(async (_entity, value) => {
      saved.push(value);
      return value;
    }),
  };

  return { manager, saved, createdReservations, createdRedemptions };
}

function buildService(
  campaigns: AgencyPlanPromotionCampaign[],
  code: AgencyPlanPromotionCode | null = null,
) {
  const campaignRepo = {
    find: jest.fn().mockResolvedValue(campaigns),
  };
  const codeRepo = {
    findOne: jest.fn().mockResolvedValue(code),
  };

  return {
    service: new AgencyPlanPromotionsService(
      campaignRepo as never,
      codeRepo as never,
    ),
    campaignRepo,
    codeRepo,
  };
}

describe('AgencyPlanPromotionsService', () => {
  const now = new Date('2026-09-16T10:00:00.000Z');

  it('returns the best automatic promotion preview for a plan interval', async () => {
    const { service } = buildService([
      buildCampaign({
        id: 'campaign-1',
        name: '10% mniej',
        discountValue: 1_000,
      }),
      buildCampaign({
        id: 'campaign-2',
        name: '50% przez 3 miesiące',
        discountValue: 5_000,
        durationBillingCycles: 3,
        createdAt: new Date('2026-09-16T09:01:00.000Z'),
      }),
    ]);

    const preview = await service.resolveAutomaticPreview({
      plan: buildPlan(),
      billingInterval: AgencyPlanBillingInterval.MONTHLY,
      now,
    });

    expect(preview).toEqual({
      label: '50% przez 3 miesiące',
      discountGrossAmount: 9_950,
      priceGrossAmount: 9_950,
      durationBillingCycles: 3,
      campaignId: 'campaign-2',
    });
  });

  it('honors plan and billing interval target rules', async () => {
    const { service } = buildService([
      buildCampaign({
        targetScope: AgencyPlanPromotionTargetScope.PLAN_CODES,
        targetRules: {
          planCodes: [AgencyPlan.STARTER],
          billingIntervals: [AgencyPlanBillingInterval.MONTHLY],
        },
      }),
      buildCampaign({
        id: 'campaign-2',
        targetScope: AgencyPlanPromotionTargetScope.BILLING_INTERVALS,
        targetRules: {
          billingIntervals: [AgencyPlanBillingInterval.YEARLY],
        },
      }),
    ]);

    await expect(
      service.resolveAutomaticPreview({
        plan: buildPlan({ code: AgencyPlan.PROFESSIONAL }),
        billingInterval: AgencyPlanBillingInterval.MONTHLY,
        now,
      }),
    ).resolves.toBeNull();

    await expect(
      service.resolveAutomaticPreview({
        plan: buildPlan({ code: AgencyPlan.PROFESSIONAL }),
        billingInterval: AgencyPlanBillingInterval.YEARLY,
        now,
      }),
    ).resolves.toMatchObject({ campaignId: 'campaign-2' });
  });

  it('ignores free plans, non-initial benefits and invalid cycle campaigns', async () => {
    const { service } = buildService([
      buildCampaign({
        applicationTiming: AgencyPlanPromotionApplicationTiming.NEXT_INVOICE,
      }),
      buildCampaign({
        id: 'campaign-2',
        durationBillingCycles: 0,
      }),
    ]);

    await expect(
      service.resolveAutomaticPreview({
        plan: buildPlan({ priceMonthlyPln: 0 }),
        billingInterval: AgencyPlanBillingInterval.MONTHLY,
        now,
      }),
    ).resolves.toBeNull();

    await expect(
      service.resolveAutomaticPreview({
        plan: buildPlan(),
        billingInterval: AgencyPlanBillingInterval.MONTHLY,
        now,
      }),
    ).resolves.toBeNull();
  });

  it('applies fixed gross discounts with max subtotal cap', async () => {
    const { service } = buildService([
      buildCampaign({
        discountType: AgencyPlanPromotionDiscountType.FIXED_GROSS,
        discountValue: 99_999,
      }),
    ]);

    const preview = await service.resolveAutomaticPreview({
      plan: buildPlan(),
      billingInterval: AgencyPlanBillingInterval.MONTHLY,
      now,
    });

    expect(preview).toMatchObject({
      discountGrossAmount: 19_900,
      priceGrossAmount: 0,
    });
  });

  it('resolves automatic campaign discounts for an initial checkout quote', async () => {
    const { service } = buildService([
      buildCampaign({
        id: 'campaign-1',
        name: 'Start 50%',
        discountValue: 5_000,
        durationBillingCycles: 3,
      }),
    ]);

    const discounts = await service.resolveQuoteDiscounts({
      plan: buildPlan(),
      billingInterval: AgencyPlanBillingInterval.MONTHLY,
      now,
    });

    expect(discounts).toEqual([
      {
        sourceType: 'campaign',
        sourceReference: 'campaign-1',
        label: 'Start 50%',
        grossAmount: 9_950,
        durationBillingCycles: 3,
        applicationTiming: AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
      },
    ]);
  });

  it('resolves a promotion code and prefers the best non-combinable discount', async () => {
    const campaign = buildCampaign({
      id: 'campaign-code',
      isAutomatic: false,
      discountValue: 1_000,
    });
    const code = buildCode(campaign, {
      discountType: AgencyPlanPromotionDiscountType.PERCENTAGE,
      discountValue: 5_000,
      durationBillingCycles: 1,
    });
    const { service } = buildService(
      [
        buildCampaign({
          id: 'campaign-auto',
          name: 'Automatyczne 10%',
          discountValue: 1_000,
        }),
      ],
      code,
    );

    const discounts = await service.resolveQuoteDiscounts({
      plan: buildPlan(),
      billingInterval: AgencyPlanBillingInterval.MONTHLY,
      promotionCode: ' agent50 ',
      now,
    });

    expect(discounts).toEqual([
      {
        sourceType: 'promotion_code',
        sourceReference: 'code-1',
        label: 'Kod AGENT50',
        grossAmount: 9_950,
        durationBillingCycles: 1,
        applicationTiming: AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
      },
    ]);
  });

  it('does not apply next-invoice codes to an initial checkout quote', async () => {
    const campaign = buildCampaign({
      id: 'campaign-code',
      applicationTiming: AgencyPlanPromotionApplicationTiming.NEXT_INVOICE,
    });
    const { service } = buildService([], buildCode(campaign));

    await expect(
      service.resolveQuoteDiscounts({
        plan: buildPlan(),
        billingInterval: AgencyPlanBillingInterval.MONTHLY,
        promotionCode: 'AGENT50',
        now,
      }),
    ).resolves.toEqual([]);
  });

  it('reserves quote discounts and increments campaign usage once', async () => {
    const campaign = buildCampaign({ usageCount: 0 });
    const quote = buildQuote();
    const { service } = buildService([]);
    const { manager, createdReservations } = buildManager({ campaign });
    const now = new Date('2026-09-16T10:01:00.000Z');

    const reservations = await service.reserveDiscountsForQuote(
      manager as never,
      quote,
      now,
    );

    expect(campaign.usageCount).toBe(1);
    expect(quote.status).toBe(AgencyPlanQuoteStatus.RESERVED);
    expect(reservations).toHaveLength(1);
    expect(createdReservations[0]).toMatchObject({
      quoteId: 'quote-1',
      campaignId: 'campaign-1',
      agencyId: 'agency-1',
      status: AgencyPlanPromotionReservationStatus.RESERVED,
      discountGrossAmount: 9_950,
      durationBillingCycles: 3,
      applicationTiming: AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
      reservedAt: now,
      expiresAt: quote.expiresAt,
    });
  });

  it('keeps reservation creation idempotent for the same quote', async () => {
    const quote = buildQuote();
    const existingReservation = buildReservation(quote);
    const { service } = buildService([]);
    const { manager } = buildManager({
      existingReservations: [existingReservation],
    });

    const reservations = await service.reserveDiscountsForQuote(
      manager as never,
      quote,
    );

    expect(reservations).toEqual([existingReservation]);
    expect(manager.create).not.toHaveBeenCalled();
  });

  it('applies reserved discounts as durable redemptions', async () => {
    const quote = buildQuote({ status: AgencyPlanQuoteStatus.RESERVED });
    const reservation = buildReservation(quote);
    const { service } = buildService([]);
    const { manager, createdRedemptions } = buildManager({
      reservedReservations: [reservation],
    });
    const appliedAt = new Date('2026-09-16T10:05:00.000Z');

    const redemptions = await service.applyReservedDiscountsForQuote(
      manager as never,
      quote,
      appliedAt,
      'billing-event-1',
    );

    expect(redemptions).toHaveLength(1);
    expect(reservation.status).toBe(AgencyPlanPromotionReservationStatus.APPLIED);
    expect(reservation.appliedAt).toBe(appliedAt);
    expect(quote.status).toBe(AgencyPlanQuoteStatus.APPLIED);
    expect(createdRedemptions[0]).toMatchObject({
      agencyId: 'agency-1',
      quoteId: 'quote-1',
      campaignId: 'campaign-1',
      reservationId: 'reservation-1',
      planCode: AgencyPlan.PROFESSIONAL,
      billingInterval: AgencyPlanBillingInterval.MONTHLY,
      subtotalGrossAmount: 19_900,
      discountGrossAmount: 9_950,
      totalGrossAmount: 9_950,
      billingEventId: 'billing-event-1',
    });
  });

  it('releases reservations and decrements usage counters', async () => {
    const campaign = buildCampaign({ usageCount: 1 });
    const quote = buildQuote({ status: AgencyPlanQuoteStatus.RESERVED });
    const reservation = buildReservation(quote);
    const { service } = buildService([]);
    const { manager } = buildManager({
      campaign,
      reservedReservations: [reservation],
    });
    const releasedAt = new Date('2026-09-16T10:10:00.000Z');

    const releasedCount = await service.releaseReservationsForQuotes(
      manager as never,
      [quote],
      releasedAt,
    );

    expect(releasedCount).toBe(1);
    expect(campaign.usageCount).toBe(0);
    expect(reservation.status).toBe(AgencyPlanPromotionReservationStatus.RELEASED);
    expect(reservation.releasedAt).toBe(releasedAt);
    expect(quote.status).toBe(AgencyPlanQuoteStatus.CANCELLED);
  });
});
