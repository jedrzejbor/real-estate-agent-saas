import type { ListingOrderStatus } from '../listing-commerce.types';

export interface ListingCheckoutSessionContract {
  orderId: string;
  orderStatus: ListingOrderStatus;
  provider: string;
  sessionId: string;
  checkoutUrl: string;
  expiresAt: string | null;
}
