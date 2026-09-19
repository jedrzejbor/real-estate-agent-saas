import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { AgencyPlan } from '../common/enums';
import { PlanCatalog } from '../plans/entities';
import type { AgencyPlanQuoteDiscountSnapshot } from './agency-plan-commerce.types';
import {
  AgencyPlanBillingInterval,
  AgencyPlanPromotionApplicationTiming,
  AgencyPlanPromotionDiscountType,
  AgencyPlanPromotionStatus,
  AgencyPlanPromotionTargetRules,
  AgencyPlanPromotionTargetScope,
} from './agency-plan-commerce.types';
import {
  AgencyPlanPromotionCampaign,
  AgencyPlanPromotionCode,
} from './entities';

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

export interface ResolveAgencyPlanQuoteDiscountsInput {
  plan: PlanCatalog;
  billingInterval: AgencyPlanBillingInterval;
  promotionCode?: string;
  now?: Date;
}

interface CandidateAgencyPlanPromotion {
  sourceType: 'campaign' | 'promotion_code';
  sourceReference: string;
  label: string;
  discountType: AgencyPlanPromotionDiscountType;
  discountValue: number;
  maxDiscountGrossAmount: number | null;
  durationBillingCycles: number;
  applicationTiming: AgencyPlanPromotionApplicationTiming;
  isCombinable: boolean;
  targetScope: AgencyPlanPromotionTargetScope;
  targetRules: AgencyPlanPromotionTargetRules;
  campaign: AgencyPlanPromotionCampaign;
  code?: AgencyPlanPromotionCode;
}

interface CalculatedAgencyPlanPromotionDiscount
  extends AgencyPlanQuoteDiscountSnapshot {
  isCombinable: boolean;
}

@Injectable()
export class AgencyPlanPromotionsService {
  constructor(
    @InjectRepository(AgencyPlanPromotionCampaign)
    private readonly campaignRepo: Repository<AgencyPlanPromotionCampaign>,
    @InjectRepository(AgencyPlanPromotionCode)
    private readonly codeRepo: Repository<AgencyPlanPromotionCode>,
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

  async resolveQuoteDiscounts(
    input: ResolveAgencyPlanQuoteDiscountsInput,
  ): Promise<AgencyPlanQuoteDiscountSnapshot[]> {
    const now = input.now ?? new Date();
    const subtotalGrossAmount = getPlanIntervalPrice(
      input.plan,
      input.billingInterval,
    );
    if (subtotalGrossAmount <= 0) return [];

    const [automaticCampaigns, promotionCode] = await Promise.all([
      this.findAutomaticCampaigns(now),
      this.findPromotionCode(input.promotionCode, now),
    ]);
    const candidates = [
      ...automaticCampaigns.map(campaignToCandidate),
      ...(promotionCode ? [codeToCandidate(promotionCode)] : []),
    ];
    const discounts = candidates
      .filter((candidate) =>
        isCandidateAvailableForInitialCheckout(candidate, now),
      )
      .filter((candidate) =>
        isTargetEligible(
          candidate.targetScope,
          candidate.targetRules,
          input.plan,
          input.billingInterval,
          subtotalGrossAmount,
        ),
      )
      .map((candidate) =>
        calculateQuoteDiscount(candidate, subtotalGrossAmount),
      )
      .filter(
        (
          discount,
        ): discount is CalculatedAgencyPlanPromotionDiscount =>
          discount !== null,
      );

    if (!discounts.length) return [];
    if (discounts.every((discount) => discount.isCombinable)) {
      return discounts.map(toQuoteDiscountSnapshot);
    }

    const bestDiscount = discounts.reduce((best, discount) =>
      discount.grossAmount > best.grossAmount ? discount : best,
    );
    return [toQuoteDiscountSnapshot(bestDiscount)];
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

  private async findPromotionCode(
    rawCode: string | undefined,
    now: Date,
  ): Promise<AgencyPlanPromotionCode | null> {
    const codeHash = hashAgencyPlanPromotionCode(rawCode);
    if (!codeHash) return null;

    const code = await this.codeRepo.findOne({
      where: [
        {
          codeHash,
          status: AgencyPlanPromotionStatus.ACTIVE,
          startsAt: LessThanOrEqual(now),
          endsAt: MoreThan(now),
          archivedAt: IsNull(),
        },
        {
          codeHash,
          status: AgencyPlanPromotionStatus.ACTIVE,
          startsAt: LessThanOrEqual(now),
          endsAt: IsNull(),
          archivedAt: IsNull(),
        },
        {
          codeHash,
          status: AgencyPlanPromotionStatus.ACTIVE,
          startsAt: IsNull(),
          endsAt: MoreThan(now),
          archivedAt: IsNull(),
        },
        {
          codeHash,
          status: AgencyPlanPromotionStatus.ACTIVE,
          startsAt: IsNull(),
          endsAt: IsNull(),
          archivedAt: IsNull(),
        },
      ],
      relations: ['campaign'],
    });

    return code ?? null;
  }
}

export function hashAgencyPlanPromotionCode(
  rawCode: string | undefined,
): string | null {
  const normalizedCode = normalizePromotionCode(rawCode);
  if (!normalizedCode) return null;
  return createHash('sha256').update(normalizedCode).digest('hex');
}

function normalizePromotionCode(rawCode: string | undefined): string | null {
  const normalizedCode = rawCode?.trim().toUpperCase().replace(/\s+/g, '');
  return normalizedCode || null;
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
  if (
    !isTargetEligible(
      campaign.targetScope,
      rules,
      plan,
      billingInterval,
      subtotalGrossAmount,
    )
  ) {
    return false;
  }

  return true;
}

function isTargetEligible(
  targetScope: AgencyPlanPromotionTargetScope,
  rules: AgencyPlanPromotionTargetRules,
  plan: PlanCatalog,
  billingInterval: AgencyPlanBillingInterval,
  subtotalGrossAmount: number,
): boolean {
  if (
    rules.minimumSubtotalGrossAmount !== undefined &&
    subtotalGrossAmount < rules.minimumSubtotalGrossAmount
  ) {
    return false;
  }
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

function campaignToCandidate(
  campaign: AgencyPlanPromotionCampaign,
): CandidateAgencyPlanPromotion {
  return {
    sourceType: 'campaign',
    sourceReference: campaign.id,
    label: campaign.name,
    discountType: campaign.discountType,
    discountValue: campaign.discountValue,
    maxDiscountGrossAmount: campaign.maxDiscountGrossAmount ?? null,
    durationBillingCycles: campaign.durationBillingCycles,
    applicationTiming: campaign.applicationTiming,
    isCombinable: campaign.isCombinable,
    targetScope: campaign.targetScope,
    targetRules: campaign.targetRules ?? {},
    campaign,
  };
}

function codeToCandidate(
  code: AgencyPlanPromotionCode,
): CandidateAgencyPlanPromotion {
  const campaign = code.campaign;
  return {
    sourceType: 'promotion_code',
    sourceReference: code.id,
    label: code.label,
    discountType: code.discountType ?? campaign.discountType,
    discountValue: code.discountValue ?? campaign.discountValue,
    maxDiscountGrossAmount:
      code.maxDiscountGrossAmount ?? campaign.maxDiscountGrossAmount ?? null,
    durationBillingCycles:
      code.durationBillingCycles ?? campaign.durationBillingCycles,
    applicationTiming: code.applicationTiming ?? campaign.applicationTiming,
    isCombinable: code.isCombinable ?? campaign.isCombinable,
    targetScope: campaign.targetScope,
    targetRules: campaign.targetRules ?? {},
    campaign,
    code,
  };
}

function isCandidateAvailableForInitialCheckout(
  candidate: CandidateAgencyPlanPromotion,
  now: Date,
): boolean {
  if (!isCampaignAvailable(candidate.campaign, now)) return false;
  if (
    candidate.applicationTiming !==
    AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT
  ) {
    return false;
  }
  if (candidate.durationBillingCycles < 1) return false;
  if (!isUsageAvailable(candidate.campaign, candidate.code)) return false;

  if (!candidate.code) return true;
  if (candidate.code.status !== AgencyPlanPromotionStatus.ACTIVE) return false;
  if (candidate.code.archivedAt) return false;
  if (candidate.code.startsAt && candidate.code.startsAt > now) return false;
  if (candidate.code.endsAt && candidate.code.endsAt <= now) return false;
  return true;
}

function isCampaignAvailable(
  campaign: AgencyPlanPromotionCampaign | undefined,
  now: Date,
): campaign is AgencyPlanPromotionCampaign {
  if (!campaign) return false;
  if (campaign.status !== AgencyPlanPromotionStatus.ACTIVE) return false;
  if (campaign.archivedAt) return false;
  if (campaign.startsAt && campaign.startsAt > now) return false;
  if (campaign.endsAt && campaign.endsAt <= now) return false;
  return true;
}

function isUsageAvailable(
  campaign: AgencyPlanPromotionCampaign,
  code?: AgencyPlanPromotionCode,
): boolean {
  if (
    campaign.usageLimitTotal !== null &&
    campaign.usageLimitTotal !== undefined &&
    campaign.usageCount >= campaign.usageLimitTotal
  ) {
    return false;
  }
  if (
    code &&
    code.usageLimitTotal !== null &&
    code.usageLimitTotal !== undefined &&
    code.usageCount >= code.usageLimitTotal
  ) {
    return false;
  }
  return true;
}

function calculateQuoteDiscount(
  candidate: CandidateAgencyPlanPromotion,
  subtotalGrossAmount: number,
): CalculatedAgencyPlanPromotionDiscount | null {
  const grossAmount = calculateDiscountGrossAmount(candidate, subtotalGrossAmount);
  if (grossAmount <= 0) return null;

  return {
    sourceType: candidate.sourceType,
    sourceReference: candidate.sourceReference,
    label: candidate.label,
    grossAmount,
    durationBillingCycles: candidate.durationBillingCycles,
    applicationTiming: candidate.applicationTiming,
    isCombinable: candidate.isCombinable,
  };
}

function toQuoteDiscountSnapshot(
  discount: CalculatedAgencyPlanPromotionDiscount,
): AgencyPlanQuoteDiscountSnapshot {
  return {
    sourceType: discount.sourceType,
    sourceReference: discount.sourceReference,
    label: discount.label,
    grossAmount: discount.grossAmount,
    durationBillingCycles: discount.durationBillingCycles,
    applicationTiming: discount.applicationTiming,
  };
}

function calculateDiscountGrossAmount(
  campaign: Pick<
    AgencyPlanPromotionCampaign,
    'discountType' | 'discountValue' | 'maxDiscountGrossAmount'
  >,
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
