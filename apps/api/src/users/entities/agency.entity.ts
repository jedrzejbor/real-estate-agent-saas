import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AgencyPlan, SubscriptionStatus } from '../../common/enums';
import type { AgencyPlanOverrides } from '../agency-plan.types';
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

  @Column({ type: 'jsonb', name: 'plan_overrides', nullable: true })
  planOverrides?: AgencyPlanOverrides | null;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'billing_customer_id',
    nullable: true,
  })
  billingCustomerId?: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'billing_subscription_id',
    nullable: true,
  })
  billingSubscriptionId?: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'billing_interval',
    nullable: true,
  })
  billingInterval?: 'monthly' | 'yearly' | null;

  @Column({ type: 'timestamptz', name: 'current_period_end', nullable: true })
  currentPeriodEnd?: Date | null;

  @Column({ type: 'timestamptz', name: 'trial_ends_at', nullable: true })
  trialEndsAt?: Date | null;

  @Column({ type: 'timestamptz', name: 'plan_changed_at', nullable: true })
  planChangedAt?: Date | null;

  @Column({
    type: 'timestamptz',
    name: 'limit_grace_started_at',
    nullable: true,
  })
  limitGraceStartedAt?: Date | null;

  @Column({
    type: 'timestamptz',
    name: 'limit_grace_ends_at',
    nullable: true,
  })
  limitGraceEndsAt?: Date | null;

  @Column({
    type: 'timestamptz',
    name: 'limit_grace_enforced_at',
    nullable: true,
  })
  limitGraceEnforcedAt?: Date | null;

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
