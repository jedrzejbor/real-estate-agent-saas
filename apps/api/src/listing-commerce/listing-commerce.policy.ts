import {
  ListingEntitlementStatus,
  ListingEntitlementType,
  ListingOrderStatus,
  ListingProductType,
} from './listing-commerce.types';

export const LISTING_COMMERCE_CURRENCY = 'PLN';
export const LISTING_QUOTE_VALIDITY_MINUTES = 30;

const ORDER_STATUS_TRANSITIONS: Readonly<
  Record<ListingOrderStatus, ReadonlySet<ListingOrderStatus>>
> = {
  [ListingOrderStatus.DRAFT]: new Set([
    ListingOrderStatus.PENDING_PAYMENT,
    ListingOrderStatus.PAID,
    ListingOrderStatus.EXPIRED,
    ListingOrderStatus.CANCELLED,
  ]),
  [ListingOrderStatus.PENDING_PAYMENT]: new Set([
    ListingOrderStatus.PAID,
    ListingOrderStatus.PAYMENT_FAILED,
    ListingOrderStatus.EXPIRED,
    ListingOrderStatus.CANCELLED,
  ]),
  [ListingOrderStatus.PAYMENT_FAILED]: new Set([
    ListingOrderStatus.PENDING_PAYMENT,
    ListingOrderStatus.PAID,
    ListingOrderStatus.EXPIRED,
    ListingOrderStatus.CANCELLED,
  ]),
  [ListingOrderStatus.PAID]: new Set([
    ListingOrderStatus.PARTIALLY_REFUNDED,
    ListingOrderStatus.REFUNDED,
  ]),
  [ListingOrderStatus.PARTIALLY_REFUNDED]: new Set([
    ListingOrderStatus.REFUNDED,
  ]),
  // A verified late success is authoritative: never keep money without service.
  [ListingOrderStatus.EXPIRED]: new Set([ListingOrderStatus.PAID]),
  [ListingOrderStatus.CANCELLED]: new Set([ListingOrderStatus.PAID]),
  [ListingOrderStatus.REFUNDED]: new Set(),
};

const ENTITLEMENT_STATUS_TRANSITIONS: Readonly<
  Record<ListingEntitlementStatus, ReadonlySet<ListingEntitlementStatus>>
> = {
  [ListingEntitlementStatus.SCHEDULED]: new Set([
    ListingEntitlementStatus.ACTIVE,
    ListingEntitlementStatus.CANCELLED,
  ]),
  [ListingEntitlementStatus.ACTIVE]: new Set([
    ListingEntitlementStatus.EXPIRED,
    ListingEntitlementStatus.REVOKED,
  ]),
  [ListingEntitlementStatus.EXPIRED]: new Set(),
  [ListingEntitlementStatus.REVOKED]: new Set(),
  [ListingEntitlementStatus.CANCELLED]: new Set(),
};

export class InvalidListingCommerceTransitionError extends Error {
  constructor(
    readonly aggregate: 'order' | 'entitlement',
    readonly from: string,
    readonly to: string,
  ) {
    super(`Invalid ${aggregate} status transition: ${from} -> ${to}`);
    this.name = 'InvalidListingCommerceTransitionError';
  }
}

export function canTransitionListingOrderStatus(
  from: ListingOrderStatus,
  to: ListingOrderStatus,
): boolean {
  return ORDER_STATUS_TRANSITIONS[from].has(to);
}

export function assertListingOrderStatusTransition(
  from: ListingOrderStatus,
  to: ListingOrderStatus,
): void {
  if (!canTransitionListingOrderStatus(from, to)) {
    throw new InvalidListingCommerceTransitionError('order', from, to);
  }
}

export function canTransitionListingEntitlementStatus(
  from: ListingEntitlementStatus,
  to: ListingEntitlementStatus,
): boolean {
  return ENTITLEMENT_STATUS_TRANSITIONS[from].has(to);
}

export function assertListingEntitlementStatusTransition(
  from: ListingEntitlementStatus,
  to: ListingEntitlementStatus,
): void {
  if (!canTransitionListingEntitlementStatus(from, to)) {
    throw new InvalidListingCommerceTransitionError('entitlement', from, to);
  }
}

export function getEntitlementTypeForProduct(
  productType: ListingProductType,
): ListingEntitlementType {
  switch (productType) {
    case ListingProductType.PUBLICATION:
    case ListingProductType.RENEWAL:
      return ListingEntitlementType.PUBLICATION;
    case ListingProductType.FEATURED:
      return ListingEntitlementType.FEATURED;
  }
}

export function getListingQuoteExpiry(quotedAt: Date): Date {
  return new Date(
    quotedAt.getTime() + LISTING_QUOTE_VALIDITY_MINUTES * 60 * 1000,
  );
}

export interface GrossAmountLine {
  unitGrossAmount: number;
  quantity: number;
  discountGrossAmount: number;
}

export interface GrossAmountTotals {
  subtotalGrossAmount: number;
  discountGrossAmount: number;
  totalGrossAmount: number;
}

export interface ListingProductConfiguration {
  type: ListingProductType;
  priceGrossAmount: number;
  currency: string;
  vatRateBasisPoints?: number | null;
  durationDays: number;
  featuredTier?: string | null;
  priorityWeight: number;
  isPublic: boolean;
  isActive: boolean;
  archivedAt?: Date | null;
}

export function assertListingProductConfiguration(
  product: ListingProductConfiguration,
): void {
  assertNonNegativeInteger(product.priceGrossAmount, 'priceGrossAmount');
  assertPositiveInteger(product.durationDays, 'durationDays');
  assertNonNegativeInteger(product.priorityWeight, 'priorityWeight');

  if (product.currency !== LISTING_COMMERCE_CURRENCY) {
    throw new RangeError(`currency must be ${LISTING_COMMERCE_CURRENCY}`);
  }

  if (
    product.vatRateBasisPoints !== null &&
    product.vatRateBasisPoints !== undefined
  ) {
    assertNonNegativeInteger(
      product.vatRateBasisPoints,
      'vatRateBasisPoints',
    );
    if (product.vatRateBasisPoints > 10_000) {
      throw new RangeError('vatRateBasisPoints cannot exceed 10000');
    }
  }

  const featuredTier = product.featuredTier?.trim() || null;
  if (product.type === ListingProductType.FEATURED && !featuredTier) {
    throw new RangeError('featuredTier is required for featured products');
  }
  if (product.type !== ListingProductType.FEATURED && featuredTier) {
    throw new RangeError(
      'featuredTier is allowed only for featured products',
    );
  }
  if (product.isPublic && (!product.isActive || product.archivedAt)) {
    throw new RangeError('a public product must be active and not archived');
  }
}

export function buildListingProductFulfillmentParameters(
  product: Pick<
    ListingProductConfiguration,
    'durationDays' | 'featuredTier' | 'priorityWeight'
  >,
): Record<string, number | string> {
  const parameters: Record<string, number | string> = {
    durationDays: product.durationDays,
  };

  const featuredTier = product.featuredTier?.trim();
  if (featuredTier) {
    parameters.featuredTier = featuredTier;
    parameters.priorityWeight = product.priorityWeight;
  }

  return parameters;
}

/** Pure integer arithmetic used by quote and order creation. */
export function calculateGrossAmountTotals(
  lines: readonly GrossAmountLine[],
): GrossAmountTotals {
  return lines.reduce<GrossAmountTotals>(
    (totals, line) => {
      assertNonNegativeInteger(line.unitGrossAmount, 'unitGrossAmount');
      assertPositiveInteger(line.quantity, 'quantity');
      assertNonNegativeInteger(line.discountGrossAmount, 'discountGrossAmount');

      const subtotalGrossAmount = line.unitGrossAmount * line.quantity;
      if (!Number.isSafeInteger(subtotalGrossAmount)) {
        throw new RangeError('subtotalGrossAmount exceeds safe integer range');
      }
      if (line.discountGrossAmount > subtotalGrossAmount) {
        throw new RangeError(
          'discountGrossAmount cannot exceed subtotalGrossAmount',
        );
      }

      totals.subtotalGrossAmount += subtotalGrossAmount;
      totals.discountGrossAmount += line.discountGrossAmount;
      totals.totalGrossAmount +=
        subtotalGrossAmount - line.discountGrossAmount;

      if (
        !Number.isSafeInteger(totals.subtotalGrossAmount) ||
        !Number.isSafeInteger(totals.discountGrossAmount) ||
        !Number.isSafeInteger(totals.totalGrossAmount)
      ) {
        throw new RangeError('quote totals exceed safe integer range');
      }

      return totals;
    },
    {
      subtotalGrossAmount: 0,
      discountGrossAmount: 0,
      totalGrossAmount: 0,
    },
  );
}

function assertNonNegativeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}
