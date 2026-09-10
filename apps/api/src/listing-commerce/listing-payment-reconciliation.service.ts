import { Injectable } from '@nestjs/common';
import { DataSource, In, LessThanOrEqual } from 'typeorm';
import { ListingOrder, ListingPaymentAttempt } from './entities';
import { ListingEntitlementsService } from './listing-entitlements.service';
import { ListingPromotionsService } from './listing-promotions.service';
import { assertListingOrderStatusTransition } from './listing-commerce.policy';
import {
  ListingOrderStatus,
  ListingPaymentAttemptStatus,
} from './listing-commerce.types';

const OPEN_ATTEMPT_STATUSES = new Set<ListingPaymentAttemptStatus>([
  ListingPaymentAttemptStatus.CREATING,
  ListingPaymentAttemptStatus.PENDING,
]);
const EXPIRABLE_ORDER_STATUSES = new Set([
  ListingOrderStatus.PENDING_PAYMENT,
  ListingOrderStatus.PAYMENT_FAILED,
]);
const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 500;

export interface ListingPaymentReconciliationFailure {
  id: string;
  error: unknown;
}

export interface ListingPaymentReconciliationResult {
  expiredAttemptIds: string[];
  expiredOrderIds: string[];
  skippedAttemptIds: string[];
  expirationFailures: ListingPaymentReconciliationFailure[];
  missingEntitlementOrderIds: string[];
  recoveredOrderIds: string[];
  recoveryFailures: ListingPaymentReconciliationFailure[];
}

interface MissingEntitlementOrderRow {
  id: string;
  paidAt: Date | string;
}

@Injectable()
export class ListingPaymentReconciliationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly listingEntitlementsService: ListingEntitlementsService,
    private readonly listingPromotionsService: ListingPromotionsService,
  ) {}

  async reconcile(
    now = new Date(),
    options?: { batchSize?: number; fulfillmentGraceMs?: number },
  ): Promise<ListingPaymentReconciliationResult> {
    const batchSize = normalizeBatchSize(options?.batchSize);
    const fulfillmentGraceMs = normalizeNonNegativeInteger(
      options?.fulfillmentGraceMs,
    );
    const expiration = await this.expireAbandonedAttempts(now, batchSize);
    const recovery = await this.recoverMissingEntitlements(
      new Date(now.getTime() - fulfillmentGraceMs),
      batchSize,
    );

    return { ...expiration, ...recovery };
  }

  private async expireAbandonedAttempts(now: Date, batchSize: number) {
    const candidates = await this.dataSource
      .getRepository(ListingPaymentAttempt)
      .find({
        select: { id: true, orderId: true },
        where: {
          status: In(Array.from(OPEN_ATTEMPT_STATUSES)),
          expiresAt: LessThanOrEqual(now),
        },
        order: { expiresAt: 'ASC', id: 'ASC' },
        take: batchSize,
      });
    const expiredAttemptIds: string[] = [];
    const expiredOrderIds: string[] = [];
    const skippedAttemptIds: string[] = [];
    const expirationFailures: ListingPaymentReconciliationFailure[] = [];

    for (const candidate of candidates) {
      try {
        const outcome = await this.expireAttempt(candidate, now);
        if (outcome.attemptExpired) expiredAttemptIds.push(candidate.id);
        else skippedAttemptIds.push(candidate.id);
        if (outcome.orderExpired) expiredOrderIds.push(candidate.orderId);
      } catch (error) {
        expirationFailures.push({ id: candidate.id, error });
      }
    }

    return {
      expiredAttemptIds,
      expiredOrderIds,
      skippedAttemptIds,
      expirationFailures,
    };
  }

  private expireAttempt(
    candidate: Pick<ListingPaymentAttempt, 'id' | 'orderId'>,
    now: Date,
  ): Promise<{ attemptExpired: boolean; orderExpired: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      // Webhooks acquire locks in the same order. This prevents deadlocks and
      // makes a concurrent payment success authoritative regardless of timing.
      const order = await manager.findOne(ListingOrder, {
        where: { id: candidate.orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) return { attemptExpired: false, orderExpired: false };

      const attempt = await manager.findOne(ListingPaymentAttempt, {
        where: { id: candidate.id, orderId: order.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !attempt ||
        !OPEN_ATTEMPT_STATUSES.has(attempt.status) ||
        attempt.expiresAt.getTime() > now.getTime()
      ) {
        return { attemptExpired: false, orderExpired: false };
      }

      attempt.status = ListingPaymentAttemptStatus.EXPIRED;
      attempt.completedAt = now;
      await manager.save(ListingPaymentAttempt, attempt);

      const latestAttempt = await manager.findOne(ListingPaymentAttempt, {
        where: { orderId: order.id },
        order: { attemptNumber: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });
      const isCurrentAttempt = latestAttempt?.id === attempt.id;
      if (!isCurrentAttempt || !EXPIRABLE_ORDER_STATUSES.has(order.status)) {
        return { attemptExpired: true, orderExpired: false };
      }

      assertListingOrderStatusTransition(
        order.status,
        ListingOrderStatus.EXPIRED,
      );
      order.status = ListingOrderStatus.EXPIRED;
      order.metadata = {
        ...order.metadata,
        checkoutExpiredAt: now.toISOString(),
        checkoutExpiredAttemptId: attempt.id,
      };
      await manager.save(ListingOrder, order);
      await this.listingPromotionsService.releaseReservationsForOrders(
        manager,
        [order],
        now,
      );
      return { attemptExpired: true, orderExpired: true };
    });
  }

  private async recoverMissingEntitlements(
    paidBefore: Date,
    batchSize: number,
  ) {
    const rows = (await this.dataSource.query(
      `SELECT orders.id, orders.paid_at AS "paidAt"
       FROM listing_orders orders
       WHERE orders.status = 'paid'
         AND orders.paid_at IS NOT NULL
         AND orders.paid_at <= $1
         AND EXISTS (
           SELECT 1
           FROM listing_order_items items
           LEFT JOIN listing_entitlements entitlements
             ON entitlements.order_item_id = items.id
           WHERE items.order_id = orders.id
             AND entitlements.id IS NULL
         )
       ORDER BY orders.paid_at ASC, orders.id ASC
       LIMIT $2`,
      [paidBefore, batchSize],
    )) as MissingEntitlementOrderRow[];
    const missingEntitlementOrderIds = rows.map((row) => row.id);
    const recoveredOrderIds: string[] = [];
    const recoveryFailures: ListingPaymentReconciliationFailure[] = [];

    for (const row of rows) {
      try {
        const paidAt = new Date(row.paidAt);
        if (Number.isNaN(paidAt.getTime())) {
          throw new Error(
            `Paid order ${row.id} has an invalid payment timestamp`,
          );
        }
        await this.listingEntitlementsService.fulfillPaidOrder(
          row.id,
          paidAt,
        );
        recoveredOrderIds.push(row.id);
      } catch (error) {
        recoveryFailures.push({ id: row.id, error });
      }
    }

    return {
      missingEntitlementOrderIds,
      recoveredOrderIds,
      recoveryFailures,
    };
  }
}

function normalizeBatchSize(value?: number): number {
  if (!Number.isInteger(value) || !value || value < 1) {
    return DEFAULT_BATCH_SIZE;
  }
  return Math.min(value, MAX_BATCH_SIZE);
}

function normalizeNonNegativeInteger(value?: number): number {
  return Number.isInteger(value) && value !== undefined && value >= 0
    ? value
    : 0;
}
