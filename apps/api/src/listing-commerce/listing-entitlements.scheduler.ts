import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MonitoringService } from '../monitoring';
import { PublicListingSubmissionsService } from '../public-listing-submissions';
import { PostgresAdvisoryLockService } from '../users';
import { ListingEntitlementsService } from './listing-entitlements.service';

const LOCK_NAME = 'listing_entitlements_lifecycle_scheduler';
const DEFAULT_INTERVAL_MS = 60_000;

@Injectable()
export class ListingEntitlementsScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ListingEntitlementsScheduler.name);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor(
    private readonly service: ListingEntitlementsService,
    private readonly submissionsService: PublicListingSubmissionsService,
    private readonly monitoring: MonitoringService,
    private readonly config: ConfigService,
    private readonly locks: PostgresAdvisoryLockService,
  ) {}

  onModuleInit(): void {
    if (!this.enabled()) return;
    this.schedule();
  }

  onModuleDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  async runOnce(now = new Date()): Promise<void> {
    if (this.running) {
      this.monitoring.recordWarning(
        'listing_entitlements',
        'scheduler_run_skipped_already_running',
      );
      return;
    }
    this.running = true;
    const startedAt = Date.now();
    try {
      const result = await this.locks.withLock(LOCK_NAME, () =>
        this.runLifecycleBatch(now),
      );
      if (!result.acquired) {
        this.monitoring.recordWarning(
          'listing_entitlements',
          'scheduler_run_skipped_lock_busy',
        );
        return;
      }
      this.monitoring.recordSuccess(
        'listing_entitlements',
        'scheduler_run_completed',
        {
          activated: result.result.activated,
          expired: result.result.expired,
          featuredRemindersSent: result.result.featuredReminders.sent,
          featuredRemindersSkipped: result.result.featuredReminders.skipped,
          publicationRemindersSent: result.result.publicationReminders.sent,
          publicationRemindersSkipped: result.result.publicationReminders.skipped,
          durationMs: Date.now() - startedAt,
        },
      );
    } catch (error) {
      this.monitoring.recordFailure(
        'listing_entitlements',
        'scheduler_run_failed',
        error,
      );
      this.logger.error(
        'Listing entitlement lifecycle scheduler failed',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.running = false;
    }
  }

  private schedule(): void {
    this.timer = setTimeout(() => {
      void this.runOnce().finally(() => this.enabled() && this.schedule());
    }, this.intervalMs());
  }

  private enabled(): boolean {
    const value = this.config.get<string | boolean>(
      'LISTING_ENTITLEMENTS_SCHEDULER_ENABLED',
    );
    if (value === undefined || value === null || value === '')
      return this.config.get('NODE_ENV') !== 'test';
    return typeof value === 'boolean'
      ? value
      : ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }

  private intervalMs(): number {
    const value = Number(
      this.config.get<string | number>(
        'LISTING_ENTITLEMENTS_SCHEDULER_INTERVAL_MS',
      ),
    );
    return Number.isInteger(value) && value > 0 ? value : DEFAULT_INTERVAL_MS;
  }

  private batchSize(): number {
    const value = Number(
      this.config.get<string | number>('LISTING_ENTITLEMENTS_BATCH_SIZE'),
    );
    return Number.isInteger(value) && value > 0 ? value : 500;
  }

  private async runLifecycleBatch(now: Date): Promise<{
    activated: number;
    expired: number;
    featuredReminders: { processed: number; sent: number; skipped: number };
    publicationReminders: { processed: number; sent: number; skipped: number };
  }> {
    const batchSize = this.batchSize();
    const lifecycle = await this.service.processDueEntitlements(now, batchSize);
    const featuredReminders = await this.service.sendFeaturedExpiryReminders(
      now,
      batchSize,
    );
    const publicationReminders =
      await this.submissionsService.sendExpiringSoonReminders(now);

    return {
      ...lifecycle,
      featuredReminders,
      publicationReminders,
    };
  }
}
