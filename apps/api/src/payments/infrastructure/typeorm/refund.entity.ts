import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { PaymentId } from '../../domain/payment.types';
import { Payment } from './payment.entity';

export type RefundStatus = 'requesting' | 'unknown' | 'pending' | 'confirmed' | 'failed';

/** A durable refund intent. No order or entitlement projection is changed here. */
@Entity('refunds')
@Index('uq_refunds_payment_intent', ['paymentId', 'intentKey'], { unique: true })
@Index('uq_refunds_provider_reference', ['provider', 'providerRefundId'], {
  unique: true, where: 'provider_refund_id IS NOT NULL',
})
@Index('idx_refunds_payment_status', ['paymentId', 'status'])
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'payment_id' })
  paymentId: PaymentId;

  @ManyToOne(() => Payment, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @Column({ type: 'varchar', length: 128, name: 'intent_key' })
  intentKey: string;

  @Column({ type: 'varchar', length: 16 })
  kind: 'full' | 'partial';

  @Column({ type: 'int', name: 'amount_minor' })
  amountMinor: number;

  @Column({ type: 'varchar', length: 3 })
  currency: 'PLN';

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'varchar', length: 255, name: 'provider_transaction_id' })
  providerTransactionId: string;

  @Column({ type: 'varchar', length: 255, name: 'provider_refund_id', nullable: true })
  providerRefundId: string | null;

  @Column({ type: 'varchar', length: 20 })
  status: RefundStatus;

  @Column({ type: 'timestamptz', name: 'confirmed_at', nullable: true })
  confirmedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
