import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('analytics_events')
@Index(['agencyId', 'name', 'createdAt'])
@Index(['userId', 'name', 'createdAt'])
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'agent_id', nullable: true })
  agentId?: string | null;

  @Column({ type: 'uuid', name: 'agency_id', nullable: true })
  agencyId?: string | null;

  @Column({ type: 'varchar', length: 50, name: 'plan_code', nullable: true })
  planCode?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  path?: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  properties: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
