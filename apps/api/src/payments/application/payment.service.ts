import { ConflictException, Injectable } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { newPaymentId, toPaymentAmountMinor } from '../domain/payment.types';
import { Payment } from '../infrastructure/typeorm/payment.entity';

const ACTIVE_LISTING_PAYMENT_STATUSES = ['created', 'pending', 'unknown'] as const;

export interface PrepareListingPaymentInput {
  orderId: string;
  buyerUserId: string;
  attemptId: string;
  attemptNumber: number;
  amountMinor: number;
  currency: string;
  provider: string;
}

@Injectable()
export class PaymentService {
  /** The caller must hold a write lock on the listing order in this transaction. */
  async prepareListingPayment(
    manager: EntityManager,
    input: PrepareListingPaymentInput,
  ): Promise<Payment> {
    if (!manager.queryRunner?.isTransactionActive) {
      throw new Error('Listing payment preparation requires a transaction');
    }
    const amountMinor = toPaymentAmountMinor(input.amountMinor);
    if (
      input.currency !== 'PLN' ||
      !input.provider.trim() ||
      !Number.isSafeInteger(input.attemptNumber) ||
      input.attemptNumber < 1
    ) {
      throw new ConflictException('Nieprawidłowe dane płatności ogłoszenia');
    }

    const active = await manager.find(Payment, {
      where: {
        kind: 'listing',
        orderId: input.orderId,
        status: In([...ACTIVE_LISTING_PAYMENT_STATUSES]),
      },
    });
    if (active.length > 1) {
      throw new ConflictException('Zamówienie ma więcej niż jedną aktywną płatność');
    }
    const current = active[0];
    if (current) {
      if (
        current.correlationId !== input.attemptId ||
        current.attemptNo !== input.attemptNumber ||
        current.amountMinor !== amountMinor ||
        current.currency !== input.currency ||
        current.provider !== input.provider ||
        current.buyerUserId !== input.buyerUserId
      ) {
        throw new ConflictException('Zamówienie ma już aktywną próbę płatności');
      }
      return current;
    }

    return manager.save(Payment, manager.create(Payment, {
      id: newPaymentId(),
      kind: 'listing',
      orderId: input.orderId,
      quoteId: null,
      renewalId: null,
      buyerUserId: input.buyerUserId,
      agencyId: null,
      correlationId: input.attemptId,
      attemptNo: input.attemptNumber,
      amountMinor,
      currency: 'PLN',
      status: 'created',
      provider: input.provider,
      providerTransactionId: null,
      providerTitle: null,
      failureCode: null,
      confirmedAt: null,
      metadata: {},
    }));
  }
}
