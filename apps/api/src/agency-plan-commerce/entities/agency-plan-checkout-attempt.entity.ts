import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AgencyPlanCheckoutAttemptStatus } from '../agency-plan-commerce.types';
import { AgencyPlanQuote } from './agency-plan-quote.entity';

@Entity('agency_plan_checkout_attempts')
@Index(['quoteId', 'attemptNumber'], { unique: true })
@Index(['quoteId', 'createdAt'])
@Index(['provider', 'providerCheckoutSessionId'], {
  unique: true,
  where: 'provider_checkout_session_id IS NOT NULL',
})
@Index(['provider', 'providerSubscriptionId'], {
  unique: true,
  where: 'provider_subscription_id IS NOT NULL',
})
export class AgencyPlanCheckoutAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AgencyPlanQuote, (quote) => quote.checkoutAttempts, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'quote_id' })
  quote?: AgencyPlanQuote;

  @Column({ type: 'uuid', name: 'quote_id' })
  quoteId: string;

  @Column({ type: 'int', name: 'attempt_number' })
  attemptNumber: number;

  @Column({
    type: 'enum',
    enum: AgencyPlanCheckoutAttemptStatus,
    enumName: 'agency_plan_checkout_attempt_status_enum',
    default: AgencyPlanCheckoutAttemptStatus.CREATING,
  })
  status: AgencyPlanCheckoutAttemptStatus;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'int', name: 'amount_gross' })
  amountGross: number;

  @Column({ type: 'varchar', length: 3 })
  currency: 'PLN';

  @Column({
    type: 'varchar',
    length: 255,
    name: 'provider_checkout_session_id',
    nullable: true,
  })
  providerCheckoutSessionId?: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'provider_subscription_id',
    nullable: true,
  })
  providerSubscriptionId?: string | null;

  @Column({ type: 'varchar', length: 100, name: 'failure_code', nullable: true })
  failureCode?: string | null;

  @Column({ type: 'text', name: 'failure_message', nullable: true })
  failureMessage?: string | null;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt?: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
