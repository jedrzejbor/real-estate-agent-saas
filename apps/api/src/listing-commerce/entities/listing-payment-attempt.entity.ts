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
import { ListingPaymentAttemptStatus } from '../listing-commerce.types';
import { ListingOrder } from './listing-order.entity';

@Entity('listing_payment_attempts')
@Index(['orderId', 'attemptNumber'], { unique: true })
@Index(['orderId', 'createdAt'])
@Index(['provider', 'providerCheckoutSessionId'], {
  unique: true,
  where: 'provider_checkout_session_id IS NOT NULL',
})
@Index(['provider', 'providerPaymentId'], {
  unique: true,
  where: 'provider_payment_id IS NOT NULL',
})
export class ListingPaymentAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ListingOrder, (order) => order.paymentAttempts, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order?: ListingOrder;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @Column({ type: 'int', name: 'attempt_number' })
  attemptNumber: number;

  @Column({ type: 'varchar', length: 40 })
  status: ListingPaymentAttemptStatus;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'int', name: 'amount_gross' })
  amountGross: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

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
    name: 'provider_payment_id',
    nullable: true,
  })
  providerPaymentId?: string | null;

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

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
