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

export interface ListingProductFulfillmentParameters {
  durationDays?: number;
  featuredTier?: string;
  priorityWeight?: number;
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
