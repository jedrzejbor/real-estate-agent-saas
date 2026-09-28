import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AgencyPlan } from '../common/enums';
import { PlanCatalog } from '../plans';
import {
  AgencyPlanBillingInterval,
  AgencyPlanPromotionApplicationTiming,
} from './agency-plan-commerce.types';
import { AgencyPlanQuotesService } from './agency-plan-quotes.service';
import { AgencyPlanQuote } from './entities';

function buildPlan(overrides: Partial<PlanCatalog> = {}): PlanCatalog {
  return {
    code: AgencyPlan.PROFESSIONAL,
    label: 'Professional',
    description: 'Plan dla biura',
    priceMonthlyPln: 24_900,
    priceYearlyPln: 249_000,
    stripePriceIdMonthly: 'price_monthly',
    stripePriceIdYearly: 'price_yearly',
    limits: {},
    features: {},
    isPublic: true,
    sortOrder: 20,
    createdAt: new Date('2026-09-16T08:00:00.000Z'),
    updatedAt: new Date('2026-09-16T08:00:00.000Z'),
    ...overrides,
  } as PlanCatalog;
}

function buildService(plans: PlanCatalog[] = [buildPlan()]) {
  const quotes: AgencyPlanQuote[] = [];
  const planRepo = {
    findOne: jest.fn(async ({ where }) =>
      plans.find(
        (plan) => plan.code === where.code && plan.isPublic === where.isPublic,
      ) ?? null,
    ),
  };
  const quoteRepo = {
    create: jest.fn((value) => ({
      createdAt: new Date('2026-09-16T10:00:00.000Z'),
      updatedAt: new Date('2026-09-16T10:00:00.000Z'),
      ...value,
    })),
    save: jest.fn(async (quote) => {
      quotes.push(quote as AgencyPlanQuote);
      return quote;
    }),
  };

  return {
    service: new AgencyPlanQuotesService(planRepo as never, quoteRepo as never),
    planRepo,
    quoteRepo,
    quotes,
  };
}

describe('AgencyPlanQuotesService', () => {
  const now = new Date('2026-09-16T10:15:00.000Z');

  it('creates an immutable monthly plan quote snapshot from server catalog', async () => {
    const { service, quotes } = buildService();

    const quote = await service.createQuote({
      planCode: AgencyPlan.PROFESSIONAL,
      billingInterval: AgencyPlanBillingInterval.MONTHLY,
      userId: 'user-1',
      agencyId: 'agency-1',
      now,
    });

    expect(quote).toMatchObject({
      planCode: AgencyPlan.PROFESSIONAL,
      planLabel: 'Professional',
      billingInterval: AgencyPlanBillingInterval.MONTHLY,
      currency: 'PLN',
      quotedAt: '2026-09-16T10:15:00.000Z',
      expiresAt: '2026-09-16T11:15:00.000Z',
      subtotalGrossAmount: 24_900,
      discountGrossAmount: 0,
      totalGrossAmount: 24_900,
      discounts: [],
    });
    expect(quote.quoteId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(quotes).toHaveLength(1);
    expect(quotes[0]).toMatchObject({
      id: quote.quoteId,
      userId: 'user-1',
      agencyId: 'agency-1',
      subtotalGrossAmount: 24_900,
      totalGrossAmount: 24_900,
      pricingSnapshot: quote,
    });
  });

  it('uses yearly catalog price for yearly quote', async () => {
    const { service } = buildService();

    const quote = await service.createQuote({
      planCode: AgencyPlan.PROFESSIONAL,
      billingInterval: AgencyPlanBillingInterval.YEARLY,
      now,
    });

    expect(quote.subtotalGrossAmount).toBe(249_000);
    expect(quote.totalGrossAmount).toBe(249_000);
  });

  it('caps discounts at subtotal and keeps billing cycle metadata', async () => {
    const { service } = buildService();

    const quote = await service.createQuote({
      planCode: AgencyPlan.PROFESSIONAL,
      billingInterval: AgencyPlanBillingInterval.MONTHLY,
      now,
      discounts: [
        {
          sourceType: 'campaign',
          sourceReference: 'campaign-1',
          label: 'Pierwsze 3 miesiące taniej',
          grossAmount: 30_000,
          durationBillingCycles: 3,
          applicationTiming: AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
        },
      ],
    });

    expect(quote.discountGrossAmount).toBe(24_900);
    expect(quote.totalGrossAmount).toBe(0);
    expect(quote.discounts).toEqual([
      {
        sourceType: 'campaign',
        sourceReference: 'campaign-1',
        label: 'Pierwsze 3 miesiące taniej',
        grossAmount: 30_000,
        durationBillingCycles: 3,
        applicationTiming: AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
      },
    ]);
  });

  it('rejects hidden plans and custom contact plans', async () => {
    await expect(
      buildService([buildPlan({ isPublic: false })]).service.createQuote({
        planCode: AgencyPlan.PROFESSIONAL,
        billingInterval: AgencyPlanBillingInterval.MONTHLY,
        now,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      buildService().service.createQuote({
        planCode: AgencyPlan.CUSTOM,
        billingInterval: AgencyPlanBillingInterval.MONTHLY,
        now,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid discount cycle configuration', async () => {
    await expect(
      buildService().service.createQuote({
        planCode: AgencyPlan.PROFESSIONAL,
        billingInterval: AgencyPlanBillingInterval.MONTHLY,
        now,
        discounts: [
          {
            sourceType: 'customer_benefit',
            sourceReference: 'benefit-1',
            label: 'Benefit',
            grossAmount: 1_000,
            durationBillingCycles: 0,
            applicationTiming: AgencyPlanPromotionApplicationTiming.NEXT_INVOICE,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
