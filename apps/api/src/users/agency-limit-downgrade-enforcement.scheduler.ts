import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MonitoringService } from '../monitoring';
import { AgencyLimitDowngradeEnforcementService } from './agency-limit-downgrade-enforcement.service';

const DEFAULT_RUN_HOUR = 2;
const DEFAULT_RUN_MINUTE = 15;

@Injectable()
export class AgencyLimitDowngradeEnforcementScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    AgencyLimitDowngradeEnforcementScheduler.name,
  );
  private timer: ReturnType<typeof setTimeout> | null = null;
  private isRunning = false;

  constructor(
    private readonly enforcementService: AgencyLimitDowngradeEnforcementService,
    private readonly monitoringService: MonitoringService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    if (!this.isEnabled()) {
      this.logger.log('Plan limit enforcement scheduler is disabled');
      return;
    }

    this.scheduleNextRun();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  async runOnce(now = new Date()): Promise<void> {
    if (this.isRunning) {
      this.monitoringService.recordWarning(
        'plan_limit_enforcement',
        'scheduler_run_skipped_already_running',
      );
      return;
    }

    this.isRunning = true;
    const startedAt = new Date();

    try {
      const results =
        await this.enforcementService.enforceExpiredListingGracePeriods(now);
      const enforcedCount = results.filter(
        (result) => result.status === 'enforced',
      ).length;
      const archivedCount = results.reduce(
        (sum, result) => sum + result.archivedListingIds.length,
        0,
      );

      this.monitoringService.recordSuccess(
        'plan_limit_enforcement',
        'scheduler_run_completed',
        {
          checkedAgencies: results.length,
          enforcedAgencies: enforcedCount,
          archivedListings: archivedCount,
          durationMs: Date.now() - startedAt.getTime(),
        },
      );
      this.logger.log(
        `Plan limit enforcement scheduler completed: ` +
          `${enforcedCount}/${results.length} agencies enforced`,
      );
    } catch (error) {
      this.monitoringService.recordFailure(
        'plan_limit_enforcement',
        'scheduler_run_failed',
        error,
      );
      this.logger.error(
        'Plan limit enforcement scheduler failed',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.isRunning = false;
    }
  }

  private scheduleNextRun(now = new Date()): void {
    const nextRunAt = this.getNextRunAt(now);
    const delayMs = Math.max(nextRunAt.getTime() - now.getTime(), 1_000);

    this.timer = setTimeout(() => {
      void this.runOnce().finally(() => {
        if (this.isEnabled()) {
          this.scheduleNextRun();
        }
      });
    }, delayMs);

    this.logger.log(
      `Plan limit enforcement scheduler next run: ${nextRunAt.toISOString()}`,
    );
  }

  private getNextRunAt(now: Date): Date {
    const hour = this.getBoundedNumber(
      'PLAN_LIMIT_ENFORCEMENT_SCHEDULER_HOUR',
      DEFAULT_RUN_HOUR,
      0,
      23,
    );
    const minute = this.getBoundedNumber(
      'PLAN_LIMIT_ENFORCEMENT_SCHEDULER_MINUTE',
      DEFAULT_RUN_MINUTE,
      0,
      59,
    );
    const nextRunAt = new Date(now);

    nextRunAt.setHours(hour, minute, 0, 0);

    if (nextRunAt.getTime() <= now.getTime()) {
      nextRunAt.setDate(nextRunAt.getDate() + 1);
    }

    return nextRunAt;
  }

  private isEnabled(): boolean {
    const value = this.configService.get<string | boolean>(
      'PLAN_LIMIT_ENFORCEMENT_SCHEDULER_ENABLED',
    );

    if (value === undefined || value === null || value === '') {
      return this.configService.get('NODE_ENV') !== 'test';
    }

    if (typeof value === 'boolean') {
      return value;
    }

    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }

  private getBoundedNumber(
    name: string,
    fallback: number,
    min: number,
    max: number,
  ): number {
    const value = Number(this.configService.get<string | number>(name));

    if (!Number.isInteger(value) || value < min || value > max) {
      return fallback;
    }

    return value;
  }
}
