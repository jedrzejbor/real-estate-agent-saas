import { ConflictException, Injectable } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import {
  canTransitionPaymentStatus,
  newPaymentId,
  toPaymentAmountMinor,
  type PaymentId,
} from '../domain/payment.types';
import { Payment } from '../infrastructure/typeorm/payment.entity';
import type {
  CreatePaymentResult,
  VerifiedProviderPaymentStatus,
} from '../ports/payment-gateway.port';

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

  /** Save a single POST outcome. An uncertain result remains active and blocks retry. */
  async recordCreationOutcome(
    manager: EntityManager,
    paymentId: PaymentId,
    outcome: CreatePaymentResult,
  ): Promise<Payment> {
    const payment = await this.lockPayment(manager, paymentId);
    if (payment.status !== 'created') {
      throw new ConflictException('Próba utworzenia płatności została już rozstrzygnięta');
    }

    if (outcome.status === 'pending') {
      if (!outcome.providerTransactionId.trim() || !outcome.providerTitle.trim()) {
        throw new ConflictException('Operator nie zwrócił identyfikatorów płatności');
      }
      payment.status = 'pending';
      payment.providerTransactionId = outcome.providerTransactionId;
      payment.providerTitle = outcome.providerTitle;
    } else if (outcome.status === 'rejected') {
      payment.status = 'failed';
      payment.failureCode = 'provider_rejected';
    } else {
      payment.status = 'unknown';
      payment.failureCode = 'reconciliation_required';
    }
    return manager.save(Payment, payment);
  }

  /** Only an identified, amount-matched provider status can confirm a payment. */
  async recordVerifiedProviderStatus(
    manager: EntityManager,
    paymentId: PaymentId,
    result: VerifiedProviderPaymentStatus,
    confirmedAt = new Date(),
  ): Promise<Payment> {
    const payment = await this.lockPayment(manager, paymentId);
    if (
      !payment.providerTransactionId ||
      payment.providerTransactionId !== result.providerTransactionId ||
      result.status === 'unknown'
    ) {
      return payment;
    }
    if (
      result.amountMinor !== payment.amountMinor ||
      result.currency !== payment.currency
    ) {
      return payment;
    }
    // A pending read does not resolve an earlier unknown POST/GET outcome.
    if (result.status === 'pending' || payment.status === 'confirmed') {
      return payment;
    }
    if (!canTransitionPaymentStatus(payment.status, result.status)) {
      return payment;
    }
    payment.status = result.status;
    payment.failureCode = result.status === 'failed' ? 'provider_failed' : null;
    if (result.status === 'confirmed') payment.confirmedAt = confirmedAt;
    return manager.save(Payment, payment);
  }

  private async lockPayment(manager: EntityManager, paymentId: PaymentId): Promise<Payment> {
    if (!manager.queryRunner?.isTransactionActive) {
      throw new Error('Payment status update requires a transaction');
    }
    const payment = await manager.findOne(Payment, {
      where: { id: paymentId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!payment) throw new ConflictException('Płatność nie istnieje');
    return payment;
  }
}
