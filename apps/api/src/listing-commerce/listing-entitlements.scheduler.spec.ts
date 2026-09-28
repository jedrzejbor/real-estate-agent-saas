import { ListingEntitlementsScheduler } from './listing-entitlements.scheduler';

function buildScheduler(input?: {
  config?: Record<string, unknown>;
  lockAcquired?: boolean;
  processDueEntitlements?: () => Promise<{ activated: number; expired: number }>;
  sendFeaturedExpiryReminders?: () => Promise<{
    processed: number;
    sent: number;
    skipped: number;
  }>;
  sendExpiringSoonReminders?: () => Promise<{
    processed: number;
    sent: number;
    skipped: number;
  }>;
}) {
  const entitlementsService = {
    processDueEntitlements: jest
      .fn()
      .mockImplementation(
        input?.processDueEntitlements ??
          (() => Promise.resolve({ activated: 2, expired: 1 })),
      ),
    sendFeaturedExpiryReminders: jest
      .fn()
      .mockImplementation(
        input?.sendFeaturedExpiryReminders ??
          (() => Promise.resolve({ processed: 3, sent: 2, skipped: 1 })),
      ),
  };
  const submissionsService = {
    sendExpiringSoonReminders: jest
      .fn()
      .mockImplementation(
        input?.sendExpiringSoonReminders ??
          (() => Promise.resolve({ processed: 4, sent: 3, skipped: 1 })),
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
    withLock: jest.fn(
      async (
        _name: string,
        callback: () => Promise<{
          activated: number;
          expired: number;
          featuredReminders: { processed: number; sent: number; skipped: number };
          publicationReminders: {
            processed: number;
            sent: number;
            skipped: number;
          };
        }>,
      ) =>
        input?.lockAcquired === false
          ? { acquired: false }
          : { acquired: true, result: await callback() },
    ),
  };
  const scheduler = new ListingEntitlementsScheduler(
    entitlementsService as never,
    submissionsService as never,
    monitoringService as never,
    configService as never,
    advisoryLockService as never,
  );

  return {
    scheduler,
    entitlementsService,
    submissionsService,
    monitoringService,
    advisoryLockService,
  };
}

describe('ListingEntitlementsScheduler', () => {
  it('runs lifecycle, featured reminders and publication reminders in one cyclic batch', async () => {
    const { scheduler, entitlementsService, submissionsService, monitoringService } =
      buildScheduler({
        config: {
          LISTING_ENTITLEMENTS_BATCH_SIZE: '40',
        },
      });
    const now = new Date('2026-09-10T12:00:00.000Z');

    await scheduler.runOnce(now);

    expect(entitlementsService.processDueEntitlements).toHaveBeenCalledWith(
      now,
      40,
    );
    expect(entitlementsService.sendFeaturedExpiryReminders).toHaveBeenCalledWith(
      now,
      40,
    );
    expect(submissionsService.sendExpiringSoonReminders).toHaveBeenCalledWith(
      now,
    );
    expect(monitoringService.recordSuccess).toHaveBeenCalledWith(
      'listing_entitlements',
      'scheduler_run_completed',
      expect.objectContaining({
        activated: 2,
        expired: 1,
        featuredRemindersSent: 2,
        featuredRemindersSkipped: 1,
        publicationRemindersSent: 3,
        publicationRemindersSkipped: 1,
      }),
    );
  });

  it('skips all work when another API instance owns the advisory lock', async () => {
    const { scheduler, entitlementsService, submissionsService, monitoringService } =
      buildScheduler({ lockAcquired: false });

    await scheduler.runOnce();

    expect(entitlementsService.processDueEntitlements).not.toHaveBeenCalled();
    expect(entitlementsService.sendFeaturedExpiryReminders).not.toHaveBeenCalled();
    expect(submissionsService.sendExpiringSoonReminders).not.toHaveBeenCalled();
    expect(monitoringService.recordWarning).toHaveBeenCalledWith(
      'listing_entitlements',
      'scheduler_run_skipped_lock_busy',
    );
  });

  it('records an unexpected batch failure without throwing', async () => {
    const error = new Error('database unavailable');
    const { scheduler, monitoringService } = buildScheduler({
      processDueEntitlements: () => Promise.reject(error),
    });
    const logger = (
      scheduler as unknown as { logger: { error: (...args: unknown[]) => void } }
    ).logger;
    jest.spyOn(logger, 'error').mockImplementation(() => undefined);

    await expect(scheduler.runOnce()).resolves.toBeUndefined();
    expect(monitoringService.recordFailure).toHaveBeenCalledWith(
      'listing_entitlements',
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
