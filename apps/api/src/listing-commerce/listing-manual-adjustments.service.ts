import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { Listing } from '../listings/entities';
import type { AdminListingManualAdjustmentContract } from './contracts';
import { ListingManualAdjustment, ListingProductCatalog } from './entities';
import type { ListingQuoteDiscountInput } from './listing-quote.calculator';
import { toAdminListingManualAdjustment } from './listing-manual-adjustment.presenter';
import {
  ListingPromotionDiscountType,
  ListingPromotionTargetRules,
  ListingPromotionTargetScope,
} from './listing-commerce.types';

export interface CreateListingManualAdjustmentInput {
  listingId: string;
  actorUserId: string;
  label: string;
  reason: string;
  discountType: ListingPromotionDiscountType;
  discountValue: number;
  maxDiscountGrossAmount?: number | null;
  targetScope?: ListingPromotionTargetScope;
  targetRules?: ListingPromotionTargetRules;
  startsAt?: Date | null;
  endsAt: Date;
  now?: Date;
}

export interface ArchiveListingManualAdjustmentInput {
  listingId: string;
  adjustmentId: string;
  actorUserId: string;
  reason: string;
  now?: Date;
}

@Injectable()
export class ListingManualAdjustmentsService {
  constructor(
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    @InjectRepository(ListingManualAdjustment)
    private readonly adjustmentRepo: Repository<ListingManualAdjustment>,
  ) {}

  async createAdjustment(
    input: CreateListingManualAdjustmentInput,
  ): Promise<AdminListingManualAdjustmentContract> {
    const now = input.now ?? new Date();
    const listing = await this.listingRepo.findOne({
      where: { id: input.listingId },
      select: { id: true },
    });
    if (!listing) throw new NotFoundException('Ogłoszenie nie istnieje');

    const startsAt = input.startsAt ?? now;
    if (input.endsAt.getTime() <= startsAt.getTime()) {
      throw new BadRequestException('Korekta musi mieć przyszłą datę końca');
    }

    const adjustment = this.adjustmentRepo.create({
      listingId: listing.id,
      label: normalizeRequiredText(input.label, 'Nazwa korekty jest wymagana'),
      reason: normalizeReason(input.reason),
      discountType: input.discountType,
      discountValue: normalizeDiscountValue(
        input.discountType,
        input.discountValue,
      ),
      maxDiscountGrossAmount: normalizeOptionalPositiveInteger(
        input.maxDiscountGrossAmount,
        'Maksymalny rabat musi być dodatnią liczbą',
      ),
      targetScope: input.targetScope ?? ListingPromotionTargetScope.ALL_PRODUCTS,
      targetRules: input.targetRules ?? {},
      startsAt,
      endsAt: input.endsAt,
      createdByUserId: input.actorUserId,
      archivedByUserId: null,
      archivedReason: null,
      archivedAt: null,
    });
    return toAdminListingManualAdjustment(
      await this.adjustmentRepo.save(adjustment),
    );
  }

  async archiveAdjustment(
    input: ArchiveListingManualAdjustmentInput,
  ): Promise<AdminListingManualAdjustmentContract> {
    const adjustment = await this.adjustmentRepo.findOne({
      where: {
        id: input.adjustmentId,
        listingId: input.listingId,
      },
    });
    if (!adjustment) throw new NotFoundException('Korekta nie istnieje');
    if (adjustment.archivedAt) return toAdminListingManualAdjustment(adjustment);

    adjustment.archivedAt = input.now ?? new Date();
    adjustment.archivedByUserId = input.actorUserId;
    adjustment.archivedReason = normalizeReason(input.reason);
    return toAdminListingManualAdjustment(
      await this.adjustmentRepo.save(adjustment),
    );
  }

  async resolveDiscounts(input: {
    listingId: string;
    products: readonly ListingProductCatalog[];
    now: Date;
  }): Promise<ListingQuoteDiscountInput[]> {
    const adjustments = await this.findActiveAdjustments(
      input.listingId,
      input.now,
    );
    return adjustments
      .map((adjustment) => calculateAdjustmentDiscount(adjustment, input.products))
      .filter((discount): discount is ListingQuoteDiscountInput => discount !== null);
  }

  private findActiveAdjustments(
    listingId: string,
    now: Date,
  ): Promise<ListingManualAdjustment[]> {
    return this.adjustmentRepo.find({
      where: [
        {
          listingId,
          archivedAt: IsNull(),
          startsAt: LessThanOrEqual(now),
          endsAt: MoreThan(now),
        },
      ],
      order: { createdAt: 'ASC' },
    });
  }
}

function calculateAdjustmentDiscount(
  adjustment: ListingManualAdjustment,
  products: readonly ListingProductCatalog[],
): ListingQuoteDiscountInput | null {
  const eligibleProducts = products.filter((product) =>
    matchesTarget(adjustment.targetScope, adjustment.targetRules, product),
  );
  const eligibleSubtotal = eligibleProducts.reduce(
    (sum, product) => sum + product.priceGrossAmount,
    0,
  );
  if (eligibleSubtotal <= 0) return null;

  const grossAmount = clampDiscount(
    adjustment.discountType === ListingPromotionDiscountType.PERCENTAGE
      ? Math.floor((eligibleSubtotal * adjustment.discountValue) / 10_000)
      : adjustment.discountValue,
    eligibleSubtotal,
    adjustment.maxDiscountGrossAmount ?? null,
  );
  if (grossAmount <= 0) return null;

  return {
    sourceType: 'admin_adjustment',
    sourceReference: adjustment.id,
    label: adjustment.label,
    grossAmount,
    productCodes: eligibleProducts.map((product) => product.code),
  };
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

function normalizeRequiredText(value: string, message: string): string {
  const normalized = value.trim();
  if (!normalized) throw new BadRequestException(message);
  return normalized;
}

function normalizeReason(value: string): string {
  const normalized = value.trim();
  if (normalized.length < 3) {
    throw new BadRequestException('Korekta wymaga powodu audytowego');
  }
  return normalized;
}

function normalizeDiscountValue(
  discountType: ListingPromotionDiscountType,
  value: number,
): number {
  if (!Number.isInteger(value)) {
    throw new BadRequestException('Wartość rabatu musi być liczbą całkowitą');
  }
  if (
    discountType === ListingPromotionDiscountType.PERCENTAGE &&
    value >= 1 &&
    value <= 10_000
  ) {
    return value;
  }
  if (discountType === ListingPromotionDiscountType.FIXED_GROSS && value > 0) {
    return value;
  }
  throw new BadRequestException('Nieprawidłowa wartość rabatu');
}

function normalizeOptionalPositiveInteger(
  value: number | null | undefined,
  message: string,
): number | null {
  if (value === undefined || value === null) return null;
  if (!Number.isInteger(value) || value <= 0) {
    throw new BadRequestException(message);
  }
  return value;
}
