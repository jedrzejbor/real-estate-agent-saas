import { createHash } from 'node:crypto';
import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThan,
  Repository,
} from 'typeorm';
import type { ListingAppliedDiscountContract } from './contracts';
import type { ListingQuoteDiscountInput } from './listing-quote.calculator';
import {
  ListingOrder,
  ListingProductCatalog,
  ListingPromotionCampaign,
  ListingPromotionCode,
  ListingPromotionRedemption,
  ListingPromotionReservation,
} from './entities';
import {
  ListingPromotionCampaignStatus,
  ListingPromotionDiscountType,
  ListingPromotionReservationStatus,
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

  async reserveDiscountsForOrder(
    manager: EntityManager,
    order: ListingOrder,
    now = new Date(),
  ): Promise<ListingPromotionReservation[]> {
    const discounts = order.pricingSnapshot.discounts.filter(
      (discount) => discount.grossAmount > 0,
    );
    if (!discounts.length) return [];

    const reservations: ListingPromotionReservation[] = [];
    for (const discount of discounts) {
      const source = await this.lockDiscountSource(manager, discount, now);
      await this.assertUsageAvailableForReservation(
        manager,
        source.campaign,
        source.code,
        order.buyerUserId ?? null,
      );

      source.campaign.usageCount += 1;
      await manager.save(ListingPromotionCampaign, source.campaign);
      if (source.code) {
        source.code.usageCount += 1;
        await manager.save(ListingPromotionCode, source.code);
      }

      reservations.push(
        manager.create(ListingPromotionReservation, {
          campaignId: source.campaign.id,
          codeId: source.code?.id ?? null,
          orderId: order.id,
          buyerUserId: order.buyerUserId ?? null,
          status: ListingPromotionReservationStatus.RESERVED,
          currency: order.currency,
          discountGrossAmount: discount.grossAmount,
          pricingSnapshot: {
            sourceType: discount.sourceType,
            sourceReference: discount.sourceReference,
            label: discount.label,
            grossAmount: discount.grossAmount,
            orderId: order.id,
            quoteExpiresAt: order.quoteExpiresAt.toISOString(),
          },
          reservedAt: now,
          expiresAt: order.quoteExpiresAt,
          releasedAt: null,
          appliedAt: null,
        }),
      );
    }

    return manager.save(ListingPromotionReservation, reservations);
  }

  async applyReservedDiscountsForPaidOrder(
    manager: EntityManager,
    order: ListingOrder,
    appliedAt = new Date(),
  ): Promise<ListingPromotionRedemption[]> {
    const reservations = await manager.find(ListingPromotionReservation, {
      where: {
        orderId: order.id,
        status: ListingPromotionReservationStatus.RESERVED,
      },
      lock: { mode: 'pessimistic_write' },
    });
    if (!reservations.length) return [];

    const redemptions = reservations.map((reservation) =>
      manager.create(ListingPromotionRedemption, {
        campaignId: reservation.campaignId,
        codeId: reservation.codeId ?? null,
        reservationId: reservation.id,
        orderId: order.id,
        buyerUserId: order.buyerUserId ?? null,
        currency: reservation.currency,
        discountGrossAmount: reservation.discountGrossAmount,
        pricingSnapshot: reservation.pricingSnapshot,
      }),
    );

    reservations.forEach((reservation) => {
      reservation.status = ListingPromotionReservationStatus.APPLIED;
      reservation.appliedAt = appliedAt;
    });
    await manager.save(ListingPromotionReservation, reservations);
    return manager.save(ListingPromotionRedemption, redemptions);
  }

  async releaseReservationsForOrders(
    manager: EntityManager,
    orders: readonly ListingOrder[],
    releasedAt = new Date(),
  ): Promise<number> {
    const orderIds = orders.map((order) => order.id).filter(Boolean);
    if (!orderIds.length) return 0;

    const reservations = await manager.find(ListingPromotionReservation, {
      where: {
        orderId: In(orderIds),
        status: ListingPromotionReservationStatus.RESERVED,
      },
      lock: { mode: 'pessimistic_write' },
    });
    if (!reservations.length) return 0;

    await this.decrementUsageCounts(manager, reservations);
    reservations.forEach((reservation) => {
      reservation.status = ListingPromotionReservationStatus.RELEASED;
      reservation.releasedAt = releasedAt;
    });
    await manager.save(ListingPromotionReservation, reservations);
    return reservations.length;
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

  private async lockDiscountSource(
    manager: EntityManager,
    discount: ListingAppliedDiscountContract,
    now: Date,
  ): Promise<{ campaign: ListingPromotionCampaign; code?: ListingPromotionCode }> {
    if (discount.sourceType === 'campaign') {
      const campaign = await manager.findOne(ListingPromotionCampaign, {
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
      const code = await manager.findOne(ListingPromotionCode, {
        where: { id: discount.sourceReference },
        lock: { mode: 'pessimistic_write' },
      });
      if (!code || code.status !== ListingPromotionCampaignStatus.ACTIVE) {
        throw new ConflictException('Kod promocyjny nie jest już dostępny');
      }
      const campaign = await manager.findOne(ListingPromotionCampaign, {
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
    campaign: ListingPromotionCampaign,
    code: ListingPromotionCode | undefined,
    buyerUserId: string | null,
  ): Promise<void> {
    if (!isUsageAvailable(campaign, code)) {
      throw new ConflictException('Limit użyć promocji został wyczerpany');
    }

    if (!buyerUserId) return;

    if (campaign.usageLimitPerUser) {
      const campaignUsage = await this.countReservedOrRedeemedForBuyer(manager, {
        campaignId: campaign.id,
        buyerUserId,
      });
      if (campaignUsage >= campaign.usageLimitPerUser) {
        throw new ConflictException(
          'Limit użyć promocji dla tego użytkownika został wyczerpany',
        );
      }
    }

    if (code?.usageLimitPerUser) {
      const codeUsage = await this.countReservedOrRedeemedForBuyer(manager, {
        codeId: code.id,
        buyerUserId,
      });
      if (codeUsage >= code.usageLimitPerUser) {
        throw new ConflictException(
          'Limit użyć kodu dla tego użytkownika został wyczerpany',
        );
      }
    }
  }

  private async countReservedOrRedeemedForBuyer(
    manager: EntityManager,
    input: {
      campaignId?: string;
      codeId?: string;
      buyerUserId: string;
    },
  ): Promise<number> {
    const reservationCount = await manager.count(ListingPromotionReservation, {
      where: {
        ...(input.campaignId ? { campaignId: input.campaignId } : {}),
        ...(input.codeId ? { codeId: input.codeId } : {}),
        buyerUserId: input.buyerUserId,
        status: ListingPromotionReservationStatus.RESERVED,
      },
    });
    const redemptionCount = await manager.count(ListingPromotionRedemption, {
      where: {
        ...(input.campaignId ? { campaignId: input.campaignId } : {}),
        ...(input.codeId ? { codeId: input.codeId } : {}),
        buyerUserId: input.buyerUserId,
      },
    });
    return reservationCount + redemptionCount;
  }

  private async decrementUsageCounts(
    manager: EntityManager,
    reservations: readonly ListingPromotionReservation[],
  ): Promise<void> {
    for (const reservation of reservations) {
      const campaign = await manager.findOne(ListingPromotionCampaign, {
        where: { id: reservation.campaignId },
        lock: { mode: 'pessimistic_write' },
      });
      if (campaign && campaign.usageCount > 0) {
        campaign.usageCount -= 1;
        await manager.save(ListingPromotionCampaign, campaign);
      }
      if (!reservation.codeId) continue;

      const code = await manager.findOne(ListingPromotionCode, {
        where: { id: reservation.codeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (code && code.usageCount > 0) {
        code.usageCount -= 1;
        await manager.save(ListingPromotionCode, code);
      }
    }
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
