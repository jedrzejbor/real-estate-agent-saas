import { ConflictException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DataSource, EntityManager, In } from 'typeorm';
import {
  canTransitionPaymentStatus,
  newPaymentId,
  toPaymentAmountMinor,
  type PaymentId,
} from '../domain/payment.types';
import { Payment } from '../infrastructure/typeorm/payment.entity';
import { PaymentEvent } from '../infrastructure/typeorm/payment-event.entity';
import { Refund } from '../infrastructure/typeorm/refund.entity';
import type {
  CreatePaymentResult,
  RefundGateway,
  VerifiedProviderPaymentStatus,
} from '../ports/payment-gateway.port';

const ACTIVE_LISTING_PAYMENT_STATUSES = ['created', 'pending', 'unknown'] as const;

export interface RequestRefundInput {
  paymentId: PaymentId;
  actorUserId?: string;
  intentKey: string;
  kind: 'full' | 'partial';
  amountMinor: number;
}

export interface PrepareListingPaymentInput {
  orderId: string;
  buyerUserId: string;
  attemptId: string;
  attemptNumber: number;
  amountMinor: number;
  currency: string;
  provider: string;
}

/** Safe fields extracted only after provider signature verification. */
export interface VerifiedPaymentNotification {
  provider: string;
  eventType: 'transaction';
  providerReference: string;
  providerStatus: 'pending' | 'confirmed' | 'failed' | 'refunded';
  merchantReference: string;
  correlationReference: string | null;
  amountMinor: number | null;
  paidMinor: number | null;
  currency: string | null;
}

@Injectable()
export class PaymentService {
  /** Reserve funds and a unique intent before any provider POST. No public caller is wired yet. */
  async requestRefund(
    dataSource: DataSource,
    gateway: RefundGateway,
    input: RequestRefundInput,
  ): Promise<Refund> {
    const amountMinor = toPaymentAmountMinor(input.amountMinor);
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(input.intentKey) ||
        (input.kind !== 'full' && input.kind !== 'partial')) {
      throw new ConflictException('Nieprawidłowa intencja zwrotu');
    }

    const prepared = await dataSource.transaction(async (manager) => {
      const payment = await this.lockPayment(manager, input.paymentId);
      if (!payment.providerTransactionId || payment.currency !== 'PLN' ||
          !['confirmed', 'partially_refunded'].includes(payment.status)) {
        throw new ConflictException('Płatność nie jest gotowa do zwrotu');
      }
      const existing = await manager.findOne(Refund, {
        where: { paymentId: payment.id, intentKey: input.intentKey },
      });
      if (existing) {
        if (existing.amountMinor !== amountMinor || existing.kind !== input.kind) {
          throw new ConflictException('Intencja zwrotu ma inne parametry');
        }
        return { refund: existing, shouldSend: false };
      }
      const refunds = await manager.find(Refund, { where: { paymentId: payment.id } });
      if (refunds.some((refund) => refund.status === 'requesting' || refund.status === 'unknown')) {
        throw new ConflictException('Wynik wcześniejszego zwrotu wymaga uzgodnienia');
      }
      const reserved = refunds.filter((refund) => refund.status !== 'failed')
        .reduce((sum, refund) => sum + refund.amountMinor, 0);
      if (input.kind === 'full' && (refunds.length > 0 || amountMinor !== payment.amountMinor)) {
        throw new ConflictException('Pełny zwrot wymaga całej płatności bez wcześniejszych zwrotów');
      }
      if (reserved + amountMinor > payment.amountMinor) {
        throw new ConflictException('Kwota zwrotów przekracza płatność');
      }
      const refund = await manager.save(Refund, manager.create(Refund, {
        paymentId: payment.id,
        requestedByUserId: input.actorUserId ?? null,
        intentKey: input.intentKey,
        kind: input.kind,
        amountMinor,
        currency: 'PLN',
        provider: payment.provider,
        providerTransactionId: payment.providerTransactionId,
        providerRefundId: null,
        status: 'requesting',
        confirmedAt: null,
      }));
      return { refund, shouldSend: true };
    });
    if (!prepared.shouldSend) return prepared.refund;

    // A crash after commit leaves 'requesting' unresolved; restart never repeats the POST.
    let outcome: Awaited<ReturnType<RefundGateway['refundPayment']>>;
    try {
      outcome = await gateway.refundPayment({
        paymentId: input.paymentId,
        providerTransactionId: prepared.refund.providerTransactionId,
        kind: input.kind,
        amountMinor,
        currency: 'PLN',
      });
    } catch {
      outcome = { status: 'unknown', providerRefundId: null };
    }
    return dataSource.transaction(async (manager) => {
      const refund = await this.lockRefund(manager, prepared.refund.id);
      if (refund.status !== 'requesting') return refund;
      refund.providerRefundId = outcome.providerRefundId;
      // POST acceptance alone never confirms that funds reached the payer.
      refund.status = outcome.status === 'failed' ? 'failed'
        : outcome.status === 'pending' ? 'pending' : 'unknown';
      return manager.save(Refund, refund);
    });
  }

  /** Reconcile a known provider refund ID; unknown/mismatched reads change nothing. */
  async reconcileRefund(
    dataSource: DataSource,
    gateway: RefundGateway,
    refundId: string,
  ): Promise<Refund> {
    const current = await dataSource.getRepository(Refund).findOneByOrFail({ id: refundId });
    if (!current.providerRefundId || current.status === 'confirmed' || current.status === 'failed') {
      return current;
    }
    const status = await gateway.getRefundStatus(current.providerRefundId);
    const resolved = await dataSource.transaction(async (manager) => {
      const refund = await this.lockRefund(manager, refundId);
      if (refund.status === 'confirmed' || refund.status === 'failed' ||
          status.status === 'unknown' ||
          status.providerRefundId !== refund.providerRefundId ||
          status.amountMinor !== refund.amountMinor || status.currency !== refund.currency) return refund;
      if (status.status === 'confirmed') {
        refund.status = 'confirmed';
        refund.confirmedAt = new Date();
      } else if (status.status === 'failed') {
        refund.status = 'failed';
      } else {
        refund.status = 'pending';
      }
      return manager.save(Refund, refund);
    });
    if (status.status !== 'unknown' && resolved.status !== 'unknown' &&
        status.providerRefundId === resolved.providerRefundId &&
        status.amountMinor === resolved.amountMinor && status.currency === resolved.currency) {
      gateway.releaseRefundUncertainty?.(resolved.paymentId);
    }
    return resolved;
  }

  private async lockRefund(manager: EntityManager, refundId: string): Promise<Refund> {
    if (!manager.queryRunner?.isTransactionActive) throw new Error('Refund update requires a transaction');
    const refund = await manager.findOne(Refund, {
      where: { id: refundId }, lock: { mode: 'pessimistic_write' },
    });
    if (!refund) throw new ConflictException('Zwrot nie istnieje');
    return refund;
  }

  /** Persist the verified receipt; callers must complete required effects before commit. */
  async recordVerifiedNotification(
    manager: EntityManager,
    input: VerifiedPaymentNotification,
  ): Promise<'recorded' | 'duplicate'> {
    if (!manager.queryRunner?.isTransactionActive) {
      throw new Error('Payment event recording requires a transaction');
    }
    if (
      !input.provider.trim() || !input.providerReference.trim() ||
      !input.merchantReference.trim() ||
      input.providerReference.length > 255 || input.merchantReference.length > 64 ||
      (input.amountMinor !== null && (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 0)) ||
      (input.paidMinor !== null && (!Number.isSafeInteger(input.paidMinor) || input.paidMinor < 0))
    ) throw new ConflictException('Nieprawidłowe dane zdarzenia płatniczego');

    const eventKey = createHash('sha256').update(JSON.stringify([
      input.provider, input.eventType, input.merchantReference,
      input.providerReference, input.providerStatus, input.correlationReference,
      input.amountMinor, input.paidMinor, input.currency,
    ])).digest('hex');

    let paymentId: string | null = null;
    if (input.correlationReference && /^[0-9a-f-]{36}$/i.test(input.correlationReference)) {
      const payment = await manager.findOne(Payment, {
        where: {
          id: input.correlationReference as PaymentId,
          provider: input.provider,
          providerTitle: input.providerReference,
        },
      });
      paymentId = payment?.id ?? null;
    }

    const result = await manager.createQueryBuilder()
      .insert()
      .into(PaymentEvent)
      .values({
        provider: input.provider,
        eventKey,
        eventType: input.eventType,
        providerReference: input.providerReference,
        providerStatus: input.providerStatus,
        merchantReference: input.merchantReference,
        correlationReference: input.correlationReference,
        paymentId,
        amountMinor: input.amountMinor,
        paidMinor: input.paidMinor,
        currency: input.currency,
      })
      .orIgnore()
      .returning('id')
      .execute();
    return result.raw.length === 0 ? 'duplicate' : 'recorded';
  }

  /** A signed paid notification may confirm only the exact backend-owned listing payment. */
  async confirmListingNotification(
    manager: EntityManager,
    input: VerifiedPaymentNotification,
    expectedMerchantId: string,
    order: { id: string; totalGrossAmount: number; currency: string },
    confirmedAt = new Date(),
  ): Promise<Payment> {
    if (!manager.queryRunner?.isTransactionActive) {
      throw new Error('Listing confirmation requires a transaction');
    }
    if (!input.correlationReference || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.correlationReference)) {
      throw new ConflictException('Nieznany identyfikator płatności');
    }
    const payment = await this.lockPayment(manager, input.correlationReference as PaymentId);
    if (
      input.providerStatus !== 'confirmed' ||
      input.merchantReference !== expectedMerchantId ||
      payment.kind !== 'listing' || payment.orderId !== order.id ||
      payment.provider !== input.provider ||
      !payment.providerTransactionId || !payment.providerTitle ||
      payment.providerTitle !== input.providerReference ||
      input.amountMinor !== payment.amountMinor ||
      input.paidMinor !== payment.amountMinor ||
      input.currency !== payment.currency ||
      order.totalGrossAmount !== payment.amountMinor ||
      order.currency !== payment.currency ||
      payment.status === 'refunded' || payment.status === 'partially_refunded'
    ) {
      throw new ConflictException('Powiadomienie nie odpowiada płatności i zamówieniu');
    }
    // A late signed success for the same transaction is authoritative even if
    // the earlier local result was failed or expired.
    if (payment.status !== 'confirmed') {
      payment.status = 'confirmed';
      payment.confirmedAt = confirmedAt;
      payment.failureCode = null;
      await manager.save(Payment, payment);
    }
    return payment;
  }

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
