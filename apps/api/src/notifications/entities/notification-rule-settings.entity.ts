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
import { Agent } from '../../users/entities/agent.entity';

@Entity('notification_rule_settings')
@Index(['agentId'], { unique: true })
export class NotificationRuleSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @Column({ type: 'uuid', name: 'agent_id' })
  agentId: string;

  @Column({ type: 'int', name: 'follow_up_overdue_days', default: 0 })
  followUpOverdueDays: number;

  @Column({ type: 'int', name: 'stale_listing_days', default: 14 })
  staleListingDays: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
