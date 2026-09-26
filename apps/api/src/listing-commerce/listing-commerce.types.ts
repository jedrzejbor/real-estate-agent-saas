/**
 * Domain vocabulary for one-off listing products and purchases.
 *
 * Keep these types provider-agnostic. Stripe-specific event and session names
 * belong in a payment adapter, not in the commerce domain.
 */
export enum ListingProductType {
  PUBLICATION = 'publication',
  RENEWAL = 'renewal',
  FEATURED = 'featured',
}

export enum ListingOrderStatus {
  DRAFT = 'draft',
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  PAYMENT_FAILED = 'payment_failed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  PARTIALLY_REFUNDED = 'partially_refunded',
  REFUNDED = 'refunded',
}

export enum ListingEntitlementType {
  PUBLICATION = 'publication',
  FEATURED = 'featured',
}

export enum ListingEntitlementStatus {
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  CANCELLED = 'cancelled',
}

export enum ListingEntitlementSource {
  ORDER_ITEM = 'order_item',
  ADMIN_GRANT = 'admin_grant',
  MIGRATION = 'migration',
}

export enum ListingProductChangeAction {
  CREATED = 'created',
  UPDATED = 'updated',
  ARCHIVED = 'archived',
  RESTORED = 'restored',
}

export enum ListingPromotionCampaignStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

export enum ListingPromotionDiscountType {
  PERCENTAGE = 'percentage',
  FIXED_GROSS = 'fixed_gross',
}

export enum ListingPromotionTargetScope {
  ALL_PRODUCTS = 'all_products',
  PRODUCT_TYPES = 'product_types',
  PRODUCT_CODES = 'product_codes',
}

export enum ListingPromotionReservationStatus {
  RESERVED = 'reserved',
  APPLIED = 'applied',
  RELEASED = 'released',
  EXPIRED = 'expired',
}

export enum ListingPaymentEventType {
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  CHECKOUT_EXPIRED = 'checkout_expired',
}

export type ListingPaymentEventStatus = 'processed' | 'failed';

export enum ListingPaymentAttemptStatus {
  CREATING = 'creating',
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export interface ListingProductChangeValue {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface ListingProductFulfillmentParameters {
  durationDays?: number;
  featuredTier?: string;
  priorityWeight?: number;
  [key: string]: unknown;
}

export interface ListingPromotionTargetRules {
  productTypes?: ListingProductType[];
  productCodes?: string[];
  minimumSubtotalGrossAmount?: number;
  [key: string]: unknown;
}

export interface ListingOrderBuyerSnapshot {
  email: string;
  countryCode: string;
  buyerType: 'consumer' | 'business';
  fullName?: string;
  companyName?: string;
  taxId?: string;
  billingAddress?: Record<string, string | null>;
}
