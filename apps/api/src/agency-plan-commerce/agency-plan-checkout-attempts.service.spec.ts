import { ConflictException, NotFoundException } from '@nestjs/common';
import { AgencyPlan } from '../common/enums';
import { AgencyPlanCheckoutAttemptsService } from './agency-plan-checkout-attempts.service';
import {
  AgencyPlanBillingInterval,
  AgencyPlanCheckoutAttemptStatus,
  AgencyPlanQuoteStatus,
} from './agency-plan-commerce.types';
import { AgencyPlanCheckoutAttempt, AgencyPlanQuote } from './entities';

const NOW = new Date('2026-09-17T10:00:00.000Z');
const EXPIRES_AT = new Date('2026-09-17T10:15:00.000Z');

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
} = {}) {
  const createdAttempts: AgencyPlanCheckoutAttempt[] = [];
  const saved: unknown[] = [];
  const quote = input.quote === undefined ? buildQuote() : input.quote;
  const manager = {
    findOne: jest.fn(async (entity) => {
      if (entity === AgencyPlanQuote) return quote;
      if (entity === AgencyPlanCheckoutAttempt) {
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
      user: { id: 'user-1' },
      agency: { id: 'agency-1' },
    }),
  };
  const promotionsService = {
    reserveDiscountsForQuote: jest.fn(async () => []),
  };

  return {
    service: new AgencyPlanCheckoutAttemptsService(
      dataSource as never,
      usersService as never,
      promotionsService as never,
    ),
    manager,
    usersService,
    promotionsService,
    createdAttempts,
    saved,
    quote,
  };
}

describe('AgencyPlanCheckoutAttemptsService', () => {
  it('attaches a public quote to the current agency, reserves discounts and creates an attempt', async () => {
    const { service, quote, promotionsService, createdAttempts } = buildService();

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
      status: AgencyPlanCheckoutAttemptStatus.CREATING,
      provider: 'stripe',
      amountGross: 9_950,
      expiresAt: EXPIRES_AT,
    });
    expect(result).toMatchObject({
      quoteId: 'quote-1',
      checkoutAttemptId: 'attempt-1',
      attemptNumber: 1,
      status: AgencyPlanCheckoutAttemptStatus.CREATING,
      amountGross: 9_950,
    });
  });

  it('reuses an open attempt instead of creating a duplicate', async () => {
    const openAttempt = buildAttempt({
      id: 'attempt-open',
      status: AgencyPlanCheckoutAttemptStatus.PENDING,
    });
    const { service, manager } = buildService({
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
    expect(result).toMatchObject({
      checkoutAttemptId: 'attempt-open',
      status: AgencyPlanCheckoutAttemptStatus.PENDING,
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

  it('rejects expired quotes before reserving discounts', async () => {
    const { service, promotionsService } = buildService({
      quote: buildQuote({
        expiresAt: new Date('2026-09-17T09:59:59.000Z'),
      }),
    });

    await expect(
      service.createCheckoutAttempt('user-1', 'quote-1', NOW),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(promotionsService.reserveDiscountsForQuote).not.toHaveBeenCalled();
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
});
