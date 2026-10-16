import { Injectable } from '@nestjs/common';
import { toPaymentAmountMinor } from '../../domain/payment.types';
import {
  CreatePaymentRequest,
  CreatePaymentResult,
  PaymentGateway,
  ProviderRefundResult,
  RefundPaymentRequest,
  VerifiedProviderPaymentStatus,
} from '../../ports/payment-gateway.port';
import { TpayApiClient } from './tpay-api.client';

/** Infrastructure mapping only. The application layer owns persistence and entitlements. */
@Injectable()
export class TpayPaymentAdapter implements PaymentGateway {
  constructor(private readonly client: TpayApiClient) {}

  async createPayment(input: CreatePaymentRequest): Promise<CreatePaymentResult> {
    toPaymentAmountMinor(input.amountMinor);
    if (input.currency !== 'PLN') throw new Error('Only PLN payments are supported');

    try {
      const result = await this.client.createTransaction({
        amountMinor: input.amountMinor,
        description: input.description,
        hiddenDescription: input.paymentId,
        payer: { email: input.buyerEmail, name: input.buyerName },
        callbacks: {
          notificationUrl: input.notificationUrl,
          successUrl: input.returnUrls.success,
          errorUrl: input.returnUrls.failure,
        },
      });
      if (result.status === 'pending') {
        return {
          status: 'pending',
          providerTransactionId: result.transactionId,
          providerTitle: result.title,
          redirectUrl: result.transactionPaymentUrl,
        };
      }
      if (result.status === 'rejected') {
        return { status: 'rejected', httpStatus: result.httpStatus };
      }
      return { status: 'unknown', reason: result.reason };
    } catch {
      // OAuth/network errors must not expose request details or invite an automatic POST retry.
      return { status: 'unknown', reason: 'provider_error' };
    }
  }

  async getPaymentStatus(providerTransactionId: string): Promise<VerifiedProviderPaymentStatus> {
    try {
      const details = await this.client.getTransactionDetails(providerTransactionId);
      if (
        details.status === 'unknown' ||
        details.currency !== 'PLN' ||
        details.amountMinor === null
      ) {
        return { providerTransactionId, status: 'unknown' };
      }
      return {
        providerTransactionId,
        status: details.status,
        amountMinor: toPaymentAmountMinor(details.amountMinor),
        currency: 'PLN',
      };
    } catch {
      return { providerTransactionId, status: 'unknown' };
    }
  }

  async refundPayment(_input: RefundPaymentRequest): Promise<ProviderRefundResult> {
    throw new Error('Tpay refunds are not implemented in PAY-022');
  }
}
