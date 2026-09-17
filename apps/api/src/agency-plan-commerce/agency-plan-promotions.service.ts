import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { AgencyPlan } from '../common/enums';
import { PlanCatalog } from '../plans/entities';
import {
  AgencyPlanBillingInterval,
  AgencyPlanPromotionApplicationTiming,
  AgencyPlanPromotionDiscountType,
  AgencyPlanPromotionStatus,
  AgencyPlanPromotionTargetRules,
  AgencyPlanPromotionTargetScope,
} from './agency-plan-commerce.types';
import { AgencyPlanPromotionCampaign } from './entities';

export interface ResolveAgencyPlanPromotionPreviewInput {
  plan: PlanCatalog;
  billingInterval: AgencyPlanBillingInterval;
  now?: Date;
}

export interface AgencyPlanPromotionPreview {
  label: string;
  discountGrossAmount: number;
  priceGrossAmount: number;
  durationBillingCycles: number;
  campaignId: string;
}

@Injectable()
export class AgencyPlanPromotionsService {
  constructor(
    @InjectRepository(AgencyPlanPromotionCampaign)
    private readonly campaignRepo: Repository<AgencyPlanPromotionCampaign>,
  ) {}

  async resolveAutomaticPreview(
    input: ResolveAgencyPlanPromotionPreviewInput,
  ): Promise<AgencyPlanPromotionPreview | null> {
    const now = input.now ?? new Date();
    const basePrice = getPlanIntervalPrice(input.plan, input.billingInterval);
    if (basePrice <= 0) return null;

    const campaigns = await this.findAutomaticCampaigns(now);
    const candidates = campaigns
      .filter((campaign) => isAutomaticInitialCheckoutCampaign(campaign, now))
      .filter((campaign) =>
        isCampaignEligibleForPlan(campaign, input.plan, input.billingInterval, basePrice),
      )
      .map((campaign) => ({
        campaign,
        discountGrossAmount: calculateDiscountGrossAmount(campaign, basePrice),
      }))
      .filter((candidate) => candidate.discountGrossAmount > 0)
      .sort((left, right) => {
        const discountDiff = right.discountGrossAmount - left.discountGrossAmount;
        if (discountDiff !== 0) return discountDiff;
        return left.campaign.createdAt.getTime() - right.campaign.createdAt.getTime();
      });

    const best = candidates[0];
    if (!best) return null;

    return {
      label: best.campaign.name,
      discountGrossAmount: best.discountGrossAmount,
      priceGrossAmount: basePrice - best.discountGrossAmount,
      durationBillingCycles: best.campaign.durationBillingCycles,
      campaignId: best.campaign.id,
    };
  }

  private async findAutomaticCampaigns(
    now: Date,
  ): Promise<AgencyPlanPromotionCampaign[]> {
    return this.campaignRepo.find({
      where: [
        {
          status: AgencyPlanPromotionStatus.ACTIVE,
          isAutomatic: true,
          applicationTiming: AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
          startsAt: LessThanOrEqual(now),
          endsAt: MoreThan(now),
          archivedAt: IsNull(),
        },
        {
          status: AgencyPlanPromotionStatus.ACTIVE,
          isAutomatic: true,
          applicationTiming: AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
          startsAt: LessThanOrEqual(now),
          endsAt: IsNull(),
          archivedAt: IsNull(),
        },
        {
          status: AgencyPlanPromotionStatus.ACTIVE,
          isAutomatic: true,
          applicationTiming: AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
          startsAt: IsNull(),
          endsAt: MoreThan(now),
          archivedAt: IsNull(),
        },
        {
          status: AgencyPlanPromotionStatus.ACTIVE,
          isAutomatic: true,
          applicationTiming: AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
          startsAt: IsNull(),
          endsAt: IsNull(),
          archivedAt: IsNull(),
        },
      ],
      order: { createdAt: 'ASC' },
    });
  }
}

function isAutomaticInitialCheckoutCampaign(
  campaign: AgencyPlanPromotionCampaign,
  now: Date,
): boolean {
  if (campaign.status !== AgencyPlanPromotionStatus.ACTIVE) return false;
  if (!campaign.isAutomatic) return false;
  if (
    campaign.applicationTiming !==
    AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT
  ) {
    return false;
  }
  if (campaign.archivedAt) return false;
  if (campaign.startsAt && campaign.startsAt > now) return false;
  if (campaign.endsAt && campaign.endsAt <= now) return false;
  return true;
}

function isCampaignEligibleForPlan(
  campaign: AgencyPlanPromotionCampaign,
  plan: PlanCatalog,
  billingInterval: AgencyPlanBillingInterval,
  subtotalGrossAmount: number,
): boolean {
  if (campaign.durationBillingCycles < 1) return false;

  const rules = campaign.targetRules ?? {};
  if (!matchesTargetScope(campaign.targetScope, rules, plan, billingInterval)) {
    return false;
  }

  if (
    rules.minimumSubtotalGrossAmount !== undefined &&
    subtotalGrossAmount < rules.minimumSubtotalGrossAmount
  ) {
    return false;
  }

  return true;
}

function matchesTargetScope(
  targetScope: AgencyPlanPromotionTargetScope,
  rules: AgencyPlanPromotionTargetRules,
  plan: PlanCatalog,
  billingInterval: AgencyPlanBillingInterval,
): boolean {
  if (rules.billingIntervals?.length && !rules.billingIntervals.includes(billingInterval)) {
    return false;
  }
  if (rules.planCodes?.length && !rules.planCodes.includes(plan.code as AgencyPlan)) {
    return false;
  }

  if (targetScope === AgencyPlanPromotionTargetScope.ALL_PLANS) return true;
  if (targetScope === AgencyPlanPromotionTargetScope.PLAN_CODES) {
    return Boolean(rules.planCodes?.includes(plan.code as AgencyPlan));
  }
  if (targetScope === AgencyPlanPromotionTargetScope.BILLING_INTERVALS) {
    return Boolean(rules.billingIntervals?.includes(billingInterval));
  }

  return false;
}

function calculateDiscountGrossAmount(
  campaign: AgencyPlanPromotionCampaign,
  subtotalGrossAmount: number,
): number {
  const rawDiscount =
    campaign.discountType === AgencyPlanPromotionDiscountType.PERCENTAGE
      ? Math.floor((subtotalGrossAmount * campaign.discountValue) / 10_000)
      : campaign.discountValue;
  const cappedByMax =
    campaign.maxDiscountGrossAmount === null ||
    campaign.maxDiscountGrossAmount === undefined
      ? rawDiscount
      : Math.min(rawDiscount, campaign.maxDiscountGrossAmount);

  return Math.min(subtotalGrossAmount, Math.max(0, cappedByMax));
}

function getPlanIntervalPrice(
  plan: PlanCatalog,
  billingInterval: AgencyPlanBillingInterval,
): number {
  return billingInterval === AgencyPlanBillingInterval.MONTHLY
    ? plan.priceMonthlyPln
    : plan.priceYearlyPln;
}
