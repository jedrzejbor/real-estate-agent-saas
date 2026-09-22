import { AgencyPlanPaymentReconciliationScheduler } from './agency-plan-payment-reconciliation.scheduler';

function reconciliationResult() {
  return {
    expiredAttemptIds: ['attempt-1'],
    releasedQuoteIds: ['quote-1'],
    skippedAttemptIds: ['attempt-2'],
    expirationFailures: [] as Array<{ id: string; error: unknown }>,
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
  const scheduler = new AgencyPlanPaymentReconciliationScheduler(
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

describe('AgencyPlanPaymentReconciliationScheduler', () => {
  it('runs a bounded reconciliation and reports the completed batch', async () => {
    const { scheduler, reconciliationService, monitoringService } =
      buildScheduler({
        config: {
          AGENCY_PLAN_PAYMENT_RECONCILIATION_BATCH_SIZE: '25',
        },
      });
    const now = new Date('2026-09-21T12:00:00.000Z');

    await scheduler.runOnce(now);

    expect(reconciliationService.reconcile).toHaveBeenCalledWith(now, {
      batchSize: 25,
    });
    expect(monitoringService.recordSuccess).toHaveBeenCalledWith(
      'agency_plan_payment_reconciliation',
      'scheduler_run_completed',
      expect.objectContaining({
        expiredAttempts: 1,
        releasedQuotes: 1,
        skippedAttempts: 1,
        failures: 0,
      }),
    );
  });

  it('reports per-attempt failures without losing the completed batch', async () => {
    const expirationError = new Error('expiration failed');
    const result = reconciliationResult();
    result.expirationFailures = [{ id: 'attempt-x', error: expirationError }];
    const { scheduler, monitoringService } = buildScheduler({
      reconcile: () => Promise.resolve(result),
    });

    await scheduler.runOnce();

    expect(monitoringService.recordFailure).toHaveBeenCalledWith(
      'agency_plan_payment_reconciliation',
      'checkout_attempt_expiration_failed',
      expirationError,
      { checkoutAttemptId: 'attempt-x' },
    );
    expect(monitoringService.recordSuccess).toHaveBeenCalledWith(
      'agency_plan_payment_reconciliation',
      'scheduler_run_completed',
      expect.objectContaining({ failures: 1 }),
    );
  });

  it('skips work when another API instance owns the advisory lock', async () => {
    const { scheduler, reconciliationService, monitoringService } =
      buildScheduler({ lockAcquired: false });

    await scheduler.runOnce();

    expect(reconciliationService.reconcile).not.toHaveBeenCalled();
    expect(monitoringService.recordWarning).toHaveBeenCalledWith(
      'agency_plan_payment_reconciliation',
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
      'agency_plan_payment_reconciliation',
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
