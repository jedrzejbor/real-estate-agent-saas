import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import type { PaymentId, RenewalId } from '../../domain/payment.types';
import { PaymentRepository } from './payment.repository';
import { SubscriptionRepository } from './subscription.repository';
import { SubscriptionRenewal } from './subscription-renewal.entity';

@Injectable()
export class RenewalRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly payments: PaymentRepository,
    private readonly subscriptions: SubscriptionRepository,
  ) {}

  findById(id: RenewalId, manager: EntityManager = this.dataSource.manager): Promise<SubscriptionRenewal | null> {
    return manager.findOneBy(SubscriptionRenewal, { id });
  }

  save(renewal: SubscriptionRenewal, manager: EntityManager = this.dataSource.manager): Promise<SubscriptionRenewal> {
    return manager.save(SubscriptionRenewal, renewal);
  }

  /** Requires a transaction-bound manager. */
  lockById(id: RenewalId, manager: EntityManager): Promise<SubscriptionRenewal | null> {
    if (!manager.queryRunner?.isTransactionActive) throw new Error('Row lock requires a transaction');
    return manager.getRepository(SubscriptionRenewal).createQueryBuilder('renewal')
      .where('renewal.id = :id', { id }).setLock('pessimistic_write').getOne();
  }

  /**
   * Apply an already confirmed local payment. This method never confirms a
   * pending/unknown payment; a later verified-event handler owns that step.
   * All four rows are locked and changed in one database transaction.
   */
  applyConfirmedPayment(input: {
    paymentId: PaymentId;
    renewalId: RenewalId;
    subscriptionId: string;
  }): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      // Stable lock order for all callers of this operation.
      const subscription = await this.subscriptions.lockById(input.subscriptionId, manager);
      const renewal = await this.lockById(input.renewalId, manager);
      const payment = await this.payments.lockById(input.paymentId, manager);
      if (!subscription || !renewal || !payment) throw new Error('Payment, renewal or subscription not found');

      const [agency] = await manager.query(
        'SELECT id FROM agencies WHERE id = $1 FOR UPDATE',
        [subscription.agencyId],
      );
      if (!agency) throw new Error('Agency not found');

      if (payment.status !== 'confirmed') throw new Error('Payment is not confirmed');
      if (renewal.subscriptionId !== subscription.id || payment.renewalId !== renewal.id ||
          payment.agencyId !== agency.id || payment.kind !== 'subscription_renewal' ||
          payment.amountMinor !== renewal.amountMinor || payment.currency !== renewal.currency) {
        throw new Error('Payment and renewal do not match');
      }
      if (renewal.status === 'paid') return;
      if (subscription.currentPeriodEnd && renewal.periodEnd <= subscription.currentPeriodEnd) {
        throw new Error('Renewal would not extend the paid period');
      }

      const now = new Date();
      payment.confirmedAt ??= now;
      renewal.status = 'paid';
      renewal.paidAt = now;
      renewal.nextRetryAt = null;
      subscription.status = 'active';
      subscription.currentPeriodStart = renewal.periodStart;
      subscription.currentPeriodEnd = renewal.periodEnd;
      subscription.nextBillingAt = subscription.cancelAtPeriodEnd ? null : renewal.periodEnd;
      subscription.graceEndsAt = null;

      await this.payments.save(payment, manager);
      await this.save(renewal, manager);
      await this.subscriptions.save(subscription, manager);
      await manager.query(
        `UPDATE agencies SET plan = $2, subscription = 'active',
          current_period_end = $3 WHERE id = $1`,
        [agency.id, subscription.planCode, renewal.periodEnd],
      );
    });
  }
}
