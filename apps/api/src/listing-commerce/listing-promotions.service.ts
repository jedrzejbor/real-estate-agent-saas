import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import type { ListingQuoteDiscountInput } from './listing-quote.calculator';
import {
  ListingProductCatalog,
  ListingPromotionCampaign,
  ListingPromotionCode,
} from './entities';
import {
  ListingPromotionCampaignStatus,
  ListingPromotionDiscountType,
  ListingPromotionTargetRules,
  ListingPromotionTargetScope,
} from './listing-commerce.types';

export interface ResolveListingPromotionInput {
  products: readonly ListingProductCatalog[];
  promotionCode?: string;
  now: Date;
}

interface CandidatePromotion {
  sourceType: 'campaign' | 'promotion_code';
  sourceReference: string;
  label: string;
  discountType: ListingPromotionDiscountType;
  discountValue: number;
  maxDiscountGrossAmount: number | null;
  isCombinable: boolean;
  targetScope: ListingPromotionTargetScope;
  targetRules: ListingPromotionTargetRules;
  campaign: ListingPromotionCampaign;
  code?: ListingPromotionCode;
}

interface CalculatedPromotionDiscount extends ListingQuoteDiscountInput {
  campaignId: string;
  codeId?: string;
  isCombinable: boolean;
}

@Injectable()
export class ListingPromotionsService {
  constructor(
    @InjectRepository(ListingPromotionCampaign)
    private readonly campaignRepo: Repository<ListingPromotionCampaign>,
    @InjectRepository(ListingPromotionCode)
    private readonly codeRepo: Repository<ListingPromotionCode>,
  ) {}

  async resolveDiscounts(
    input: ResolveListingPromotionInput,
  ): Promise<ListingQuoteDiscountInput[]> {
    const candidates = await this.findCandidates(input);
    const discounts = candidates
      .map((candidate) => calculateDiscount(candidate, input.products))
      .filter(
        (discount): discount is CalculatedPromotionDiscount =>
          discount !== null,
      );

    if (!discounts.length) return [];
    if (discounts.every((discount) => discount.isCombinable)) {
      return discounts.map(toQuoteDiscount);
    }

    const bestDiscount = discounts.reduce((best, discount) =>
      discount.grossAmount > best.grossAmount ? discount : best,
    );
    return [toQuoteDiscount(bestDiscount)];
  }

  private async findCandidates(
    input: ResolveListingPromotionInput,
  ): Promise<CandidatePromotion[]> {
    const [automaticCampaigns, promotionCode] = await Promise.all([
      this.findAutomaticCampaigns(input.now),
      this.findPromotionCode(input.promotionCode, input.now),
    ]);

    return [
      ...automaticCampaigns.map((campaign) => campaignToCandidate(campaign)),
      ...(promotionCode ? [codeToCandidate(promotionCode)] : []),
    ];
  }

  private findAutomaticCampaigns(
    now: Date,
  ): Promise<ListingPromotionCampaign[]> {
    return this.campaignRepo.find({
      where: [
        {
          status: ListingPromotionCampaignStatus.ACTIVE,
          isAutomatic: true,
          archivedAt: IsNull(),
          startsAt: IsNull(),
          endsAt: IsNull(),
        },
        {
          status: ListingPromotionCampaignStatus.ACTIVE,
          isAutomatic: true,
          archivedAt: IsNull(),
          startsAt: LessThanOrEqual(now),
          endsAt: IsNull(),
        },
        {
          status: ListingPromotionCampaignStatus.ACTIVE,
          isAutomatic: true,
          archivedAt: IsNull(),
          startsAt: IsNull(),
          endsAt: MoreThan(now),
        },
        {
          status: ListingPromotionCampaignStatus.ACTIVE,
          isAutomatic: true,
          archivedAt: IsNull(),
          startsAt: LessThanOrEqual(now),
          endsAt: MoreThan(now),
        },
      ],
      order: { createdAt: 'ASC' },
    });
  }

  private async findPromotionCode(
    rawCode: string | undefined,
    now: Date,
  ): Promise<ListingPromotionCode | null> {
    const codeHash = hashPromotionCode(rawCode);
    if (!codeHash) return null;

    const code = await this.codeRepo.findOne({
      where: [
        {
          codeHash,
          status: ListingPromotionCampaignStatus.ACTIVE,
          archivedAt: IsNull(),
          startsAt: IsNull(),
          endsAt: IsNull(),
        },
        {
          codeHash,
          status: ListingPromotionCampaignStatus.ACTIVE,
          archivedAt: IsNull(),
          startsAt: LessThanOrEqual(now),
          endsAt: IsNull(),
        },
        {
          codeHash,
          status: ListingPromotionCampaignStatus.ACTIVE,
          archivedAt: IsNull(),
          startsAt: IsNull(),
          endsAt: MoreThan(now),
        },
        {
          codeHash,
          status: ListingPromotionCampaignStatus.ACTIVE,
          archivedAt: IsNull(),
          startsAt: LessThanOrEqual(now),
          endsAt: MoreThan(now),
        },
      ],
      relations: ['campaign'],
    });
    if (!code || !isCampaignAvailable(code.campaign, now)) return null;
    return code;
  }
}

export function hashPromotionCode(rawCode: string | undefined): string | null {
  const normalizedCode = normalizePromotionCode(rawCode);
  if (!normalizedCode) return null;
  return createHash('sha256').update(normalizedCode).digest('hex');
}

function normalizePromotionCode(rawCode: string | undefined): string | null {
  const normalizedCode = rawCode?.trim().toUpperCase().replace(/\s+/g, '');
  return normalizedCode || null;
}

function campaignToCandidate(
  campaign: ListingPromotionCampaign,
): CandidatePromotion {
  return {
    sourceType: 'campaign',
    sourceReference: campaign.id,
    label: campaign.name,
    discountType: campaign.discountType,
    discountValue: campaign.discountValue,
    maxDiscountGrossAmount: campaign.maxDiscountGrossAmount ?? null,
    isCombinable: campaign.isCombinable,
    targetScope: campaign.targetScope,
    targetRules: campaign.targetRules ?? {},
    campaign,
  };
}

function codeToCandidate(code: ListingPromotionCode): CandidatePromotion {
  return {
    sourceType: 'promotion_code',
    sourceReference: code.id,
    label: code.label,
    discountType: code.discountType ?? code.campaign.discountType,
    discountValue: code.discountValue ?? code.campaign.discountValue,
    maxDiscountGrossAmount:
      code.maxDiscountGrossAmount ?? code.campaign.maxDiscountGrossAmount ?? null,
    isCombinable: code.isCombinable ?? code.campaign.isCombinable,
    targetScope: code.campaign.targetScope,
    targetRules: code.campaign.targetRules ?? {},
    campaign: code.campaign,
    code,
  };
}

function calculateDiscount(
  candidate: CandidatePromotion,
  products: readonly ListingProductCatalog[],
): CalculatedPromotionDiscount | null {
  if (!isUsageAvailable(candidate.campaign, candidate.code)) return null;

  const eligibleProducts = products.filter((product) =>
    matchesTarget(candidate.targetScope, candidate.targetRules, product),
  );
  const eligibleSubtotal = eligibleProducts.reduce(
    (sum, product) => sum + product.priceGrossAmount,
    0,
  );
  if (eligibleSubtotal <= 0) return null;
  const minimumSubtotal = candidate.targetRules.minimumSubtotalGrossAmount;
  if (
    typeof minimumSubtotal === 'number' &&
    Number.isSafeInteger(minimumSubtotal) &&
    minimumSubtotal > 0 &&
    eligibleSubtotal < minimumSubtotal
  ) {
    return null;
  }

  const grossAmount = clampDiscount(
    candidate.discountType === ListingPromotionDiscountType.PERCENTAGE
      ? Math.floor((eligibleSubtotal * candidate.discountValue) / 10_000)
      : candidate.discountValue,
    eligibleSubtotal,
    candidate.maxDiscountGrossAmount,
  );
  if (grossAmount <= 0) return null;

  return {
    sourceType: candidate.sourceType,
    sourceReference: candidate.sourceReference,
    label: candidate.label,
    grossAmount,
    productCodes: eligibleProducts.map((product) => product.code),
    campaignId: candidate.campaign.id,
    codeId: candidate.code?.id,
    isCombinable: candidate.isCombinable,
  };
}

function isUsageAvailable(
  campaign: ListingPromotionCampaign,
  code?: ListingPromotionCode,
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

function isCampaignAvailable(
  campaign: ListingPromotionCampaign | undefined,
  now: Date,
): campaign is ListingPromotionCampaign {
  if (!campaign) return false;
  if (campaign.status !== ListingPromotionCampaignStatus.ACTIVE) return false;
  if (campaign.archivedAt) return false;
  if (campaign.startsAt && campaign.startsAt.getTime() > now.getTime()) {
    return false;
  }
  if (campaign.endsAt && campaign.endsAt.getTime() <= now.getTime()) {
    return false;
  }
  return true;
}

function matchesTarget(
  scope: ListingPromotionTargetScope,
  rules: ListingPromotionTargetRules,
  product: ListingProductCatalog,
): boolean {
  if (scope === ListingPromotionTargetScope.ALL_PRODUCTS) return true;
  if (scope === ListingPromotionTargetScope.PRODUCT_TYPES) {
    return rules.productTypes?.includes(product.type) ?? false;
  }
  if (scope === ListingPromotionTargetScope.PRODUCT_CODES) {
    return rules.productCodes?.includes(product.code) ?? false;
  }
  return false;
}

function clampDiscount(
  grossAmount: number,
  eligibleSubtotal: number,
  maxDiscountGrossAmount: number | null,
): number {
  const cappedByMax =
    maxDiscountGrossAmount && maxDiscountGrossAmount > 0
      ? Math.min(grossAmount, maxDiscountGrossAmount)
      : grossAmount;
  return Math.min(cappedByMax, eligibleSubtotal);
}

function toQuoteDiscount(
  discount: CalculatedPromotionDiscount,
): ListingQuoteDiscountInput {
  return {
    sourceType: discount.sourceType,
    sourceReference: discount.sourceReference,
    label: discount.label,
    grossAmount: discount.grossAmount,
    productCodes: discount.productCodes,
  };
}
