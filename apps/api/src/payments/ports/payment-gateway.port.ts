import type {
  PaymentAmountMinor,
  PaymentCurrency,
  PaymentId,
} from '../domain/payment.types';

export const PAYMENT_GATEWAY = Symbol('payments.paymentGateway');

export interface PaymentReturnUrls {
  readonly success: string;
  readonly failure: string;
}

export interface CreatePaymentRequest {
  readonly paymentId: PaymentId;
  readonly amountMinor: PaymentAmountMinor;
  readonly currency: PaymentCurrency;
  readonly description: string;
  readonly buyerEmail: string;
  readonly buyerName: string;
  readonly notificationUrl: string;
  readonly returnUrls: PaymentReturnUrls;
}

export type CreatePaymentResult =
  | {
      readonly status: 'pending';
      readonly providerTransactionId: string;
      readonly providerTitle: string;
      readonly redirectUrl: string;
    }
  | { readonly status: 'rejected'; readonly httpStatus: number }
  | {
      readonly status: 'unknown';
      readonly reason: 'timeout' | 'network' | 'provider_error' | 'invalid_response';
    };

export type VerifiedProviderPaymentStatus =
  | {
      readonly providerTransactionId: string;
      readonly status: 'pending' | 'confirmed' | 'failed';
      readonly amountMinor: PaymentAmountMinor;
      readonly currency: PaymentCurrency;
    }
  | {
      readonly providerTransactionId: string;
      readonly status: 'unknown';
    };

export interface RefundPaymentRequest {
  readonly paymentId: PaymentId;
  readonly amountMinor: PaymentAmountMinor;
  readonly currency: PaymentCurrency;
}

export interface ProviderRefundResult {
  readonly providerRefundId: string | null;
  readonly status: 'pending' | 'confirmed' | 'failed' | 'unknown';
}

/** One-time payment, verification and refund only. */
export interface PaymentGateway {
  createPayment(input: CreatePaymentRequest): Promise<CreatePaymentResult>;
  getPaymentStatus(providerTransactionId: string): Promise<VerifiedProviderPaymentStatus>;
  refundPayment(input: RefundPaymentRequest): Promise<ProviderRefundResult>;
}
