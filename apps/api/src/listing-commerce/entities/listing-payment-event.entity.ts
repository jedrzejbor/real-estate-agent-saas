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
import {
  ListingPaymentEventStatus,
  ListingPaymentEventType,
} from '../listing-commerce.types';
import { ListingOrder } from './listing-order.entity';

@Entity('listing_payment_events')
@Index(['provider', 'eventId'], { unique: true })
@Index(['orderId', 'createdAt'])
export class ListingPaymentEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'varchar', length: 255, name: 'event_id' })
  eventId: string;

  @Column({ type: 'varchar', length: 80, name: 'event_type' })
  eventType: ListingPaymentEventType;

  @Column({ type: 'varchar', length: 40 })
  status: ListingPaymentEventStatus;

  @ManyToOne(() => ListingOrder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  order?: ListingOrder | null;

  @Column({ type: 'uuid', name: 'order_id', nullable: true })
  orderId?: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  payload: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  error?: string | null;

  @Column({ type: 'timestamptz', name: 'occurred_at' })
  occurredAt: Date;

  @Column({ type: 'timestamptz', name: 'processed_at', nullable: true })
  processedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
