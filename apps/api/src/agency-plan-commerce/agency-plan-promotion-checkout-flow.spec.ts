import { AgencyPlan, SubscriptionStatus } from '../common/enums';
import { Agency } from '../users/entities';
import { AdminAgencyPlanPromotionsService } from './admin-agency-plan-promotions.service';
import {
  AgencyPlanBillingInterval,
  AgencyPlanCheckoutAttemptStatus,
  AgencyPlanPaymentEventType,
  AgencyPlanPromotionApplicationTiming,
  AgencyPlanPromotionDiscountSourceType,
  AgencyPlanPromotionDiscountType,
  AgencyPlanPromotionStatus,
  AgencyPlanPromotionTargetScope,
  AgencyPlanQuoteStatus,
} from './agency-plan-commerce.types';
import { AgencyPlanPaymentEventsService } from './agency-plan-payment-events.service';
import { hashAgencyPlanPromotionCode } from './agency-plan-promotions.service';
import {
  AgencyPlanCheckoutAttempt,
  AgencyPlanPromotionCampaign,
  AgencyPlanPromotionCode,
  AgencyPlanPromotionRedemption,
  AgencyPlanQuote,
} from './entities';

const PAID_AT = new Date('2026-09-23T09:00:00.000Z');

function buildCampaign(): AgencyPlanPromotionCampaign {
  return {
    id: 'campaign-1',
    code: 'start_agents',
    name: 'Start dla agentów',
    description: '50% na start',
    status: AgencyPlanPromotionStatus.ACTIVE,
    discountType: AgencyPlanPromotionDiscountType.PERCENTAGE,
    discountValue: 5_000,
    maxDiscountGrossAmount: null,
    targetScope: AgencyPlanPromotionTargetScope.PLAN_CODES,
    targetRules: { planCodes: [AgencyPlan.PROFESSIONAL] },
    durationBillingCycles: 1,
    applicationTiming: AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
    isAutomatic: true,
    isCombinable: false,
    usageLimitTotal: 100,
    usageLimitPerAccount: 1,
    usageCount: 1,
    startsAt: null,
    endsAt: null,
    createdByUserId: 'admin-1',
    updatedByUserId: 'admin-1',
    archivedAt: null,
    createdAt: new Date('2026-09-22T08:00:00.000Z'),
    updatedAt: new Date('2026-09-22T08:00:00.000Z'),
    codes: [],
  } as AgencyPlanPromotionCampaign;
}

function buildCode(campaign: AgencyPlanPromotionCampaign): AgencyPlanPromotionCode {
  return {
    id: 'code-1',
    campaignId: campaign.id,
    codeHash: hashAgencyPlanPromotionCode('AGENT50'),
    codeLast4: 'NT50',
    label: 'Kod startowy',
    status: AgencyPlanPromotionStatus.ACTIVE,
    discountType: null,
    discountValue: null,
    maxDiscountGrossAmount: null,
    durationBillingCycles: null,
    applicationTiming: null,
    isCombinable: null,
    usageLimitTotal: 50,
    usageLimitPerAccount: 1,
    usageCount: 1,
    startsAt: null,
    endsAt: null,
    archivedAt: null,
    createdAt: new Date('2026-09-22T08:10:00.000Z'),
    updatedAt: new Date('2026-09-22T08:10:00.000Z'),
  } as AgencyPlanPromotionCode;
}

function buildQuote(): AgencyPlanQuote {
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
      billingInterval: AgencyPlanBillingInterval.MONTHLY,
      subtotalGrossAmount: 19_900,
      discountGrossAmount: 9_950,
      totalGrossAmount: 9_950,
      discounts: [
        {
          sourceType: 'promotion_code',
          sourceReference: 'code-1',
          label: 'Kod startowy',
          grossAmount: 9_950,
          durationBillingCycles: 1,
          applicationTiming: AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
        },
      ],
    },
    quotedAt: new Date('2026-09-23T08:55:00.000Z'),
    expiresAt: new Date('2026-09-23T09:10:00.000Z'),
    metadata: {},
    createdAt: new Date('2026-09-23T08:55:00.000Z'),
    updatedAt: new Date('2026-09-23T08:55:00.000Z'),
  } as AgencyPlanQuote;
}

function buildAttempt(): AgencyPlanCheckoutAttempt {
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
    startedAt: new Date('2026-09-23T08:56:00.000Z'),
    expiresAt: new Date('2026-09-23T09:10:00.000Z'),
    completedAt: null,
    metadata: {},
    createdAt: new Date('2026-09-23T08:56:00.000Z'),
    updatedAt: new Date('2026-09-23T08:56:00.000Z'),
  } as AgencyPlanCheckoutAttempt;
}

function buildAgency(): Agency {
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
    limitGraceStartedAt: new Date('2026-09-23T08:00:00.000Z'),
    limitGraceEndsAt: new Date('2026-09-30T08:00:00.000Z'),
    limitGraceEnforcedAt: null,
    ownerId: 'user-1',
    createdAt: new Date('2026-09-01T08:00:00.000Z'),
    updatedAt: new Date('2026-09-01T08:00:00.000Z'),
    agents: [],
  } as unknown as Agency;
}

describe('agency plan promotion checkout flow', () => {
  it('turns a paid checkout into a durable redemption visible in the admin sales report', async () => {
    const campaign = buildCampaign();
    const code = buildCode(campaign);
    campaign.codes = [code];
    const quote = buildQuote();
    const attempt = buildAttempt();
    const agency = buildAgency();
    const redemptions: AgencyPlanPromotionRedemption[] = [];
    const paymentManager = {
      findOne: jest.fn(async (entity) => {
        if (entity === AgencyPlanQuote) return quote;
        if (entity === AgencyPlanCheckoutAttempt) return attempt;
        if (entity === Agency) return agency;
        return null;
      }),
      save: jest.fn(async (_entity, value) => value),
    };
    const paymentDataSource = {
      transaction: jest.fn((callback) => callback(paymentManager)),
    };
    const promotionsService = {
      applyReservedDiscountsForQuote: jest.fn(async () => {
        redemptions.push({
          id: 'redemption-1',
          agencyId: agency.id,
          quoteId: quote.id,
          campaignId: campaign.id,
          codeId: code.id,
          reservationId: 'reservation-1',
          planCode: quote.planCode,
          billingInterval: quote.billingInterval,
          currency: quote.currency,
          subtotalGrossAmount: quote.subtotalGrossAmount,
          discountGrossAmount: quote.discountGrossAmount,
          totalGrossAmount: quote.totalGrossAmount,
          durationBillingCycles: 1,
          applicationTiming: AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
          sourceType:
            'promotion_code' satisfies AgencyPlanPromotionDiscountSourceType,
          pricingSnapshot: quote.pricingSnapshot,
          billingEventId: 'evt_agent_1',
          createdAt: PAID_AT,
        } as unknown as AgencyPlanPromotionRedemption);
        return redemptions;
      }),
      releaseReservationsForQuotes: jest.fn(),
    };
    const eventsService = new AgencyPlanPaymentEventsService(
      paymentDataSource as never,
      promotionsService as never,
    );

    const eventResult = await eventsService.processVerifiedEvent({
      provider: 'stripe',
      eventId: 'evt_agent_1',
      eventType: AgencyPlanPaymentEventType.CHECKOUT_COMPLETED,
      quoteId: quote.id,
      checkoutAttemptId: attempt.id,
      agencyId: agency.id,
      checkoutSessionId: 'cs_agent_1',
      subscriptionId: 'sub_agent_1',
      customerId: 'cus_agent_1',
      amountGross: quote.totalGrossAmount,
      currency: quote.currency,
      occurredAt: PAID_AT,
      payload: {},
    });

    expect(eventResult).toMatchObject({
      status: 'processed',
      quoteId: quote.id,
      checkoutAttemptId: attempt.id,
      attemptStatus: AgencyPlanCheckoutAttemptStatus.SUCCEEDED,
      agencyId: agency.id,
    });
    expect(attempt.status).toBe(AgencyPlanCheckoutAttemptStatus.SUCCEEDED);
    expect(agency).toMatchObject({
      plan: AgencyPlan.PROFESSIONAL,
      billingInterval: AgencyPlanBillingInterval.MONTHLY,
      billingCustomerId: 'cus_agent_1',
      billingSubscriptionId: 'sub_agent_1',
      limitGraceStartedAt: null,
      limitGraceEndsAt: null,
    });
    expect(redemptions).toHaveLength(1);

    const adminService = new AdminAgencyPlanPromotionsService(
      buildReportDataSource(campaign, code, redemptions) as never,
    );
    const report = await adminService.getSalesReport(campaign.code);

    expect(report).toMatchObject({
      campaign: {
        code: 'start_agents',
        usageCount: 1,
        usageLimitTotal: 100,
      },
      totals: {
        redemptionCount: 1,
        discountGrossAmount: 9_950,
        subtotalGrossAmount: 19_900,
        totalGrossAmount: 9_950,
      },
      byPlan: [
        {
          planCode: AgencyPlan.PROFESSIONAL,
          billingInterval: AgencyPlanBillingInterval.MONTHLY,
          redemptionCount: 1,
          discountGrossAmount: 9_950,
        },
      ],
      byCode: [
        {
          codeId: code.id,
          codeLast4: 'NT50',
          label: 'Kod startowy',
          redemptionCount: 1,
          discountGrossAmount: 9_950,
        },
      ],
    });
    expect(report.totals.firstRedemptionAt?.toISOString()).toBe(
      PAID_AT.toISOString(),
    );
    expect(JSON.stringify(report)).not.toContain('AGENT50');
    expect(JSON.stringify(report)).not.toContain(code.codeHash);
  });
});

function buildReportDataSource(
  campaign: AgencyPlanPromotionCampaign,
  code: AgencyPlanPromotionCode,
  redemptions: AgencyPlanPromotionRedemption[],
) {
  return {
    manager: {
      findOne: jest.fn(async (entity, options) => {
        if (
          entity === AgencyPlanPromotionCampaign &&
          options.where.code === campaign.code
        ) {
          return campaign;
        }
        return null;
      }),
      find: jest.fn(async (entity, options) => {
        if (
          entity === AgencyPlanPromotionCode &&
          options.where.campaignId === campaign.id
        ) {
          return [code];
        }
        return [];
      }),
    },
    query: jest.fn(async (sql: string) => {
      if (sql.includes('GROUP BY plan_code, billing_interval')) {
        return redemptions.map((redemption) => ({
          planCode: redemption.planCode,
          billingInterval: redemption.billingInterval,
          redemptionCount: 1,
          discountGrossAmount: redemption.discountGrossAmount,
          subtotalGrossAmount: redemption.subtotalGrossAmount,
          totalGrossAmount: redemption.totalGrossAmount,
        }));
      }
      if (sql.includes('INNER JOIN agency_plan_promotion_codes')) {
        return redemptions
          .filter((redemption) => redemption.codeId)
          .map((redemption) => ({
            codeId: redemption.codeId,
            codeLast4: code.codeLast4,
            label: code.label,
            redemptionCount: 1,
            discountGrossAmount: redemption.discountGrossAmount,
            subtotalGrossAmount: redemption.subtotalGrossAmount,
            totalGrossAmount: redemption.totalGrossAmount,
          }));
      }
      return [
        {
          redemptionCount: redemptions.length,
          discountGrossAmount: sumBy(
            redemptions,
            (redemption) => redemption.discountGrossAmount,
          ),
          subtotalGrossAmount: sumBy(
            redemptions,
            (redemption) => redemption.subtotalGrossAmount,
          ),
          totalGrossAmount: sumBy(
            redemptions,
            (redemption) => redemption.totalGrossAmount,
          ),
          firstRedemptionAt: redemptions[0]?.createdAt ?? null,
          lastRedemptionAt: redemptions.at(-1)?.createdAt ?? null,
        },
      ];
    }),
  };
}

function sumBy<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((sum, item) => sum + pick(item), 0);
}
