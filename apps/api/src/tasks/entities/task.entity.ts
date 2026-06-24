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
  TaskPriority,
  TaskRelatedEntityType,
  TaskStatus,
  TaskType,
} from '../../common/enums';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Client } from '../../clients/entities/client.entity';
import { Listing } from '../../listings/entities/listing.entity';
import { Agent } from '../../users/entities/agent.entity';

@Entity('tasks')
@Index(['agentId', 'status', 'dueAt'])
@Index(['agentId', 'appointmentId'])
@Index(['agentId', 'clientId'])
@Index(['agentId', 'listingId'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @Column({ type: 'uuid', name: 'agent_id' })
  agentId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Index()
  @Column({
    type: 'enum',
    enum: TaskStatus,
    enumName: 'task_status',
    default: TaskStatus.TODO,
  })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    enumName: 'task_priority',
    default: TaskPriority.NORMAL,
  })
  priority: TaskPriority;

  @Column({
    type: 'enum',
    enum: TaskType,
    enumName: 'task_type',
    default: TaskType.OTHER,
  })
  type: TaskType;

  @Column({
    type: 'enum',
    enum: TaskRelatedEntityType,
    enumName: 'task_related_entity_type',
    name: 'related_entity_type',
    nullable: true,
  })
  relatedEntityType?: TaskRelatedEntityType | null;

  @Column({ type: 'uuid', name: 'related_entity_id', nullable: true })
  relatedEntityId?: string | null;

  @ManyToOne(() => Appointment, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'appointment_id' })
  appointment?: Appointment | null;

  @Column({ type: 'uuid', name: 'appointment_id', nullable: true })
  appointmentId?: string | null;

  @ManyToOne(() => Client, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'client_id' })
  client?: Client | null;

  @Column({ type: 'uuid', name: 'client_id', nullable: true })
  clientId?: string | null;

  @ManyToOne(() => Listing, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'listing_id' })
  listing?: Listing | null;

  @Column({ type: 'uuid', name: 'listing_id', nullable: true })
  listingId?: string | null;

  @Column({ type: 'timestamptz', name: 'due_at', nullable: true })
  dueAt?: Date | null;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
