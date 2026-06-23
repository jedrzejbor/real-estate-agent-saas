import { AgencyLimitDowngradeEnforcementScheduler } from './agency-limit-downgrade-enforcement.scheduler';

function buildScheduler(input?: {
  run?: () => Promise<unknown[]>;
  config?: Record<string, unknown>;
  lockAcquired?: boolean;
}) {
  const enforcementService = {
    enforceExpiredListingGracePeriods: jest
      .fn()
      .mockImplementation(input?.run ?? (() => Promise.resolve([]))),
  };
  const monitoringService = {
    recordFailure: jest.fn(),
    recordSuccess: jest.fn(),
    recordWarning: jest.fn(),
  };
  const config: Record<string, unknown> = {
    NODE_ENV: 'test',
    ...input?.config,
  };
  const configService = {
    get: jest.fn((key: string) => config[key]),
  };
  const advisoryLockService = {
    withLock: jest.fn(
      async (_lockName: string, callback: () => Promise<unknown>) => {
        if (input?.lockAcquired === false) {
          return { acquired: false };
        }

        return { acquired: true, result: await callback() };
      },
    ),
  };
  const scheduler = new AgencyLimitDowngradeEnforcementScheduler(
    enforcementService as never,
    monitoringService as never,
    configService as never,
    advisoryLockService as never,
  );

  return {
    scheduler,
    enforcementService,
    monitoringService,
    configService,
    advisoryLockService,
  };
}

describe('AgencyLimitDowngradeEnforcementScheduler', () => {
  it('runs expired grace period enforcement and records batch success', async () => {
    const { scheduler, enforcementService, monitoringService } = buildScheduler(
      {
        run: () =>
          Promise.resolve([
            {
              agencyId: 'agency-1',
              status: 'enforced',
              limit: 2,
              activeListingsUsage: 4,
              keptListingIds: ['listing-1', 'listing-2'],
              excessListingIds: ['listing-3', 'listing-4'],
              archivedListingIds: ['listing-3', 'listing-4'],
              unpublishedListingIds: ['listing-3'],
            },
            {
              agencyId: 'agency-2',
              status: 'skipped_within_limit',
              limit: 5,
              activeListingsUsage: 3,
              keptListingIds: ['listing-5', 'listing-6', 'listing-7'],
              excessListingIds: [],
              archivedListingIds: [],
              unpublishedListingIds: [],
            },
          ]),
      },
    );
    const now = new Date('2026-06-20T02:15:00.000Z');

    await scheduler.runOnce(now);

    expect(
      enforcementService.enforceExpiredListingGracePeriods,
    ).toHaveBeenCalledWith(now);
    expect(monitoringService.recordSuccess).toHaveBeenCalledWith(
      'plan_limit_enforcement',
      'scheduler_run_completed',
      expect.objectContaining({
        checkedAgencies: 2,
        enforcedAgencies: 1,
        archivedListings: 2,
      }),
    );
  });

  it('skips batch enforcement when another instance holds the advisory lock', async () => {
    const {
      scheduler,
      enforcementService,
      monitoringService,
      advisoryLockService,
    } = buildScheduler({
      lockAcquired: false,
    });

    await scheduler.runOnce();

    expect(advisoryLockService.withLock).toHaveBeenCalledWith(
      'plan_limit_downgrade_enforcement_scheduler',
      expect.any(Function),
    );
    expect(
      enforcementService.enforceExpiredListingGracePeriods,
    ).not.toHaveBeenCalled();
    expect(monitoringService.recordWarning).toHaveBeenCalledWith(
      'plan_limit_enforcement',
      'scheduler_run_skipped_lock_busy',
    );
  });

  it('skips overlapping runs while a previous run is still in progress', async () => {
    let resolveRun: (value: unknown[]) => void = () => undefined;
    const pendingRun = new Promise<unknown[]>((resolve) => {
      resolveRun = resolve;
    });
    const { scheduler, enforcementService, monitoringService } = buildScheduler(
      {
        run: () => pendingRun,
      },
    );

    const firstRun = scheduler.runOnce();
    await scheduler.runOnce();
    resolveRun([]);
    await firstRun;

    expect(
      enforcementService.enforceExpiredListingGracePeriods,
    ).toHaveBeenCalledTimes(1);
    expect(monitoringService.recordWarning).toHaveBeenCalledWith(
      'plan_limit_enforcement',
      'scheduler_run_skipped_already_running',
    );
  });

  it('records failures without throwing from the scheduler', async () => {
    const error = new Error('database unavailable');
    const { scheduler, monitoringService } = buildScheduler({
      run: () => Promise.reject(error),
    });

    await expect(scheduler.runOnce()).resolves.toBeUndefined();

    expect(monitoringService.recordFailure).toHaveBeenCalledWith(
      'plan_limit_enforcement',
      'scheduler_run_failed',
      error,
    );
  });

  it('does not schedule itself by default in test environment', () => {
    jest.useFakeTimers();
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const { scheduler } = buildScheduler();

    scheduler.onModuleInit();

    expect(setTimeoutSpy).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});
