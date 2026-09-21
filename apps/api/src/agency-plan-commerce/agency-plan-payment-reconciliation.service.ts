import { Injectable } from '@nestjs/common';
import { DataSource, In, LessThanOrEqual } from 'typeorm';
import { AgencyPlanCheckoutAttemptStatus } from './agency-plan-commerce.types';
import { AgencyPlanPromotionsService } from './agency-plan-promotions.service';
import { AgencyPlanCheckoutAttempt, AgencyPlanQuote } from './entities';

const OPEN_ATTEMPT_STATUSES = new Set<AgencyPlanCheckoutAttemptStatus>([
  AgencyPlanCheckoutAttemptStatus.CREATING,
  AgencyPlanCheckoutAttemptStatus.PENDING,
]);
const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 500;

export interface AgencyPlanPaymentReconciliationFailure {
  id: string;
  error: unknown;
}

export interface AgencyPlanPaymentReconciliationResult {
  expiredAttemptIds: string[];
  releasedQuoteIds: string[];
  skippedAttemptIds: string[];
  expirationFailures: AgencyPlanPaymentReconciliationFailure[];
}

@Injectable()
export class AgencyPlanPaymentReconciliationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly promotionsService: AgencyPlanPromotionsService,
  ) {}

  async reconcile(
    now = new Date(),
    options?: { batchSize?: number },
  ): Promise<AgencyPlanPaymentReconciliationResult> {
    const batchSize = normalizeBatchSize(options?.batchSize);
    const candidates = await this.dataSource
      .getRepository(AgencyPlanCheckoutAttempt)
      .find({
        select: { id: true, quoteId: true },
        where: {
          status: In(Array.from(OPEN_ATTEMPT_STATUSES)),
          expiresAt: LessThanOrEqual(now),
        },
        order: { expiresAt: 'ASC', id: 'ASC' },
        take: batchSize,
      });

    const expiredAttemptIds: string[] = [];
    const releasedQuoteIds: string[] = [];
    const skippedAttemptIds: string[] = [];
    const expirationFailures: AgencyPlanPaymentReconciliationFailure[] = [];

    for (const candidate of candidates) {
      try {
        const outcome = await this.expireAttempt(candidate, now);
        if (outcome.attemptExpired) expiredAttemptIds.push(candidate.id);
        else skippedAttemptIds.push(candidate.id);
        if (outcome.quoteReleased) releasedQuoteIds.push(candidate.quoteId);
      } catch (error) {
        expirationFailures.push({ id: candidate.id, error });
      }
    }

    return {
      expiredAttemptIds,
      releasedQuoteIds,
      skippedAttemptIds,
      expirationFailures,
    };
  }

  private expireAttempt(
    candidate: Pick<AgencyPlanCheckoutAttempt, 'id' | 'quoteId'>,
    now: Date,
  ): Promise<{ attemptExpired: boolean; quoteReleased: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      // Webhooks acquire locks in the same order. This keeps a concurrent
      // payment success authoritative and avoids deadlocks.
      const quote = await manager.findOne(AgencyPlanQuote, {
        where: { id: candidate.quoteId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!quote) return { attemptExpired: false, quoteReleased: false };

      const attempt = await manager.findOne(AgencyPlanCheckoutAttempt, {
        where: { id: candidate.id, quoteId: quote.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !attempt ||
        !OPEN_ATTEMPT_STATUSES.has(attempt.status) ||
        attempt.expiresAt.getTime() > now.getTime()
      ) {
        return { attemptExpired: false, quoteReleased: false };
      }

      attempt.status = AgencyPlanCheckoutAttemptStatus.EXPIRED;
      attempt.completedAt = now;
      await manager.save(AgencyPlanCheckoutAttempt, attempt);

      const latestAttempt = await manager.findOne(AgencyPlanCheckoutAttempt, {
        where: { quoteId: quote.id },
        order: { attemptNumber: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });
      const isCurrentAttempt = latestAttempt?.id === attempt.id;
      if (!isCurrentAttempt) {
        return { attemptExpired: true, quoteReleased: false };
      }

      await this.promotionsService.releaseReservationsForQuotes(
        manager,
        [quote],
        now,
      );
      return { attemptExpired: true, quoteReleased: true };
    });
  }
}

function normalizeBatchSize(value?: number): number {
  if (!Number.isInteger(value) || !value || value < 1) {
    return DEFAULT_BATCH_SIZE;
  }
  return Math.min(value, MAX_BATCH_SIZE);
}
