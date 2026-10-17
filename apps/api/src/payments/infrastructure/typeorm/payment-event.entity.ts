import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Minimal durable record of a verified provider notification; no raw payload. */
@Entity('payment_events')
@Index('uq_payment_events_provider_key', ['provider', 'eventKey'], { unique: true })
@Index('idx_payment_events_payment_received', ['paymentId', 'receivedAt'])
export class PaymentEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'varchar', length: 64, name: 'event_key' })
  eventKey: string;

  @Column({ type: 'varchar', length: 32, name: 'event_type' })
  eventType: string;

  @Column({ type: 'varchar', length: 255, name: 'provider_reference' })
  providerReference: string;

  @Column({ type: 'varchar', length: 32, name: 'provider_status' })
  providerStatus: string;

  @Column({ type: 'varchar', length: 64, name: 'merchant_reference' })
  merchantReference: string;

  @Column({ type: 'varchar', length: 255, name: 'correlation_reference', nullable: true })
  correlationReference: string | null;

  @Column({ type: 'uuid', name: 'payment_id', nullable: true })
  paymentId: string | null;

  @Column({ type: 'int', name: 'amount_minor', nullable: true })
  amountMinor: number | null;

  @Column({ type: 'int', name: 'paid_minor', nullable: true })
  paidMinor: number | null;

  @Column({ type: 'varchar', length: 3, nullable: true })
  currency: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'received_at' })
  receivedAt: Date;
}
