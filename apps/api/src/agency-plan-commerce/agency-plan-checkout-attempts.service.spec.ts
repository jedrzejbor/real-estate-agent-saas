import { ConflictException, NotFoundException } from '@nestjs/common';
import { AgencyPlan } from '../common/enums';
import { PlanCatalog } from '../plans/entities';
import { AgencyPlanCheckoutAttemptsService } from './agency-plan-checkout-attempts.service';
import {
  AgencyPlanBillingInterval,
  AgencyPlanCheckoutAttemptStatus,
  AgencyPlanPromotionApplicationTiming,
  AgencyPlanQuoteStatus,
} from './agency-plan-commerce.types';
import { AgencyPlanCheckoutAttempt, AgencyPlanQuote } from './entities';

const NOW = new Date('2026-09-17T10:00:00.000Z');
const EXPIRES_AT = new Date('2026-09-17T11:00:00.000Z');

function buildPlan(overrides: Partial<PlanCatalog> = {}): PlanCatalog {
  return {
    code: AgencyPlan.PROFESSIONAL,
    label: 'Professional',
    description: null,
    priceMonthlyPln: 19_900,
    priceYearlyPln: 199_000,
    stripePriceIdMonthly: 'price_professional_monthly',
    stripePriceIdYearly: 'price_professional_yearly',
    limits: {},
    features: {},
    isPublic: true,
    sortOrder: 1,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as PlanCatalog;
}

function buildQuote(overrides: Partial<AgencyPlanQuote> = {}): AgencyPlanQuote {
  return {
    id: 'quote-1',
    userId: null,
    agencyId: null,
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
      quotedAt: NOW.toISOString(),
      expiresAt: EXPIRES_AT.toISOString(),
      subtotalGrossAmount: 19_900,
      discountGrossAmount: 9_950,
      totalGrossAmount: 9_950,
      discounts: [],
    },
    quotedAt: NOW,
    expiresAt: EXPIRES_AT,
    metadata: {},
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as AgencyPlanQuote;
}

function buildAttempt(
  overrides: Partial<AgencyPlanCheckoutAttempt> = {},
): AgencyPlanCheckoutAttempt {
  return {
    id: 'attempt-1',
    quoteId: 'quote-1',
    attemptNumber: 1,
    status: AgencyPlanCheckoutAttemptStatus.CREATING,
    provider: 'stripe',
    amountGross: 9_950,
    currency: 'PLN',
    providerCheckoutSessionId: null,
    providerSubscriptionId: null,
    failureCode: null,
    failureMessage: null,
    startedAt: NOW,
    expiresAt: EXPIRES_AT,
    completedAt: null,
    metadata: {},
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as AgencyPlanCheckoutAttempt;
}

function buildService(input: {
  quote?: AgencyPlanQuote | null;
  latestAttempt?: AgencyPlanCheckoutAttempt | null;
  plan?: PlanCatalog | null;
} = {}) {
  const createdAttempts: AgencyPlanCheckoutAttempt[] = [];
  const saved: unknown[] = [];
  const quote = input.quote === undefined ? buildQuote() : input.quote;
  const plan = input.plan === undefined ? buildPlan() : input.plan;
  const manager = {
    findOne: jest.fn(async (entity, query) => {
      if (entity === AgencyPlanQuote) return quote;
      if (entity === PlanCatalog) return plan;
      if (entity === AgencyPlanCheckoutAttempt) {
        if (query?.where?.id) {
          return (
            createdAttempts.find((attempt) => attempt.id === query.where.id) ??
            (input.latestAttempt?.id === query.where.id
              ? input.latestAttempt
              : null)
          );
        }
        return input.latestAttempt ?? null;
      }
      return null;
    }),
    create: jest.fn((entity, value) => {
      if (entity === AgencyPlanCheckoutAttempt) {
        const attempt = {
          id: `attempt-${createdAttempts.length + 1}`,
          createdAt: NOW,
          updatedAt: NOW,
          ...value,
        } as AgencyPlanCheckoutAttempt;
        createdAttempts.push(attempt);
        return attempt;
      }
      return value;
    }),
    save: jest.fn(async (_entity, value) => {
      saved.push(value);
      return value;
    }),
  };
  const dataSource = {
    transaction: jest.fn((callback) => callback(manager)),
  };
  const usersService = {
    getAgencyAccessContext: jest.fn().mockResolvedValue({
      user: { id: 'user-1', email: 'owner@example.com' },
      agency: {
        id: 'agency-1',
        name: 'Example Agency',
        billingCustomerId: null,
        billingSubscriptionId: null,
      },
    }),
  };
  const promotionsService = {
    reserveDiscountsForQuote: jest.fn(async () => []),
  };
  const paymentGateway = {
    provider: 'stripe',
    createSubscriptionCheckoutSession: jest.fn().mockResolvedValue({
      provider: 'stripe',
      sessionId: 'cs_agent_1',
      checkoutUrl: 'https://checkout.stripe.test/session',
      subscriptionId: 'sub_pending_1',
      expiresAt: EXPIRES_AT,
    }),
  };

  return {
    service: new AgencyPlanCheckoutAttemptsService(
      dataSource as never,
      usersService as never,
      promotionsService as never,
      paymentGateway as never,
    ),
    manager,
    usersService,
    promotionsService,
    paymentGateway,
    createdAttempts,
    saved,
    quote,
  };
}

describe('AgencyPlanCheckoutAttemptsService', () => {
  it('attaches a public quote, reserves discounts, creates a provider session and binds it to the attempt', async () => {
    const {
      service,
      quote,
      promotionsService,
      paymentGateway,
      createdAttempts,
    } = buildService({
      quote: buildQuote({
        pricingSnapshot: {
          ...buildQuote().pricingSnapshot,
          discounts: [
            {
              sourceType: 'campaign',
              sourceReference: 'campaign-1',
              label: 'Start',
              grossAmount: 9_950,
              durationBillingCycles: 3,
              applicationTiming:
                AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
            },
          ],
        },
      }),
    });

    const result = await service.createCheckoutAttempt(
      'user-1',
      'quote-1',
      NOW,
    );

    expect(quote?.userId).toBe('user-1');
    expect(quote?.agencyId).toBe('agency-1');
    expect(promotionsService.reserveDiscountsForQuote).toHaveBeenCalledWith(
      expect.any(Object),
      quote,
      NOW,
    );
    expect(createdAttempts[0]).toMatchObject({
      quoteId: 'quote-1',
      attemptNumber: 1,
      status: AgencyPlanCheckoutAttemptStatus.PENDING,
      provider: 'stripe',
      amountGross: 9_950,
      expiresAt: EXPIRES_AT,
      providerCheckoutSessionId: 'cs_agent_1',
      providerSubscriptionId: 'sub_pending_1',
    });
    expect(paymentGateway.createSubscriptionCheckoutSession).toHaveBeenCalledWith({
      quoteId: 'quote-1',
      checkoutAttemptId: 'attempt-1',
      attemptNumber: 1,
      agencyId: 'agency-1',
      agencyName: 'Example Agency',
      buyerEmail: 'owner@example.com',
      billingCustomerId: null,
      planCode: AgencyPlan.PROFESSIONAL,
      planLabel: 'Professional',
      billingInterval: AgencyPlanBillingInterval.MONTHLY,
      providerPriceReference: 'price_professional_monthly',
      currency: 'PLN',
      subtotalGrossAmount: 19_900,
      discountGrossAmount: 9_950,
      totalGrossAmount: 9_950,
      discountDurationBillingCycles: 3,
      expiresAt: EXPIRES_AT,
    });
    expect(result).toMatchObject({
      quoteId: 'quote-1',
      checkoutAttemptId: 'attempt-1',
      attemptNumber: 1,
      status: AgencyPlanCheckoutAttemptStatus.PENDING,
      provider: 'stripe',
      sessionId: 'cs_agent_1',
      checkoutUrl: 'https://checkout.stripe.test/session',
      subscriptionId: 'sub_pending_1',
      amountGross: 9_950,
    });
  });

  it('reuses an open attempt instead of creating a duplicate', async () => {
    const openAttempt = buildAttempt({
      id: 'attempt-open',
      status: AgencyPlanCheckoutAttemptStatus.PENDING,
    });
    const { service, manager, paymentGateway } = buildService({
      quote: buildQuote({
        userId: 'user-1',
        agencyId: 'agency-1',
        status: AgencyPlanQuoteStatus.RESERVED,
      }),
      latestAttempt: openAttempt,
    });

    const result = await service.createCheckoutAttempt(
      'user-1',
      'quote-1',
      NOW,
    );

    expect(manager.create).not.toHaveBeenCalled();
    expect(paymentGateway.createSubscriptionCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        checkoutAttemptId: 'attempt-open',
      }),
    );
    expect(result).toMatchObject({
      checkoutAttemptId: 'attempt-open',
      status: AgencyPlanCheckoutAttemptStatus.PENDING,
      sessionId: 'cs_agent_1',
    });
  });

  it('hides quotes owned by another user or agency', async () => {
    const { service } = buildService({
      quote: buildQuote({ userId: 'other-user', agencyId: 'agency-1' }),
    });

    await expect(
      service.createCheckoutAttempt('user-1', 'quote-1', NOW),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not create a second subscription for an agency with active billing', async () => {
    const { service, usersService, paymentGateway } = buildService();
    usersService.getAgencyAccessContext.mockResolvedValueOnce({
      user: { id: 'user-1', email: 'owner@example.com' },
      agency: { id: 'agency-1', name: 'Example Agency', billingSubscriptionId: 'sub_existing' },
    });

    await expect(service.createCheckoutAttempt('user-1', 'quote-1', NOW)).rejects.toBeInstanceOf(ConflictException);
    expect(paymentGateway.createSubscriptionCheckoutSession).not.toHaveBeenCalled();
  });

  it('rejects expired quotes before reserving discounts', async () => {
    const { service, promotionsService, paymentGateway } = buildService({
      quote: buildQuote({
        expiresAt: new Date('2026-09-17T09:59:59.000Z'),
      }),
    });

    await expect(
      service.createCheckoutAttempt('user-1', 'quote-1', NOW),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(promotionsService.reserveDiscountsForQuote).not.toHaveBeenCalled();
    expect(paymentGateway.createSubscriptionCheckoutSession).not.toHaveBeenCalled();
  });

  it('rejects quotes with less than 35 minutes remaining before reserving discounts', async () => {
    const { service, promotionsService, paymentGateway } = buildService({
      quote: buildQuote({ expiresAt: new Date('2026-09-17T10:34:59.000Z') }),
    });

    await expect(service.createCheckoutAttempt('user-1', 'quote-1', NOW)).rejects.toBeInstanceOf(ConflictException);
    expect(promotionsService.reserveDiscountsForQuote).not.toHaveBeenCalled();
    expect(paymentGateway.createSubscriptionCheckoutSession).not.toHaveBeenCalled();
  });

  it('rejects already successful checkout attempts', async () => {
    const { service } = buildService({
      quote: buildQuote({
        userId: 'user-1',
        agencyId: 'agency-1',
        status: AgencyPlanQuoteStatus.RESERVED,
      }),
      latestAttempt: buildAttempt({
        status: AgencyPlanCheckoutAttemptStatus.SUCCEEDED,
      }),
    });

    await expect(
      service.createCheckoutAttempt('user-1', 'quote-1', NOW),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects checkout when the selected interval has no provider price', async () => {
    const { service, paymentGateway } = buildService({
      plan: buildPlan({ stripePriceIdMonthly: null }),
    });

    await expect(
      service.createCheckoutAttempt('user-1', 'quote-1', NOW),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(paymentGateway.createSubscriptionCheckoutSession).not.toHaveBeenCalled();
  });
});
