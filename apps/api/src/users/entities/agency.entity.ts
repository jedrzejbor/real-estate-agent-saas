import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AgencyPlan, SubscriptionStatus } from '../../common/enums';
import { Agent } from './agent.entity';

@Entity('agencies')
export class Agency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: SubscriptionStatus.ACTIVE,
  })
  subscription: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: AgencyPlan.FREE,
  })
  plan: string;

  @Column({ type: 'uuid', nullable: true })
  ownerId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // ── Relations ──

  @OneToMany(() => Agent, (agent) => agent.agency)
  agents: Agent[];
}
