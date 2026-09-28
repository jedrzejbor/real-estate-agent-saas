import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThan,
  Repository,
} from 'typeorm';
import { AgencyPlan } from '../common/enums';
import { PlanCatalog } from '../plans/entities';
import type { AgencyPlanQuoteDiscountSnapshot } from './agency-plan-commerce.types';
import {
  AgencyPlanBillingInterval,
  AgencyPlanPromotionApplicationTiming,
  AgencyPlanPromotionDiscountType,
  AgencyPlanPromotionReservationStatus,
  AgencyPlanPromotionStatus,
  AgencyPlanPromotionTargetRules,
  AgencyPlanPromotionTargetScope,
  AgencyPlanQuoteStatus,
} from './agency-plan-commerce.types';
import {
  AgencyPlanPromotionCampaign,
  AgencyPlanPromotionCode,
  AgencyPlanPromotionRedemption,
  AgencyPlanPromotionReservation,
  AgencyPlanQuote,
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

    if (
      input.promotionCode?.trim() &&
      !discounts.some((discount) => discount.sourceType === 'promotion_code')
    ) {
      throw new BadRequestException(
        'Kod promocyjny jest nieprawidłowy lub niedostępny dla tego planu',
      );
    }

    if (!discounts.length) return [];
    if (discounts.every((discount) => discount.isCombinable)) {
      return discounts.map(toQuoteDiscountSnapshot);
    }

    const bestDiscount = discounts.reduce((best, discount) =>
      discount.grossAmount > best.grossAmount ? discount : best,
    );
    return [toQuoteDiscountSnapshot(bestDiscount)];
  }

  async reserveDiscountsForQuote(
    manager: EntityManager,
    quote: AgencyPlanQuote,
    now = new Date(),
  ): Promise<AgencyPlanPromotionReservation[]> {
    const discounts = quote.pricingSnapshot.discounts.filter(
      (discount) =>
        discount.grossAmount > 0 &&
        (discount.sourceType === 'campaign' ||
          discount.sourceType === 'promotion_code'),
    );
    if (!discounts.length) return [];

    const existingReservations = await manager.find(
      AgencyPlanPromotionReservation,
      {
        where: {
          quoteId: quote.id,
          status: In([
            AgencyPlanPromotionReservationStatus.RESERVED,
            AgencyPlanPromotionReservationStatus.APPLIED,
          ]),
        },
      },
    );
    if (existingReservations.length) return existingReservations;

    const reservations: AgencyPlanPromotionReservation[] = [];
    for (const discount of discounts) {
      const source = await this.lockDiscountSource(manager, discount, now);
      await this.assertUsageAvailableForReservation(
        manager,
        source.campaign,
        source.code,
        quote.agencyId ?? null,
      );

      source.campaign.usageCount += 1;
      await manager.save(AgencyPlanPromotionCampaign, source.campaign);
      if (source.code) {
        source.code.usageCount += 1;
        await manager.save(AgencyPlanPromotionCode, source.code);
      }

      reservations.push(
        manager.create(AgencyPlanPromotionReservation, {
          quoteId: quote.id,
          campaignId: source.campaign.id,
          codeId: source.code?.id ?? null,
          agencyId: quote.agencyId ?? null,
          status: AgencyPlanPromotionReservationStatus.RESERVED,
          discountGrossAmount: discount.grossAmount,
          durationBillingCycles: discount.durationBillingCycles,
          applicationTiming: discount.applicationTiming,
          reservedAt: now,
          expiresAt: quote.expiresAt,
          releasedAt: null,
          appliedAt: null,
          metadata: {
            sourceType: discount.sourceType,
            sourceReference: discount.sourceReference,
            label: discount.label,
            quoteId: quote.id,
            quoteExpiresAt: quote.expiresAt.toISOString(),
          },
        }),
      );
    }

    quote.status = AgencyPlanQuoteStatus.RESERVED;
    await manager.save(AgencyPlanQuote, quote);
    return manager.save(AgencyPlanPromotionReservation, reservations);
  }

  async applyReservedDiscountsForQuote(
    manager: EntityManager,
    quote: AgencyPlanQuote,
    appliedAt = new Date(),
    billingEventId?: string | null,
  ): Promise<AgencyPlanPromotionRedemption[]> {
    const reservations = await manager.find(AgencyPlanPromotionReservation, {
      where: {
        quoteId: quote.id,
        status: AgencyPlanPromotionReservationStatus.RESERVED,
      },
      lock: { mode: 'pessimistic_write' },
    });
    if (!reservations.length) return [];

    const redemptions = reservations.map((reservation) =>
      manager.create(AgencyPlanPromotionRedemption, {
        agencyId: quote.agencyId ?? reservation.agencyId ?? null,
        quoteId: quote.id,
        campaignId: reservation.campaignId,
        codeId: reservation.codeId ?? null,
        reservationId: reservation.id,
        planCode: quote.planCode,
        billingInterval: quote.billingInterval,
        currency: quote.currency,
        subtotalGrossAmount: quote.subtotalGrossAmount,
        discountGrossAmount: reservation.discountGrossAmount,
        totalGrossAmount: quote.totalGrossAmount,
        durationBillingCycles: reservation.durationBillingCycles,
        applicationTiming: reservation.applicationTiming,
        sourceType: reservation.codeId ? 'promotion_code' : 'campaign',
        pricingSnapshot: {
          quote: quote.pricingSnapshot,
          reservation: reservation.metadata,
        },
        billingEventId: billingEventId ?? null,
      }),
    );

    reservations.forEach((reservation) => {
      reservation.status = AgencyPlanPromotionReservationStatus.APPLIED;
      reservation.appliedAt = appliedAt;
    });
    quote.status = AgencyPlanQuoteStatus.APPLIED;
    await manager.save(AgencyPlanPromotionReservation, reservations);
    await manager.save(AgencyPlanQuote, quote);
    return manager.save(AgencyPlanPromotionRedemption, redemptions);
  }

  async releaseReservationsForQuotes(
    manager: EntityManager,
    quotes: readonly AgencyPlanQuote[],
    releasedAt = new Date(),
  ): Promise<number> {
    const quoteIds = quotes.map((quote) => quote.id).filter(Boolean);
    if (!quoteIds.length) return 0;

    const reservations = await manager.find(AgencyPlanPromotionReservation, {
      where: {
        quoteId: In(quoteIds),
        status: AgencyPlanPromotionReservationStatus.RESERVED,
      },
      lock: { mode: 'pessimistic_write' },
    });
    if (!reservations.length) return 0;

    await this.decrementUsageCounts(manager, reservations);
    reservations.forEach((reservation) => {
      reservation.status = AgencyPlanPromotionReservationStatus.RELEASED;
      reservation.releasedAt = releasedAt;
    });
    await manager.save(AgencyPlanPromotionReservation, reservations);
    for (const quote of quotes) {
      quote.status = AgencyPlanQuoteStatus.CANCELLED;
      await manager.save(AgencyPlanQuote, quote);
    }
    return reservations.length;
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

  private async lockDiscountSource(
    manager: EntityManager,
    discount: AgencyPlanQuoteDiscountSnapshot,
    now: Date,
  ): Promise<{
    campaign: AgencyPlanPromotionCampaign;
    code?: AgencyPlanPromotionCode;
  }> {
    if (discount.sourceType === 'campaign') {
      const campaign = await manager.findOne(AgencyPlanPromotionCampaign, {
        where: { id: discount.sourceReference },
        lock: { mode: 'pessimistic_write' },
      });
      const availableCampaign = campaign ?? undefined;
      if (!isCampaignAvailable(availableCampaign, now)) {
        throw new ConflictException('Promocja nie jest już dostępna');
      }
      return { campaign: availableCampaign };
    }

    if (discount.sourceType === 'promotion_code') {
      const code = await manager.findOne(AgencyPlanPromotionCode, {
        where: { id: discount.sourceReference },
        lock: { mode: 'pessimistic_write' },
      });
      if (!isCodeAvailable(code, now)) {
        throw new ConflictException('Kod promocyjny nie jest już dostępny');
      }
      const campaign = await manager.findOne(AgencyPlanPromotionCampaign, {
        where: { id: code.campaignId },
        lock: { mode: 'pessimistic_write' },
      });
      const availableCampaign = campaign ?? undefined;
      if (!isCampaignAvailable(availableCampaign, now)) {
        throw new ConflictException('Kod promocyjny nie jest już dostępny');
      }
      return { campaign: availableCampaign, code };
    }

    throw new ConflictException('Ten typ rabatu nie obsługuje rezerwacji');
  }

  private async assertUsageAvailableForReservation(
    manager: EntityManager,
    campaign: AgencyPlanPromotionCampaign,
    code: AgencyPlanPromotionCode | undefined,
    agencyId: string | null,
  ): Promise<void> {
    if (!isUsageAvailable(campaign, code)) {
      throw new ConflictException('Limit użyć promocji został wyczerpany');
    }

    if (!agencyId) return;

    if (campaign.usageLimitPerAccount) {
      const campaignUsage = await this.countReservedOrRedeemedForAgency(
        manager,
        { campaignId: campaign.id, agencyId },
      );
      if (campaignUsage >= campaign.usageLimitPerAccount) {
        throw new ConflictException(
          'Limit użyć promocji dla tego konta został wyczerpany',
        );
      }
    }

    if (code?.usageLimitPerAccount) {
      const codeUsage = await this.countReservedOrRedeemedForAgency(manager, {
        codeId: code.id,
        agencyId,
      });
      if (codeUsage >= code.usageLimitPerAccount) {
        throw new ConflictException(
          'Limit użyć kodu dla tego konta został wyczerpany',
        );
      }
    }
  }

  private async countReservedOrRedeemedForAgency(
    manager: EntityManager,
    input: {
      campaignId?: string;
      codeId?: string;
      agencyId: string;
    },
  ): Promise<number> {
    const reservationCount = await manager.count(AgencyPlanPromotionReservation, {
      where: {
        ...(input.campaignId ? { campaignId: input.campaignId } : {}),
        ...(input.codeId ? { codeId: input.codeId } : {}),
        agencyId: input.agencyId,
        status: AgencyPlanPromotionReservationStatus.RESERVED,
      },
    });
    const redemptionCount = await manager.count(AgencyPlanPromotionRedemption, {
      where: {
        ...(input.campaignId ? { campaignId: input.campaignId } : {}),
        ...(input.codeId ? { codeId: input.codeId } : {}),
        agencyId: input.agencyId,
      },
    });
    return reservationCount + redemptionCount;
  }

  private async decrementUsageCounts(
    manager: EntityManager,
    reservations: readonly AgencyPlanPromotionReservation[],
  ): Promise<void> {
    for (const reservation of reservations) {
      const campaign = await manager.findOne(AgencyPlanPromotionCampaign, {
        where: { id: reservation.campaignId },
        lock: { mode: 'pessimistic_write' },
      });
      if (campaign && campaign.usageCount > 0) {
        campaign.usageCount -= 1;
        await manager.save(AgencyPlanPromotionCampaign, campaign);
      }
      if (!reservation.codeId) continue;

      const code = await manager.findOne(AgencyPlanPromotionCode, {
        where: { id: reservation.codeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (code && code.usageCount > 0) {
        code.usageCount -= 1;
        await manager.save(AgencyPlanPromotionCode, code);
      }
    }
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
  return isCodeAvailable(candidate.code, now);
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

function isCodeAvailable(
  code: AgencyPlanPromotionCode | null | undefined,
  now: Date,
): code is AgencyPlanPromotionCode {
  if (!code) return false;
  if (code.status !== AgencyPlanPromotionStatus.ACTIVE) return false;
  if (code.archivedAt) return false;
  if (code.startsAt && code.startsAt > now) return false;
  if (code.endsAt && code.endsAt <= now) return false;
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
