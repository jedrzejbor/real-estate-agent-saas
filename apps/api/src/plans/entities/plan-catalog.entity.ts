import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  AgencyPlanFeatures,
  AgencyPlanLimits,
} from '../../users/agency-plan.types';

@Entity('plan_catalog')
export class PlanCatalog {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  label: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'int', name: 'price_monthly_pln', default: 0 })
  priceMonthlyPln: number;

  @Column({ type: 'int', name: 'price_yearly_pln', default: 0 })
  priceYearlyPln: number;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'stripe_price_id_monthly',
    nullable: true,
  })
  stripePriceIdMonthly?: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'stripe_price_id_yearly',
    nullable: true,
  })
  stripePriceIdYearly?: string | null;

  @Column({ type: 'jsonb', default: {} })
  limits: Partial<AgencyPlanLimits>;

  @Column({ type: 'jsonb', default: {} })
  features: Partial<AgencyPlanFeatures>;

  @Column({ type: 'boolean', name: 'is_public', default: true })
  isPublic: boolean;

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
