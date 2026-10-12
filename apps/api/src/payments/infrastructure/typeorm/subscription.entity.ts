import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { PaymentAmountMinor, PaymentCurrency } from '../../domain/payment.types';

export type LocalSubscriptionStatus =
  | 'pending'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired';

@Entity('subscriptions')
@Index('uq_subscriptions_agency_open', ['agencyId'], {
  unique: true,
  where: "status IN ('active', 'past_due')",
})
@Index('idx_subscriptions_next_billing', ['nextBillingAt'])
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'agency_id' })
  agencyId: string;

  @Column({ type: 'varchar', length: 50, name: 'plan_code' })
  planCode: string;

  @Column({ type: 'int', name: 'price_amount_minor' })
  priceAmountMinor: PaymentAmountMinor;

  @Column({ type: 'varchar', length: 3, default: 'PLN' })
  currency: PaymentCurrency;

  @Column({ type: 'varchar', length: 20, name: 'billing_interval', default: 'monthly' })
  billingInterval: 'monthly';

  @Column({ type: 'varchar', length: 20 })
  status: LocalSubscriptionStatus;

  @Column({ type: 'timestamptz', name: 'current_period_start', nullable: true })
  currentPeriodStart: Date | null;

  @Column({ type: 'timestamptz', name: 'current_period_end', nullable: true })
  currentPeriodEnd: Date | null;

  @Column({ type: 'timestamptz', name: 'next_billing_at', nullable: true })
  nextBillingAt: Date | null;

  @Column({ type: 'timestamptz', name: 'grace_ends_at', nullable: true })
  graceEndsAt: Date | null;

  @Column({ type: 'boolean', name: 'cancel_at_period_end', default: false })
  cancelAtPeriodEnd: boolean;

  @Column({ type: 'timestamptz', name: 'cancelled_at', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  provider: string | null;

  @Column({ type: 'uuid', name: 'authorization_id', nullable: true })
  authorizationId: string | null;

  @Column({ type: 'int', default: 1 })
  version: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
