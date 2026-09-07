import { ListingOrder, ListingPaymentAttempt } from './entities';
import { ListingPaymentReconciliationService } from './listing-payment-reconciliation.service';
import {
  ListingOrderStatus,
  ListingPaymentAttemptStatus,
} from './listing-commerce.types';

const NOW = new Date('2026-09-07T12:00:00.000Z');

function buildService(input?: {
  candidates?: Array<Partial<ListingPaymentAttempt>>;
  order?: Partial<ListingOrder> | null;
  attempt?: Partial<ListingPaymentAttempt> | null;
  latestAttempt?: Partial<ListingPaymentAttempt> | null;
  missingOrders?: Array<{ id: string; paidAt: string }>;
  fulfill?: (orderId: string) => Promise<unknown>;
}) {
  const candidates = input?.candidates ?? [];
  const order =
    input?.order === undefined
      ? ({
          id: 'order-1',
          status: ListingOrderStatus.PENDING_PAYMENT,
          metadata: {},
        } as ListingOrder)
      : input.order;
  const attempt =
    input?.attempt === undefined
      ? ({
          id: 'attempt-1',
          orderId: 'order-1',
          attemptNumber: 1,
          status: ListingPaymentAttemptStatus.PENDING,
          expiresAt: new Date('2026-09-07T11:59:00.000Z'),
        } as ListingPaymentAttempt)
      : input.attempt;
  const latestAttempt =
    input?.latestAttempt === undefined ? attempt : input.latestAttempt;
  const manager = {
    findOne: jest.fn(
      (entity: unknown, options: { where?: { id?: string } }) => {
        if (entity === ListingOrder) return Promise.resolve(order);
        if (options.where?.id) return Promise.resolve(attempt);
        return Promise.resolve(latestAttempt);
      },
    ),
    save: jest.fn((_entity: unknown, value: unknown) => Promise.resolve(value)),
  };
  const attemptsRepository = {
    find: jest.fn().mockResolvedValue(candidates),
  };
  const dataSource = {
    getRepository: jest.fn().mockReturnValue(attemptsRepository),
    transaction: jest.fn((callback: (value: typeof manager) => unknown) =>
      callback(manager),
    ),
    query: jest.fn().mockResolvedValue(input?.missingOrders ?? []),
  };
  const listingEntitlementsService = {
    fulfillPaidOrder: jest
      .fn()
      .mockImplementation(
        input?.fulfill ?? (() => Promise.resolve({ alreadyFulfilled: false })),
      ),
  };
  const service = new ListingPaymentReconciliationService(
    dataSource as never,
    listingEntitlementsService as never,
  );

  return {
    service,
    dataSource,
    manager,
    attemptsRepository,
    listingEntitlementsService,
    order,
    attempt,
  };
}

describe('ListingPaymentReconciliationService', () => {
  it('expires an abandoned current attempt and its pending order atomically', async () => {
    const candidate = { id: 'attempt-1', orderId: 'order-1' };
    const { service, manager, order, attempt } = buildService({
      candidates: [candidate],
    });

    const result = await service.reconcile(NOW);

    expect(result.expiredAttemptIds).toEqual(['attempt-1']);
    expect(result.expiredOrderIds).toEqual(['order-1']);
    expect(attempt).toMatchObject({
      status: ListingPaymentAttemptStatus.EXPIRED,
      completedAt: NOW,
    });
    expect(order).toMatchObject({
      status: ListingOrderStatus.EXPIRED,
      metadata: {
        checkoutExpiredAt: NOW.toISOString(),
        checkoutExpiredAttemptId: 'attempt-1',
      },
    });
    expect(manager.findOne.mock.calls.map(([entity]) => entity)).toEqual([
      ListingOrder,
      ListingPaymentAttempt,
      ListingPaymentAttempt,
    ]);
  });

  it('rechecks state under lock and preserves a concurrent successful payment', async () => {
    const { service, order, attempt, manager } = buildService({
      candidates: [{ id: 'attempt-1', orderId: 'order-1' }],
      order: {
        id: 'order-1',
        status: ListingOrderStatus.PAID,
        metadata: {},
      },
      attempt: {
        id: 'attempt-1',
        orderId: 'order-1',
        status: ListingPaymentAttemptStatus.SUCCEEDED,
        expiresAt: new Date('2026-09-07T11:59:00.000Z'),
      },
    });

    const result = await service.reconcile(NOW);

    expect(result.skippedAttemptIds).toEqual(['attempt-1']);
    expect(result.expiredOrderIds).toEqual([]);
    expect(order?.status).toBe(ListingOrderStatus.PAID);
    expect(attempt?.status).toBe(ListingPaymentAttemptStatus.SUCCEEDED);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('expires an old attempt without expiring an order that has a newer attempt', async () => {
    const { service, order } = buildService({
      candidates: [{ id: 'attempt-1', orderId: 'order-1' }],
      latestAttempt: {
        id: 'attempt-2',
        orderId: 'order-1',
        attemptNumber: 2,
        status: ListingPaymentAttemptStatus.PENDING,
      },
    });

    const result = await service.reconcile(NOW);

    expect(result.expiredAttemptIds).toEqual(['attempt-1']);
    expect(result.expiredOrderIds).toEqual([]);
    expect(order?.status).toBe(ListingOrderStatus.PENDING_PAYMENT);
  });

  it('recovers every paid order missing an entitlement and isolates failures', async () => {
    const recoveryError = new Error('listing is incomplete');
    const { service, dataSource, listingEntitlementsService } = buildService({
      missingOrders: [
        { id: 'order-ok', paidAt: '2026-09-07T11:50:00.000Z' },
        { id: 'order-failed', paidAt: '2026-09-07T11:51:00.000Z' },
      ],
      fulfill: (orderId) =>
        orderId === 'order-failed'
          ? Promise.reject(recoveryError)
          : Promise.resolve({}),
    });

    const result = await service.reconcile(NOW, {
      batchSize: 25,
      fulfillmentGraceMs: 120_000,
    });

    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('entitlements.id IS NULL'),
      [new Date('2026-09-07T11:58:00.000Z'), 25],
    );
    expect(listingEntitlementsService.fulfillPaidOrder).toHaveBeenCalledTimes(
      2,
    );
    expect(result.missingEntitlementOrderIds).toEqual([
      'order-ok',
      'order-failed',
    ]);
    expect(result.recoveredOrderIds).toEqual(['order-ok']);
    expect(result.recoveryFailures).toEqual([
      { id: 'order-failed', error: recoveryError },
    ]);
  });

  it('does not grant an entitlement with a corrupted paid timestamp', async () => {
    const { service, listingEntitlementsService } = buildService({
      missingOrders: [{ id: 'order-corrupted', paidAt: 'not-a-date' }],
    });

    const result = await service.reconcile(NOW);

    expect(listingEntitlementsService.fulfillPaidOrder).not.toHaveBeenCalled();
    expect(result.recoveryFailures).toEqual([
      {
        id: 'order-corrupted',
        error: expect.objectContaining({
          message:
            'Paid order order-corrupted has an invalid payment timestamp',
        }),
      },
    ]);
  });
});
