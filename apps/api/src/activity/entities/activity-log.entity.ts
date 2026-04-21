import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Agent } from '../../users/entities/agent.entity';
import { ActivityAction, ActivityEntityType } from '../../common/enums';

export interface ActivityLogChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

@Entity('activity_logs')
@Index(['agentId', 'entityType', 'entityId', 'createdAt'])
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ActivityEntityType })
  entityType: ActivityEntityType;

  @Column({ type: 'uuid' })
  entityId: string;

  @Column({ type: 'enum', enum: ActivityAction })
  action: ActivityAction;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  changes: ActivityLogChange[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @Column({ type: 'uuid', name: 'agent_id' })
  agentId: string;
}
