import type {
  ListingOrderStatus,
  ListingPaymentAttemptStatus,
} from '../listing-commerce.types';
import type {
  ListingQuoteContract,
  ListingQuoteItemContract,
} from './listing-quote.contract';

export interface ListingOrderItemContract extends ListingQuoteItemContract {
  id: string;
  productId: string;
}

export interface ListingOrderContract {
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
  pricingSnapshot: ListingQuoteContract;
  items: ListingOrderItemContract[];
  paymentAttempts: ListingPaymentAttemptContract[];
  createdAt: string;
}

export interface ListingPaymentAttemptContract {
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

export interface ListingOrderFulfillmentContract {
  orderId: string;
  entitlementIds: string[];
  alreadyFulfilled: boolean;
}
