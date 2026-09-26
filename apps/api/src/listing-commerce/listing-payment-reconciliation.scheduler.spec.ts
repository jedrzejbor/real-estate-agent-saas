import { ListingPaymentReconciliationScheduler } from './listing-payment-reconciliation.scheduler';

function reconciliationResult() {
  return {
    expiredAttemptIds: ['attempt-1'],
    expiredOrderIds: ['order-1'],
    skippedAttemptIds: [],
    expirationFailures: [] as Array<{ id: string; error: unknown }>,
    missingEntitlementOrderIds: ['order-2'],
    recoveredOrderIds: ['order-2'],
    recoveryFailures: [] as Array<{ id: string; error: unknown }>,
  };
}

function buildScheduler(input?: {
  config?: Record<string, unknown>;
  lockAcquired?: boolean;
  reconcile?: () => Promise<ReturnType<typeof reconciliationResult>>;
}) {
  const reconciliationService = {
    reconcile: jest
      .fn()
      .mockImplementation(
        input?.reconcile ?? (() => Promise.resolve(reconciliationResult())),
      ),
  };
  const monitoringService = {
    recordSuccess: jest.fn(),
    recordWarning: jest.fn(),
    recordFailure: jest.fn(),
  };
  const config = { NODE_ENV: 'test', ...input?.config };
  const configService = {
    get: jest.fn((key: keyof typeof config) => config[key]),
  };
  const advisoryLockService = {
    withLock: jest.fn(async (_name: string, callback: () => Promise<void>) =>
      input?.lockAcquired === false
        ? { acquired: false }
        : { acquired: true, result: await callback() },
    ),
  };
  const scheduler = new ListingPaymentReconciliationScheduler(
    reconciliationService as never,
    monitoringService as never,
    configService as never,
    advisoryLockService as never,
  );

  return {
    scheduler,
    reconciliationService,
    monitoringService,
    advisoryLockService,
  };
}

describe('ListingPaymentReconciliationScheduler', () => {
  it('runs a bounded reconciliation and reports missing entitlements', async () => {
    const { scheduler, reconciliationService, monitoringService } =
      buildScheduler({
        config: {
          LISTING_PAYMENT_RECONCILIATION_BATCH_SIZE: '40',
          LISTING_PAYMENT_RECONCILIATION_FULFILLMENT_GRACE_MS: '90000',
        },
      });
    const now = new Date('2026-09-07T12:00:00.000Z');

    await scheduler.runOnce(now);

    expect(reconciliationService.reconcile).toHaveBeenCalledWith(now, {
      batchSize: 40,
      fulfillmentGraceMs: 90_000,
    });
    expect(monitoringService.recordWarning).toHaveBeenCalledWith(
      'listing_payment_reconciliation',
      'paid_order_missing_entitlement',
      { orderId: 'order-2' },
    );
    expect(monitoringService.recordSuccess).toHaveBeenCalledWith(
      'listing_payment_reconciliation',
      'scheduler_run_completed',
      expect.objectContaining({
        expiredAttempts: 1,
        expiredOrders: 1,
        missingEntitlements: 1,
        recoveredOrders: 1,
        failures: 0,
      }),
    );
  });

  it('reports per-record failures without losing the completed batch', async () => {
    const expirationError = new Error('expiration failed');
    const recoveryError = new Error('recovery failed');
    const result = reconciliationResult();
    result.expirationFailures = [{ id: 'attempt-x', error: expirationError }];
    result.recoveryFailures = [{ id: 'order-x', error: recoveryError }];
    const { scheduler, monitoringService } = buildScheduler({
      reconcile: () => Promise.resolve(result),
    });

    await scheduler.runOnce();

    expect(monitoringService.recordFailure).toHaveBeenCalledWith(
      'listing_payment_reconciliation',
      'payment_attempt_expiration_failed',
      expirationError,
      { paymentAttemptId: 'attempt-x' },
    );
    expect(monitoringService.recordFailure).toHaveBeenCalledWith(
      'listing_payment_reconciliation',
      'paid_order_entitlement_recovery_failed',
      recoveryError,
      { orderId: 'order-x' },
    );
  });

  it('skips work when another API instance owns the advisory lock', async () => {
    const { scheduler, reconciliationService, monitoringService } =
      buildScheduler({ lockAcquired: false });

    await scheduler.runOnce();

    expect(reconciliationService.reconcile).not.toHaveBeenCalled();
    expect(monitoringService.recordWarning).toHaveBeenCalledWith(
      'listing_payment_reconciliation',
      'scheduler_run_skipped_lock_busy',
    );
  });

  it('records an unexpected batch failure without throwing', async () => {
    const error = new Error('database unavailable');
    const { scheduler, monitoringService } = buildScheduler({
      reconcile: () => Promise.reject(error),
    });

    await expect(scheduler.runOnce()).resolves.toBeUndefined();
    expect(monitoringService.recordFailure).toHaveBeenCalledWith(
      'listing_payment_reconciliation',
      'scheduler_run_failed',
      error,
    );
  });

  it('does not schedule itself by default in tests', () => {
    jest.useFakeTimers();
    const timeoutSpy = jest.spyOn(global, 'setTimeout');
    const { scheduler } = buildScheduler();

    scheduler.onModuleInit();

    expect(timeoutSpy).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});
