import { AgencyPlan } from '../common/enums';
import { PlanCatalog } from '../plans/entities';
import {
  AgencyPlanBillingInterval,
  AgencyPlanPromotionApplicationTiming,
  AgencyPlanPromotionDiscountType,
  AgencyPlanPromotionStatus,
  AgencyPlanPromotionTargetScope,
} from './agency-plan-commerce.types';
import { AgencyPlanPromotionsService } from './agency-plan-promotions.service';
import { AgencyPlanPromotionCampaign } from './entities';

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

function buildService(campaigns: AgencyPlanPromotionCampaign[]) {
  const repo = {
    find: jest.fn().mockResolvedValue(campaigns),
  };

  return {
    service: new AgencyPlanPromotionsService(repo as never),
    repo,
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
});
