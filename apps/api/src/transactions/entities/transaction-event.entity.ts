import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TransactionEventType } from '../../common/enums';
import { Agent } from '../../users/entities/agent.entity';
import { User } from '../../users/entities/user.entity';
import { Transaction } from './transaction.entity';

@Entity('transaction_events')
@Index(['transactionId', 'createdAt'])
@Index(['agentId', 'createdAt'])
export class TransactionEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Transaction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @Column({ type: 'uuid', name: 'transaction_id' })
  transactionId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @Column({ type: 'uuid', name: 'agent_id' })
  agentId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_user_id' })
  actor?: User | null;

  @Column({ type: 'uuid', name: 'actor_user_id', nullable: true })
  actorUserId?: string | null;

  @Column({ type: 'enum', enum: TransactionEventType })
  type: TransactionEventType;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
