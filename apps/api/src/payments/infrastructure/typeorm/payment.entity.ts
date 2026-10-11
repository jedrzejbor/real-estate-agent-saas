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
  PaymentId,
  PaymentKind,
  PaymentStatus,
} from '../../domain/payment.types';

@Entity('payments')
@Index('uq_payments_provider_transaction', ['provider', 'providerTransactionId'], {
  unique: true,
  where: 'provider_transaction_id IS NOT NULL',
})
@Index('idx_payments_order_created', ['orderId', 'createdAt'])
@Index('idx_payments_quote_created', ['quoteId', 'createdAt'])
@Index('idx_payments_renewal_created', ['renewalId', 'createdAt'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: PaymentId;

  @Column({ type: 'varchar', length: 32 })
  kind: PaymentKind;

  @Column({ type: 'uuid', name: 'order_id', nullable: true })
  orderId: string | null;

  @Column({ type: 'uuid', name: 'quote_id', nullable: true })
  quoteId: string | null;

  @Column({ type: 'uuid', name: 'renewal_id', nullable: true })
  renewalId: string | null;

  @Column({ type: 'uuid', name: 'buyer_user_id', nullable: true })
  buyerUserId: string | null;

  @Column({ type: 'uuid', name: 'agency_id', nullable: true })
  agencyId: string | null;

  @Column({ type: 'uuid', name: 'correlation_id', nullable: true })
  correlationId: string | null;

  @Column({ type: 'int', name: 'amount_minor' })
  amountMinor: PaymentAmountMinor;

  @Column({ type: 'varchar', length: 3, default: 'PLN' })
  currency: PaymentCurrency;

  @Column({ type: 'varchar', length: 32 })
  status: PaymentStatus;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'provider_transaction_id',
    nullable: true,
  })
  providerTransactionId: string | null;

  @Column({ type: 'varchar', length: 255, name: 'provider_title', nullable: true })
  providerTitle: string | null;

  @Column({ type: 'int', name: 'attempt_no', default: 1 })
  attemptNo: number;

  @Column({ type: 'varchar', length: 100, name: 'failure_code', nullable: true })
  failureCode: string | null;

  @Column({ type: 'timestamptz', name: 'confirmed_at', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
