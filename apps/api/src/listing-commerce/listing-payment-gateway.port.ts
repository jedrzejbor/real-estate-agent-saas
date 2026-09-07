export const LISTING_PAYMENT_GATEWAY = Symbol('LISTING_PAYMENT_GATEWAY');

export interface CreateListingPaymentSessionInput {
  orderId: string;
  orderNumber: string;
  paymentAttemptId: string;
  attemptNumber: number;
  buyerEmail: string;
  currency: string;
  totalGrossAmount: number;
  itemNames: string[];
  expiresAt: Date;
}

export interface CreatedListingPaymentSession {
  provider: string;
  sessionId: string;
  checkoutUrl: string;
  expiresAt: Date | null;
}

export interface ListingPaymentGateway {
  readonly provider: string;

  createCheckoutSession(
    input: CreateListingPaymentSessionInput,
  ): Promise<CreatedListingPaymentSession>;
}
