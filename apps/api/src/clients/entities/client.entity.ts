import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ClientSource, ClientStatus } from '../../common/enums';
import { Agent } from '../../users/entities/agent.entity';
import { ClientNote } from './client-note.entity';
import { ClientPreference } from './client-preference.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  firstName: string;

  @Column({ type: 'varchar', length: 255 })
  lastName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Index()
  @Column({ type: 'enum', enum: ClientSource, default: ClientSource.OTHER })
  source: ClientSource;

  @Index()
  @Column({ type: 'enum', enum: ClientStatus, default: ClientStatus.NEW })
  status: ClientStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  budgetMin: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  budgetMax: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // ── Relations ──

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @Index()
  @Column({ type: 'uuid' })
  agentId: string;

  @OneToMany(() => ClientNote, (note) => note.client, {
    cascade: true,
    eager: false,
  })
  clientNotes: ClientNote[];

  @OneToOne(() => ClientPreference, (pref) => pref.client, {
    cascade: true,
    eager: true,
  })
  preference: ClientPreference;
}
