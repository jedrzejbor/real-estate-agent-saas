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
  TransactionTaskPriority,
  TransactionTaskStatus,
} from '../../common/enums';
import { Agent } from '../../users/entities/agent.entity';
import { Transaction } from './transaction.entity';

@Entity('transaction_tasks')
@Index(['agentId', 'transactionId'])
@Index(['transactionId', 'status'])
@Index(['agentId', 'dueDate'])
export class TransactionTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Transaction, (transaction) => transaction.tasks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @Column({ type: 'uuid', name: 'transaction_id' })
  transactionId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @Column({ type: 'uuid', name: 'agent_id' })
  agentId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({
    type: 'enum',
    enum: TransactionTaskStatus,
    default: TransactionTaskStatus.TODO,
  })
  status: TransactionTaskStatus;

  @Column({
    type: 'enum',
    enum: TransactionTaskPriority,
    default: TransactionTaskPriority.NORMAL,
  })
  priority: TransactionTaskPriority;

  @Column({ type: 'timestamptz', nullable: true })
  dueDate?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
