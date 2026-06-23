import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('billing_webhook_events')
@Index(['provider', 'eventId'], { unique: true })
export class BillingWebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'varchar', length: 255, name: 'event_id' })
  eventId: string;

  @Column({ type: 'varchar', length: 80, name: 'event_type' })
  eventType: string;

  @Column({ type: 'varchar', length: 40 })
  status: 'processed' | 'failed';

  @Column({ type: 'uuid', name: 'agency_id', nullable: true })
  agencyId?: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  payload: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  error?: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'processed_at' })
  processedAt: Date;
}
