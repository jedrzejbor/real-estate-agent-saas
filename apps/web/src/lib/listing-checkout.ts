import { apiFetch } from './api-client';
import type { ListingProductType } from './listing-products';

export type ListingEntitlementType = 'publication' | 'featured';
export type ListingEntitlementStatus = 'scheduled' | 'active';

export interface ListingEntitlement {
  id: string;
  type: ListingEntitlementType;
  status: ListingEntitlementStatus;
  tier: string | null;
  sourceType: 'order_item' | 'admin_grant' | 'migration';
  startsAt: string;
  endsAt: string;
}

export type ListingOrderStatus =
  | 'draft'
  | 'pending_payment'
  | 'paid'
  | 'payment_failed'
  | 'expired'
  | 'cancelled'
  | 'partially_refunded'
  | 'refunded';

export type ListingPaymentAttemptStatus =
  | 'creating'
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'expired'
  | 'cancelled';

export interface ListingCheckoutItemInput {
  productCode: string;
  quantity: 1;
}

export interface ListingQuoteItem {
  productCode: string;
  productName: string;
  productType: ListingProductType;
  quantity: number;
  unitGrossAmount: number;
  subtotalGrossAmount: number;
  discountGrossAmount: number;
  totalGrossAmount: number;
  vatRateBasisPoints: number | null;
  vatGrossAmount: number | null;
  durationDays: number;
  fulfillmentParameters: Record<string, unknown>;
}

export interface ListingQuote {
  listingId: string;
  currency: string;
  quotedAt: string;
  expiresAt: string;
  items: ListingQuoteItem[];
  discounts: Array<Record<string, unknown>>;
  subtotalGrossAmount: number;
  discountGrossAmount: number;
  totalGrossAmount: number;
  vatGrossAmount: number | null;
}

export interface ListingPaymentAttempt {
  id: string;
  attemptNumber: number;
  status: ListingPaymentAttemptStatus;
  amountGross: number;
  currency: string;
  failureCode: string | null;
  expiresAt: string;
  startedAt: string;
  completedAt: string | null;
}

export interface ListingOrderItem extends ListingQuoteItem {
  id: string;
  productId: string;
}

export interface ListingOrder {
  id: string;
  orderNumber: string;
  listingId: string;
  status: ListingOrderStatus;
  currency: string;
  subtotalGrossAmount: number;
  discountGrossAmount: number;
  totalGrossAmount: number;
  vatGrossAmount: number | null;
  quoteExpiresAt: string;
  paidAt: string | null;
  requiresPayment: boolean;
  canRetryPayment: boolean;
  pricingSnapshot: ListingQuote;
  items: ListingOrderItem[];
  paymentAttempts: ListingPaymentAttempt[];
  createdAt: string;
}

export interface ListingCheckoutSession {
  orderId: string;
  orderStatus: ListingOrderStatus;
  paymentAttemptId: string;
  attemptNumber: number;
  provider: string;
  sessionId: string;
  checkoutUrl: string;
  expiresAt: string | null;
}

export interface ListingOrderBuyerInput {
  countryCode: 'PL';
  buyerType: 'consumer';
  fullName?: string;
}

export function createListingQuote(
  listingId: string,
  items: ListingCheckoutItemInput[],
): Promise<ListingQuote> {
  return apiFetch<ListingQuote>('/listing-checkout/quote', {
    method: 'POST',
    body: { listingId, items },
  });
}

export function createListingOrder(
  listingId: string,
  items: ListingCheckoutItemInput[],
  buyer: ListingOrderBuyerInput,
  idempotencyKey: string,
): Promise<ListingOrder> {
  return apiFetch<ListingOrder>('/listing-checkout/orders', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: { listingId, items, buyer },
  });
}

export function fetchListingOrder(orderId: string): Promise<ListingOrder> {
  return apiFetch<ListingOrder>(
    `/listing-orders/${encodeURIComponent(orderId)}`,
  );
}

export function fetchListingOrdersForListing(
  listingId: string,
): Promise<ListingOrder[]> {
  return apiFetch<ListingOrder[]>(
    `/listing-orders/by-listing/${encodeURIComponent(listingId)}`,
  );
}

export function fetchListingEntitlementsForListing(
  listingId: string,
): Promise<ListingEntitlement[]> {
  return apiFetch<ListingEntitlement[]>(
    `/listing-entitlements/by-listing/${encodeURIComponent(listingId)}`,
  );
}

export function createListingCheckoutSession(
  orderId: string,
): Promise<ListingCheckoutSession> {
  return apiFetch<ListingCheckoutSession>(
    `/listing-orders/${encodeURIComponent(orderId)}/checkout-session`,
    { method: 'POST' },
  );
}

export function isStripeCheckoutUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'checkout.stripe.com' ||
        url.hostname.endsWith('.stripe.com'))
    );
  } catch {
    return false;
  }
}

export function findCurrentPayableOrder(
  orders: ListingOrder[],
): ListingOrder | null {
  return (
    orders.find((order) =>
      ['draft', 'pending_payment', 'payment_failed'].includes(order.status),
    ) ?? null
  );
}

export function isListingOrderPaid(order: ListingOrder): boolean {
  return ['paid', 'partially_refunded', 'refunded'].includes(order.status);
}

export function canStartListingCheckout(order: ListingOrder): boolean {
  return (
    order.status === 'draft' ||
    order.status === 'pending_payment' ||
    (order.status === 'payment_failed' && order.canRetryPayment)
  );
}
