import { AgencyPlan } from '../common/enums';
import { AgencyPlanPaymentReconciliationService } from './agency-plan-payment-reconciliation.service';
import {
  AgencyPlanBillingInterval,
  AgencyPlanCheckoutAttemptStatus,
  AgencyPlanQuoteStatus,
} from './agency-plan-commerce.types';
import { AgencyPlanPromotionsService } from './agency-plan-promotions.service';
import { AgencyPlanCheckoutAttempt, AgencyPlanQuote } from './entities';

const NOW = new Date('2026-09-21T12:00:00.000Z');

function buildQuote(overrides: Partial<AgencyPlanQuote> = {}): AgencyPlanQuote {
  return {
    id: 'quote-1',
    userId: 'user-1',
    agencyId: 'agency-1',
    planCode: AgencyPlan.PROFESSIONAL,
    billingInterval: AgencyPlanBillingInterval.MONTHLY,
    status: AgencyPlanQuoteStatus.RESERVED,
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
      quotedAt: '2026-09-21T11:30:00.000Z',
      expiresAt: '2026-09-21T11:45:00.000Z',
      subtotalGrossAmount: 19_900,
      discountGrossAmount: 9_950,
      totalGrossAmount: 9_950,
      discounts: [],
    },
    quotedAt: new Date('2026-09-21T11:30:00.000Z'),
    expiresAt: new Date('2026-09-21T11:45:00.000Z'),
    metadata: {},
    createdAt: new Date('2026-09-21T11:30:00.000Z'),
    updatedAt: new Date('2026-09-21T11:30:00.000Z'),
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
    status: AgencyPlanCheckoutAttemptStatus.PENDING,
    provider: 'stripe',
    amountGross: 9_950,
    currency: 'PLN',
    providerCheckoutSessionId: 'cs_agent_1',
    providerSubscriptionId: null,
    failureCode: null,
    failureMessage: null,
    startedAt: new Date('2026-09-21T11:31:00.000Z'),
    expiresAt: new Date('2026-09-21T11:59:00.000Z'),
    completedAt: null,
    metadata: {},
    createdAt: new Date('2026-09-21T11:31:00.000Z'),
    updatedAt: new Date('2026-09-21T11:31:00.000Z'),
    ...overrides,
  } as AgencyPlanCheckoutAttempt;
}

function buildService(input?: {
  candidates?: Array<Partial<AgencyPlanCheckoutAttempt>>;
  quote?: Partial<AgencyPlanQuote> | null;
  attempt?: Partial<AgencyPlanCheckoutAttempt> | null;
  latestAttempt?: Partial<AgencyPlanCheckoutAttempt> | null;
}) {
  const candidates = input?.candidates ?? [];
  const quote =
    input?.quote === undefined ? buildQuote() : input.quote;
  const attempt =
    input?.attempt === undefined ? buildAttempt() : input.attempt;
  const latestAttempt =
    input?.latestAttempt === undefined ? attempt : input.latestAttempt;
  const manager = {
    findOne: jest.fn(
      (entity: unknown, options: { where?: { id?: string } }) => {
        if (entity === AgencyPlanQuote) return Promise.resolve(quote);
        if (options.where?.id) return Promise.resolve(attempt);
        return Promise.resolve(latestAttempt);
      },
    ),
    save: jest.fn((_entity: unknown, value: unknown) => Promise.resolve(value)),
  };
  const attemptsRepository = {
    find: jest.fn().mockResolvedValue(candidates),
  };
  const dataSource = {
    getRepository: jest.fn().mockReturnValue(attemptsRepository),
    transaction: jest.fn((callback: (value: typeof manager) => unknown) =>
      callback(manager),
    ),
  };
  const promotionsService = {
    releaseReservationsForQuotes: jest.fn().mockResolvedValue(1),
  };
  const service = new AgencyPlanPaymentReconciliationService(
    dataSource as never,
    promotionsService as unknown as AgencyPlanPromotionsService,
  );

  return {
    service,
    dataSource,
    manager,
    attemptsRepository,
    promotionsService,
    quote,
    attempt,
  };
}

describe('AgencyPlanPaymentReconciliationService', () => {
  it('expires an abandoned current attempt and releases quote reservations atomically', async () => {
    const candidate = { id: 'attempt-1', quoteId: 'quote-1' };
    const { service, manager, quote, attempt, promotionsService } =
      buildService({
        candidates: [candidate],
      });

    const result = await service.reconcile(NOW);

    expect(result.expiredAttemptIds).toEqual(['attempt-1']);
    expect(result.releasedQuoteIds).toEqual(['quote-1']);
    expect(attempt).toMatchObject({
      status: AgencyPlanCheckoutAttemptStatus.EXPIRED,
      completedAt: NOW,
    });
    expect(manager.findOne.mock.calls.map(([entity]) => entity)).toEqual([
      AgencyPlanQuote,
      AgencyPlanCheckoutAttempt,
      AgencyPlanCheckoutAttempt,
    ]);
    expect(promotionsService.releaseReservationsForQuotes).toHaveBeenCalledWith(
      manager,
      [quote],
      NOW,
    );
  });

  it('rechecks state under lock and preserves a concurrent successful payment', async () => {
    const { service, attempt, manager } = buildService({
      candidates: [{ id: 'attempt-1', quoteId: 'quote-1' }],
      attempt: {
        id: 'attempt-1',
        quoteId: 'quote-1',
        status: AgencyPlanCheckoutAttemptStatus.SUCCEEDED,
        expiresAt: new Date('2026-09-21T11:59:00.000Z'),
      },
    });

    const result = await service.reconcile(NOW);

    expect(result.skippedAttemptIds).toEqual(['attempt-1']);
    expect(result.releasedQuoteIds).toEqual([]);
    expect(attempt?.status).toBe(AgencyPlanCheckoutAttemptStatus.SUCCEEDED);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('expires an old attempt without releasing reservations when a newer attempt exists', async () => {
    const { service, promotionsService } = buildService({
      candidates: [{ id: 'attempt-1', quoteId: 'quote-1' }],
      latestAttempt: {
        id: 'attempt-2',
        quoteId: 'quote-1',
        attemptNumber: 2,
        status: AgencyPlanCheckoutAttemptStatus.PENDING,
      },
    });

    const result = await service.reconcile(NOW);

    expect(result.expiredAttemptIds).toEqual(['attempt-1']);
    expect(result.releasedQuoteIds).toEqual([]);
    expect(promotionsService.releaseReservationsForQuotes).not.toHaveBeenCalled();
  });

  it('isolates expiration failures per attempt', async () => {
    const failure = new Error('database timeout');
    const { service, dataSource } = buildService({
      candidates: [{ id: 'attempt-1', quoteId: 'quote-1' }],
    });
    (dataSource.transaction as jest.Mock).mockRejectedValueOnce(failure);

    const result = await service.reconcile(NOW);

    expect(result.expiredAttemptIds).toEqual([]);
    expect(result.expirationFailures).toEqual([
      { id: 'attempt-1', error: failure },
    ]);
  });
});
