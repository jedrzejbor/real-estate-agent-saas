import type { ListingOrderStatus } from '../listing-commerce.types';

export interface ListingCheckoutSessionContract {
  orderId: string;
  orderStatus: ListingOrderStatus;
  paymentAttemptId: string;
  attemptNumber: number;
  provider: string;
  sessionId: string;
  checkoutUrl: string;
  expiresAt: string | null;
}
