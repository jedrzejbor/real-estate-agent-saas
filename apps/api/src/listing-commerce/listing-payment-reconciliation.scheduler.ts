import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MonitoringService } from '../monitoring';
import { PostgresAdvisoryLockService } from '../users';
import { ListingPaymentReconciliationService } from './listing-payment-reconciliation.service';

const SCHEDULER_LOCK_NAME = 'listing_payment_reconciliation_scheduler';
const DEFAULT_INTERVAL_MS = 5 * 60 * 1_000;
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_FULFILLMENT_GRACE_MS = 2 * 60 * 1_000;

@Injectable()
export class ListingPaymentReconciliationScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    ListingPaymentReconciliationScheduler.name,
  );
  private timer: ReturnType<typeof setTimeout> | null = null;
  private isRunning = false;

  constructor(
    private readonly reconciliationService: ListingPaymentReconciliationService,
    private readonly monitoringService: MonitoringService,
    private readonly configService: ConfigService,
    private readonly advisoryLockService: PostgresAdvisoryLockService,
  ) {}

  onModuleInit(): void {
    if (!this.isEnabled()) {
      this.logger.log('Listing payment reconciliation scheduler is disabled');
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
        'listing_payment_reconciliation',
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
              'LISTING_PAYMENT_RECONCILIATION_BATCH_SIZE',
              DEFAULT_BATCH_SIZE,
            ),
            fulfillmentGraceMs: this.getPositiveInteger(
              'LISTING_PAYMENT_RECONCILIATION_FULFILLMENT_GRACE_MS',
              DEFAULT_FULFILLMENT_GRACE_MS,
            ),
          });

          for (const orderId of result.missingEntitlementOrderIds) {
            this.monitoringService.recordWarning(
              'listing_payment_reconciliation',
              'paid_order_missing_entitlement',
              { orderId },
            );
          }
          for (const failure of result.expirationFailures) {
            this.monitoringService.recordFailure(
              'listing_payment_reconciliation',
              'payment_attempt_expiration_failed',
              failure.error,
              { paymentAttemptId: failure.id },
            );
          }
          for (const failure of result.recoveryFailures) {
            this.monitoringService.recordFailure(
              'listing_payment_reconciliation',
              'paid_order_entitlement_recovery_failed',
              failure.error,
              { orderId: failure.id },
            );
          }
          this.monitoringService.recordSuccess(
            'listing_payment_reconciliation',
            'scheduler_run_completed',
            {
              expiredAttempts: result.expiredAttemptIds.length,
              expiredOrders: result.expiredOrderIds.length,
              missingEntitlements: result.missingEntitlementOrderIds.length,
              recoveredOrders: result.recoveredOrderIds.length,
              failures:
                result.expirationFailures.length +
                result.recoveryFailures.length,
              durationMs: Date.now() - startedAt,
            },
          );
        },
      );

      if (!lockResult.acquired) {
        this.monitoringService.recordWarning(
          'listing_payment_reconciliation',
          'scheduler_run_skipped_lock_busy',
        );
      }
    } catch (error) {
      this.monitoringService.recordFailure(
        'listing_payment_reconciliation',
        'scheduler_run_failed',
        error,
      );
      this.logger.error(
        'Listing payment reconciliation scheduler failed',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.isRunning = false;
    }
  }

  private scheduleNextRun(): void {
    const intervalMs = this.getPositiveInteger(
      'LISTING_PAYMENT_RECONCILIATION_INTERVAL_MS',
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
      'LISTING_PAYMENT_RECONCILIATION_ENABLED',
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
