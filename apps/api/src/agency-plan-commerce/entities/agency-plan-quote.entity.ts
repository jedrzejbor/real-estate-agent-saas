import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AgencyPlan } from '../../common/enums';
import { PlanCatalog } from '../../plans/entities';
import { Agency, User } from '../../users/entities';
import type { AgencyPlanQuoteContract } from '../contracts';
import {
  AgencyPlanBillingInterval,
  AgencyPlanQuoteStatus,
} from '../agency-plan-commerce.types';
import { AgencyPlanCheckoutAttempt } from './agency-plan-checkout-attempt.entity';
import { AgencyPlanPromotionReservation } from './agency-plan-promotion-reservation.entity';

@Entity('agency_plan_quotes')
@Index(['agencyId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['status', 'expiresAt'])
export class AgencyPlanQuote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId?: string | null;

  @ManyToOne(() => Agency, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agency_id' })
  agency?: Agency | null;

  @Column({ type: 'uuid', name: 'agency_id', nullable: true })
  agencyId?: string | null;

  @ManyToOne(() => PlanCatalog, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'plan_code' })
  plan?: PlanCatalog | null;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'plan_code',
  })
  planCode: AgencyPlan;

  @Column({
    type: 'enum',
    enum: AgencyPlanBillingInterval,
    enumName: 'agency_plan_billing_interval_enum',
    name: 'billing_interval',
  })
  billingInterval: AgencyPlanBillingInterval;

  @Column({
    type: 'enum',
    enum: AgencyPlanQuoteStatus,
    enumName: 'agency_plan_quote_status_enum',
    default: AgencyPlanQuoteStatus.QUOTED,
  })
  status: AgencyPlanQuoteStatus;

  @Column({ type: 'varchar', length: 3, default: 'PLN' })
  currency: 'PLN';

  @Column({ type: 'int', name: 'subtotal_gross_amount' })
  subtotalGrossAmount: number;

  @Column({ type: 'int', name: 'discount_gross_amount', default: 0 })
  discountGrossAmount: number;

  @Column({ type: 'int', name: 'total_gross_amount' })
  totalGrossAmount: number;

  @Column({ type: 'jsonb', name: 'pricing_snapshot' })
  pricingSnapshot: AgencyPlanQuoteContract;

  @Column({ type: 'timestamptz', name: 'quoted_at' })
  quotedAt: Date;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => AgencyPlanPromotionReservation, (reservation) => reservation.quote)
  promotionReservations?: AgencyPlanPromotionReservation[];

  @OneToMany(() => AgencyPlanCheckoutAttempt, (attempt) => attempt.quote)
  checkoutAttempts?: AgencyPlanCheckoutAttempt[];
}
