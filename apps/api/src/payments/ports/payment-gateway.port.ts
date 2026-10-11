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
  readonly buyerEmail: string;
  readonly returnUrls: PaymentReturnUrls;
}

export interface CreatedPayment {
  readonly providerTransactionId: string;
  readonly redirectUrl: string;
}

export interface VerifiedProviderPaymentStatus {
  readonly providerTransactionId: string;
  readonly status: 'pending' | 'confirmed' | 'failed' | 'expired' | 'unknown';
  readonly amountMinor: PaymentAmountMinor;
  readonly currency: PaymentCurrency;
}

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
  createPayment(input: CreatePaymentRequest): Promise<CreatedPayment>;
  getPaymentStatus(providerTransactionId: string): Promise<VerifiedProviderPaymentStatus>;
  refundPayment(input: RefundPaymentRequest): Promise<ProviderRefundResult>;
}
