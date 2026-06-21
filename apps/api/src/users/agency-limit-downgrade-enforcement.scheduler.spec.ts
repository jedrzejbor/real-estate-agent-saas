import { AgencyLimitDowngradeEnforcementScheduler } from './agency-limit-downgrade-enforcement.scheduler';

function buildScheduler(input?: {
  run?: () => Promise<unknown[]>;
  config?: Record<string, unknown>;
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
  const scheduler = new AgencyLimitDowngradeEnforcementScheduler(
    enforcementService as never,
    monitoringService as never,
    configService as never,
  );

  return {
    scheduler,
    enforcementService,
    monitoringService,
    configService,
  };
}

describe('AgencyLimitDowngradeEnforcementScheduler', () => {
  it('runs expired grace period enforcement and records batch success', async () => {
    const { scheduler, enforcementService, monitoringService } = buildScheduler({
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
    });
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

  it('skips overlapping runs while a previous run is still in progress', async () => {
    let resolveRun: (value: unknown[]) => void = () => undefined;
    const pendingRun = new Promise<unknown[]>((resolve) => {
      resolveRun = resolve;
    });
    const { scheduler, enforcementService, monitoringService } = buildScheduler({
      run: () => pendingRun,
    });

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
