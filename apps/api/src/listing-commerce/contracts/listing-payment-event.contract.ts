import type {
  ListingOrderStatus,
  ListingPaymentEventType,
} from '../listing-commerce.types';

/** Normalized only after a provider adapter has verified the webhook signature. */
export interface VerifiedListingPaymentEventContract {
  provider: string;
  eventId: string;
  eventType: ListingPaymentEventType;
  orderId: string;
  checkoutSessionId: string;
  paymentId?: string | null;
  amountGross?: number | null;
  currency?: string | null;
  occurredAt: Date;
  /** Sanitized provider metadata; never include secrets or payment instrument data. */
  payload?: Record<string, unknown>;
}

export interface ListingPaymentEventResultContract {
  status: 'processed' | 'ignored_duplicate' | 'ignored_stale';
  orderId: string;
  orderStatus: ListingOrderStatus;
}
