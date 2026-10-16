import { EntityManager } from 'typeorm';
import { ListingPaymentReconciliationService } from '../../listing-commerce/listing-payment-reconciliation.service';
import { ListingOrder, ListingPaymentAttempt } from '../../listing-commerce/entities';
import { ListingOrderStatus, ListingPaymentAttemptStatus } from '../../listing-commerce/listing-commerce.types';
import { toPaymentAmountMinor, type PaymentId } from '../domain/payment.types';
import { Payment } from '../infrastructure/typeorm/payment.entity';
import type { PaymentGateway } from '../ports/payment-gateway.port';
import { PaymentService } from './payment.service';

const paymentId = '7e3f58df-a746-4160-ae35-aeaf82ca6536' as PaymentId;

function payment(status: Payment['status'] = 'created'): Payment {
  return Object.assign(new Payment(), {
    id: paymentId,
    kind: 'listing',
    orderId: 'order-1',
    correlationId: 'attempt-1',
    status,
    amountMinor: toPaymentAmountMinor(4900),
    currency: 'PLN',
    provider: 'test-provider',
    providerTransactionId: null,
    providerTitle: null,
    confirmedAt: null,
    failureCode: null,
  });
}

function paymentManager(current: Payment) {
  return {
    queryRunner: { isTransactionActive: true },
    findOne: jest.fn().mockImplementation(async (entity: unknown) => entity === Payment ? current : null),
    save: jest.fn().mockImplementation(async (_entity: unknown, value: Payment) => value),
  } as unknown as EntityManager;
}

describe('PAY-024 payment outcomes', () => {
  const service = new PaymentService();

  it('persists a timeout as unknown and rejects a second creation outcome', async () => {
    const current = payment();
    const manager = paymentManager(current);
    await service.recordCreationOutcome(manager, paymentId, { status: 'unknown', reason: 'timeout' });
    expect(current.status).toBe('unknown');
    expect(current.failureCode).toBe('reconciliation_required');
    await expect(service.recordCreationOutcome(manager, paymentId, {
      status: 'pending', providerTransactionId: 'second', providerTitle: 'second', redirectUrl: 'https://example.invalid',
    })).rejects.toThrow();
    expect(manager.save).toHaveBeenCalledTimes(1);
  });

  it('records definite 4xx rejection or a verified provider failure without confirmation', async () => {
    const rejected = payment();
    await service.recordCreationOutcome(paymentManager(rejected), paymentId, { status: 'rejected', httpStatus: 400 });
    expect(rejected.status).toBe('failed');
    expect(rejected.confirmedAt).toBeNull();

    const pending = payment('pending');
    pending.providerTransactionId = 'transaction-1';
    await service.recordVerifiedProviderStatus(paymentManager(pending), paymentId, {
      status: 'failed', providerTransactionId: 'transaction-1', amountMinor: toPaymentAmountMinor(4900), currency: 'PLN',
    });
    expect(pending.status).toBe('failed');
    expect(pending.confirmedAt).toBeNull();
  });

  it('accepts late verified success once; a cancelled return or stale failure cannot undo it', async () => {
    const current = payment('unknown');
    current.providerTransactionId = 'transaction-1';
    const manager = paymentManager(current);
    const confirmed = {
      status: 'confirmed' as const, providerTransactionId: 'transaction-1', amountMinor: toPaymentAmountMinor(4900), currency: 'PLN' as const,
    };
    await service.recordVerifiedProviderStatus(manager, paymentId, confirmed);
    await service.recordVerifiedProviderStatus(manager, paymentId, confirmed);
    await service.recordVerifiedProviderStatus(manager, paymentId, { ...confirmed, status: 'failed' });
    expect(current.status).toBe('confirmed');
    expect(current.confirmedAt).toBeInstanceOf(Date);
    expect(manager.save).toHaveBeenCalledTimes(1);
  });

  it('does not confirm an unknown or mismatched status read', async () => {
    const current = payment('unknown');
    current.providerTransactionId = 'transaction-1';
    const manager = paymentManager(current);
    await service.recordVerifiedProviderStatus(manager, paymentId, { status: 'unknown', providerTransactionId: 'transaction-1' });
    await service.recordVerifiedProviderStatus(manager, paymentId, {
      status: 'confirmed', providerTransactionId: 'transaction-1', amountMinor: toPaymentAmountMinor(4901), currency: 'PLN',
    });
    await service.recordVerifiedProviderStatus(manager, paymentId, {
      status: 'confirmed', providerTransactionId: 'other', amountMinor: toPaymentAmountMinor(4900), currency: 'PLN',
    });
    expect(current.status).toBe('unknown');
    expect(manager.save).not.toHaveBeenCalled();
  });
});

describe('PAY-024 reconciliation after restart', () => {
  it('records a definite provider refusal on the attempt and order without granting access', async () => {
    const current = payment('pending');
    current.providerTransactionId = 'transaction-1';
    const order = {
      id: 'order-1', status: ListingOrderStatus.PENDING_PAYMENT,
      totalGrossAmount: 4900, currency: 'PLN', metadata: {},
    } as ListingOrder;
    const attempt = {
      id: 'attempt-1', orderId: 'order-1', status: ListingPaymentAttemptStatus.PENDING,
      amountGross: 4900, currency: 'PLN', provider: 'test-provider',
    } as ListingPaymentAttempt;
    const manager = {
      queryRunner: { isTransactionActive: true },
      findOne: jest.fn(async (entity: unknown) => entity === Payment ? current : entity === ListingOrder ? order : attempt),
      save: jest.fn(async (_entity: unknown, value: unknown) => value),
    };
    const dataSource = {
      getRepository: jest.fn((entity: unknown) => ({
        find: jest.fn().mockResolvedValue(entity === Payment ? [current] : []),
      })),
      transaction: jest.fn(async (callback: (tx: EntityManager) => Promise<unknown>) => callback(manager as unknown as EntityManager)),
      query: jest.fn().mockResolvedValue([]),
    };
    const entitlements = { fulfillPaidOrderInTransaction: jest.fn() };
    const gateway = {
      createPayment: jest.fn(),
      getPaymentStatus: jest.fn().mockResolvedValue({
        status: 'failed', providerTransactionId: 'transaction-1',
        amountMinor: toPaymentAmountMinor(4900), currency: 'PLN',
      }),
      refundPayment: jest.fn(),
    } as jest.Mocked<PaymentGateway>;
    const service = new ListingPaymentReconciliationService(
      dataSource as never, entitlements as never, {} as never, new PaymentService(), gateway,
    );

    const result = await service.reconcile(new Date('2026-10-16T10:00:00.000Z'));
    expect(result.resolvedPaymentIds).toEqual([paymentId]);
    expect(current.status).toBe('failed');
    expect(order.status).toBe(ListingOrderStatus.PAYMENT_FAILED);
    expect(attempt.status).toBe(ListingPaymentAttemptStatus.FAILED);
    expect(entitlements.fulfillPaidOrderInTransaction).not.toHaveBeenCalled();
    expect(gateway.createPayment).not.toHaveBeenCalled();
  });

  it('keeps an uncertain attempt open and resolves only after verified status, without another POST', async () => {
    const current = payment('unknown');
    current.providerTransactionId = 'transaction-1';
    const order = {
      id: 'order-1', status: ListingOrderStatus.PENDING_PAYMENT,
      totalGrossAmount: 4900, currency: 'PLN', items: [{ id: 'item-1' }],
      metadata: {},
    } as ListingOrder;
    const attempt = {
      id: 'attempt-1', orderId: 'order-1', attemptNumber: 1,
      status: ListingPaymentAttemptStatus.PENDING,
      amountGross: 4900, currency: 'PLN', provider: 'test-provider',
      expiresAt: new Date('2026-10-15T10:00:00.000Z'),
    } as ListingPaymentAttempt;
    const manager = {
      queryRunner: { isTransactionActive: true },
      findOne: jest.fn(async (entity: unknown) => {
        if (entity === Payment) return current;
        if (entity === ListingOrder) return order;
        return attempt;
      }),
      save: jest.fn(async (_entity: unknown, value: unknown) => value),
    };
    const gateway = {
      createPayment: jest.fn(),
      getPaymentStatus: jest.fn()
        .mockResolvedValueOnce({ status: 'unknown', providerTransactionId: 'transaction-1' })
        .mockResolvedValueOnce({ status: 'confirmed', providerTransactionId: 'transaction-1', amountMinor: toPaymentAmountMinor(4900), currency: 'PLN' }),
      refundPayment: jest.fn(),
    } as jest.Mocked<PaymentGateway>;
    const dataSource = {
      getRepository: jest.fn((entity: unknown) => ({
        find: jest.fn().mockResolvedValue(entity === Payment ? [current] : [attempt]),
      })),
      transaction: jest.fn(async (callback: (manager: EntityManager) => Promise<unknown>) => callback(manager as unknown as EntityManager)),
      query: jest.fn().mockResolvedValue([]),
    };
    const entitlements = {
      fulfillPaidOrder: jest.fn(),
      fulfillPaidOrderInTransaction: jest.fn().mockResolvedValue({ alreadyFulfilled: false }),
    };
    const promotions = {
      releaseReservationsForOrders: jest.fn(),
      applyReservedDiscountsForPaidOrder: jest.fn().mockResolvedValue(undefined),
    };
    const now = new Date('2026-10-16T10:00:00.000Z');

    const first = new ListingPaymentReconciliationService(
      dataSource as never, entitlements as never, promotions as never, new PaymentService(), gateway,
    );
    const firstResult = await first.reconcile(now);
    expect(firstResult.unresolvedPaymentIds).toEqual([paymentId]);
    expect(firstResult.expiredAttemptIds).toEqual([]);
    expect(current.status).toBe('unknown');

    // Simulate an old expiration committed before the delayed provider result.
    order.status = ListingOrderStatus.EXPIRED;
    attempt.status = ListingPaymentAttemptStatus.EXPIRED;

    const restarted = new ListingPaymentReconciliationService(
      dataSource as never, entitlements as never, promotions as never, new PaymentService(), gateway,
    );
    const secondResult = await restarted.reconcile(now);
    expect(secondResult.resolvedPaymentIds).toEqual([paymentId]);
    expect(current.status).toBe('confirmed');
    expect(attempt.status).toBe(ListingPaymentAttemptStatus.SUCCEEDED);
    expect(order.status).toBe(ListingOrderStatus.PAID);
    expect(gateway.createPayment).not.toHaveBeenCalled();
    expect(entitlements.fulfillPaidOrder).not.toHaveBeenCalled();
    expect(entitlements.fulfillPaidOrderInTransaction).toHaveBeenCalledTimes(1);
  });
});
