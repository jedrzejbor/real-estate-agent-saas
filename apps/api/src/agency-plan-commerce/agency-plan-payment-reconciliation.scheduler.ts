import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MonitoringService } from '../monitoring';
import { PostgresAdvisoryLockService } from '../users';
import { AgencyPlanPaymentReconciliationService } from './agency-plan-payment-reconciliation.service';

const SCHEDULER_LOCK_NAME = 'agency_plan_payment_reconciliation_scheduler';
const DEFAULT_INTERVAL_MS = 5 * 60 * 1_000;
const DEFAULT_BATCH_SIZE = 100;

@Injectable()
export class AgencyPlanPaymentReconciliationScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    AgencyPlanPaymentReconciliationScheduler.name,
  );
  private timer: ReturnType<typeof setTimeout> | null = null;
  private isRunning = false;

  constructor(
    private readonly reconciliationService: AgencyPlanPaymentReconciliationService,
    private readonly monitoringService: MonitoringService,
    private readonly configService: ConfigService,
    private readonly advisoryLockService: PostgresAdvisoryLockService,
  ) {}

  onModuleInit(): void {
    if (!this.isEnabled()) {
      this.logger.log(
        'Agency plan payment reconciliation scheduler is disabled',
      );
      return;
    }
    this.scheduleNextRun();
  }

  onModuleDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  async runOnce(now = new Date()): Promise<void> {
    if (this.isRunning) {
      this.monitoringService.recordWarning(
        'agency_plan_payment_reconciliation',
        'scheduler_run_skipped_already_running',
      );
      return;
    }

    this.isRunning = true;
    const startedAt = Date.now();
    try {
      const lockResult = await this.advisoryLockService.withLock(
        SCHEDULER_LOCK_NAME,
        async () => {
          const result = await this.reconciliationService.reconcile(now, {
            batchSize: this.getPositiveInteger(
              'AGENCY_PLAN_PAYMENT_RECONCILIATION_BATCH_SIZE',
              DEFAULT_BATCH_SIZE,
            ),
          });

          for (const failure of result.expirationFailures) {
            this.monitoringService.recordFailure(
              'agency_plan_payment_reconciliation',
              'checkout_attempt_expiration_failed',
              failure.error,
              { checkoutAttemptId: failure.id },
            );
          }

          this.monitoringService.recordSuccess(
            'agency_plan_payment_reconciliation',
            'scheduler_run_completed',
            {
              expiredAttempts: result.expiredAttemptIds.length,
              releasedQuotes: result.releasedQuoteIds.length,
              skippedAttempts: result.skippedAttemptIds.length,
              failures: result.expirationFailures.length,
              durationMs: Date.now() - startedAt,
            },
          );
        },
      );

      if (!lockResult.acquired) {
        this.monitoringService.recordWarning(
          'agency_plan_payment_reconciliation',
          'scheduler_run_skipped_lock_busy',
        );
      }
    } catch (error) {
      this.monitoringService.recordFailure(
        'agency_plan_payment_reconciliation',
        'scheduler_run_failed',
        error,
      );
      this.logger.error(
        'Agency plan payment reconciliation scheduler failed',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.isRunning = false;
    }
  }

  private scheduleNextRun(): void {
    const intervalMs = this.getPositiveInteger(
      'AGENCY_PLAN_PAYMENT_RECONCILIATION_INTERVAL_MS',
      DEFAULT_INTERVAL_MS,
    );
    this.timer = setTimeout(() => {
      void this.runOnce().finally(() => {
        if (this.isEnabled()) this.scheduleNextRun();
      });
    }, intervalMs);
  }

  private isEnabled(): boolean {
    const value = this.configService.get<string | boolean>(
      'AGENCY_PLAN_PAYMENT_RECONCILIATION_ENABLED',
    );
    if (value === undefined || value === null || value === '') {
      return this.configService.get('NODE_ENV') !== 'test';
    }
    return typeof value === 'boolean'
      ? value
      : ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }

  private getPositiveInteger(name: string, fallback: number): number {
    const value = Number(this.configService.get<string | number>(name));
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }
}
