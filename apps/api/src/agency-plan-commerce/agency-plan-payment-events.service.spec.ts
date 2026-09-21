import { ConflictException } from '@nestjs/common';
import { AgencyPlan, SubscriptionStatus } from '../common/enums';
import { Agency } from '../users/entities';
import { AgencyPlanPaymentEventsService } from './agency-plan-payment-events.service';
import {
  AgencyPlanBillingInterval,
  AgencyPlanCheckoutAttemptStatus,
  AgencyPlanPaymentEventType,
  AgencyPlanQuoteStatus,
} from './agency-plan-commerce.types';
import { AgencyPlanCheckoutAttempt, AgencyPlanQuote } from './entities';

const OCCURRED_AT = new Date('2026-09-17T11:00:00.000Z');

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
      quotedAt: '2026-09-17T10:00:00.000Z',
      expiresAt: '2026-09-17T10:15:00.000Z',
      subtotalGrossAmount: 19_900,
      discountGrossAmount: 9_950,
      totalGrossAmount: 9_950,
      discounts: [],
    },
    quotedAt: new Date('2026-09-17T10:00:00.000Z'),
    expiresAt: new Date('2026-09-17T10:15:00.000Z'),
    metadata: {},
    createdAt: new Date('2026-09-17T10:00:00.000Z'),
    updatedAt: new Date('2026-09-17T10:00:00.000Z'),
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
    startedAt: new Date('2026-09-17T10:01:00.000Z'),
    expiresAt: new Date('2026-09-17T10:15:00.000Z'),
    completedAt: null,
    metadata: {},
    createdAt: new Date('2026-09-17T10:01:00.000Z'),
    updatedAt: new Date('2026-09-17T10:01:00.000Z'),
    ...overrides,
  } as AgencyPlanCheckoutAttempt;
}

function buildAgency(overrides: Partial<Agency> = {}): Agency {
  return {
    id: 'agency-1',
    name: 'Example Agency',
    address: null,
    logoUrl: null,
    subscription: SubscriptionStatus.ACTIVE,
    plan: AgencyPlan.FREE,
    planOverrides: null,
    billingCustomerId: null,
    billingSubscriptionId: null,
    billingInterval: null,
    currentPeriodEnd: null,
    trialEndsAt: null,
    planChangedAt: null,
    limitGraceStartedAt: new Date('2026-09-17T09:00:00.000Z'),
    limitGraceEndsAt: new Date('2026-09-24T09:00:00.000Z'),
    limitGraceEnforcedAt: null,
    ownerId: 'user-1',
    createdAt: new Date('2026-09-01T10:00:00.000Z'),
    updatedAt: new Date('2026-09-01T10:00:00.000Z'),
    agents: [],
    ...overrides,
  } as Agency;
}

function buildEvent(overrides = {}) {
  return {
    provider: 'stripe',
    eventId: 'evt_agent_1',
    eventType: AgencyPlanPaymentEventType.CHECKOUT_COMPLETED,
    quoteId: 'quote-1',
    checkoutAttemptId: 'attempt-1',
    agencyId: 'agency-1',
    checkoutSessionId: 'cs_agent_1',
    subscriptionId: 'sub_agent_1',
    customerId: 'cus_agent_1',
    amountGross: 9_950,
    currency: 'PLN',
    occurredAt: OCCURRED_AT,
    payload: {},
    ...overrides,
  };
}

function buildService(input: {
  quote?: AgencyPlanQuote;
  attempt?: AgencyPlanCheckoutAttempt;
  agency?: Agency;
} = {}) {
  const quote = input.quote ?? buildQuote();
  const attempt = input.attempt ?? buildAttempt();
  const agency = input.agency ?? buildAgency();
  const saved: unknown[] = [];
  const manager = {
    findOne: jest.fn(async (entity) => {
      if (entity === AgencyPlanQuote) return quote;
      if (entity === AgencyPlanCheckoutAttempt) return attempt;
      if (entity === Agency) return agency;
      return null;
    }),
    save: jest.fn(async (_entity, value) => {
      saved.push(value);
      return value;
    }),
  };
  const dataSource = {
    transaction: jest.fn((callback) => callback(manager)),
  };
  const promotionsService = {
    applyReservedDiscountsForQuote: jest.fn(async () => []),
    releaseReservationsForQuotes: jest.fn(async () => 1),
  };

  return {
    service: new AgencyPlanPaymentEventsService(
      dataSource as never,
      promotionsService as never,
    ),
    manager,
    promotionsService,
    quote,
    attempt,
    agency,
    saved,
  };
}

describe('AgencyPlanPaymentEventsService', () => {
  it('marks a successful attempt, activates the agency plan and applies reserved discounts', async () => {
    const { service, attempt, agency, quote, promotionsService } = buildService();

    const result = await service.processVerifiedEvent(buildEvent());

    expect(result).toEqual({
      status: 'processed',
      quoteId: 'quote-1',
      checkoutAttemptId: 'attempt-1',
      attemptStatus: AgencyPlanCheckoutAttemptStatus.SUCCEEDED,
      agencyId: 'agency-1',
    });
    expect(attempt).toMatchObject({
      status: AgencyPlanCheckoutAttemptStatus.SUCCEEDED,
      providerCheckoutSessionId: 'cs_agent_1',
      providerSubscriptionId: 'sub_agent_1',
      completedAt: OCCURRED_AT,
    });
    expect(agency).toMatchObject({
      plan: AgencyPlan.PROFESSIONAL,
      subscription: SubscriptionStatus.ACTIVE,
      billingInterval: AgencyPlanBillingInterval.MONTHLY,
      billingCustomerId: 'cus_agent_1',
      billingSubscriptionId: 'sub_agent_1',
      planChangedAt: OCCURRED_AT,
      limitGraceStartedAt: null,
      limitGraceEndsAt: null,
    });
    expect(promotionsService.applyReservedDiscountsForQuote).toHaveBeenCalledWith(
      expect.any(Object),
      quote,
      OCCURRED_AT,
      'evt_agent_1',
    );
  });

  it('ignores duplicate success for an already succeeded attempt', async () => {
    const { service, promotionsService } = buildService({
      attempt: buildAttempt({
        status: AgencyPlanCheckoutAttemptStatus.SUCCEEDED,
        providerSubscriptionId: 'sub_agent_1',
        completedAt: OCCURRED_AT,
      }),
    });

    await expect(service.processVerifiedEvent(buildEvent())).resolves.toMatchObject({
      status: 'ignored_duplicate',
      attemptStatus: AgencyPlanCheckoutAttemptStatus.SUCCEEDED,
    });
    expect(promotionsService.applyReservedDiscountsForQuote).not.toHaveBeenCalled();
  });

  it('expires an open attempt and releases reserved discounts', async () => {
    const { service, attempt, quote, promotionsService } = buildService();

    await expect(
      service.processVerifiedEvent(
        buildEvent({
          eventType: AgencyPlanPaymentEventType.CHECKOUT_EXPIRED,
          subscriptionId: null,
          amountGross: null,
          currency: null,
        }),
      ),
    ).resolves.toMatchObject({
      status: 'processed',
      attemptStatus: AgencyPlanCheckoutAttemptStatus.EXPIRED,
    });
    expect(attempt.status).toBe(AgencyPlanCheckoutAttemptStatus.EXPIRED);
    expect(promotionsService.releaseReservationsForQuotes).toHaveBeenCalledWith(
      expect.any(Object),
      [quote],
      OCCURRED_AT,
    );
  });

  it('rejects successful payments with mismatched amount', async () => {
    const { service, promotionsService } = buildService();

    await expect(
      service.processVerifiedEvent(buildEvent({ amountGross: 123 })),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(promotionsService.applyReservedDiscountsForQuote).not.toHaveBeenCalled();
  });
});
