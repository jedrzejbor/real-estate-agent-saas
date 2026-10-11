import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  PaymentAmountMinor,
  PaymentCurrency,
  RenewalAttemptStatus,
  RenewalId,
  RenewalStatus,
} from '../../domain/payment.types';

@Entity('subscription_renewals')
@Index('uq_subscription_renewals_period', ['subscriptionId', 'periodStart'], {
  unique: true,
})
@Index('idx_subscription_renewals_next_retry', ['nextRetryAt'])
export class SubscriptionRenewal {
  @PrimaryGeneratedColumn('uuid')
  id: RenewalId;

  @Column({ type: 'uuid', name: 'subscription_id' })
  subscriptionId: string;

  @Column({ type: 'timestamptz', name: 'period_start' })
  periodStart: Date;

  @Column({ type: 'timestamptz', name: 'period_end' })
  periodEnd: Date;

  @Column({ type: 'int', name: 'amount_minor' })
  amountMinor: PaymentAmountMinor;

  @Column({ type: 'varchar', length: 3, default: 'PLN' })
  currency: PaymentCurrency;

  @Column({ type: 'varchar', length: 20, default: 'due' })
  status: RenewalStatus;

  @Column({ type: 'timestamptz', name: 'next_retry_at', nullable: true })
  nextRetryAt: Date | null;

  @Column({ type: 'timestamptz', name: 'paid_at', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}

@Entity('subscription_renewal_attempts')
@Index('uq_subscription_renewal_attempt_number', ['renewalId', 'attemptNo'], {
  unique: true,
})
@Index('uq_subscription_renewal_open_attempt', ['renewalId'], {
  unique: true,
  where: "status IN ('charging', 'unknown', 'paid')",
})
export class SubscriptionRenewalAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'renewal_id' })
  renewalId: RenewalId;

  @Column({ type: 'int', name: 'attempt_no' })
  attemptNo: number;

  @Column({ type: 'varchar', length: 20 })
  status: RenewalAttemptStatus;

  @Column({ type: 'uuid', name: 'payment_id', nullable: true })
  paymentId: string | null;

  @Column({ type: 'varchar', length: 255, name: 'provider_transaction_id', nullable: true })
  providerTransactionId: string | null;

  @Column({ type: 'varchar', length: 100, name: 'failure_code', nullable: true })
  failureCode: string | null;

  @Column({ type: 'timestamptz', name: 'resolved_at', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
