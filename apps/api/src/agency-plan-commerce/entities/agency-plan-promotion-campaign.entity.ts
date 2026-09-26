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
import { User } from '../../users/entities';
import {
  AgencyPlanPromotionApplicationTiming,
  AgencyPlanPromotionDiscountType,
  AgencyPlanPromotionStatus,
  AgencyPlanPromotionTargetRules,
  AgencyPlanPromotionTargetScope,
} from '../agency-plan-commerce.types';
import { AgencyPlanPromotionCode } from './agency-plan-promotion-code.entity';
import { AgencyPlanPromotionRedemption } from './agency-plan-promotion-redemption.entity';
import { AgencyPlanPromotionReservation } from './agency-plan-promotion-reservation.entity';

@Entity('agency_plan_promotion_campaigns')
@Index(['status', 'startsAt', 'endsAt'])
@Index(['targetScope', 'status'])
export class AgencyPlanPromotionCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 80, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    type: 'enum',
    enum: AgencyPlanPromotionStatus,
    enumName: 'agency_plan_promotion_status_enum',
    default: AgencyPlanPromotionStatus.DRAFT,
  })
  status: AgencyPlanPromotionStatus;

  @Column({
    type: 'enum',
    enum: AgencyPlanPromotionDiscountType,
    enumName: 'agency_plan_promotion_discount_type_enum',
    name: 'discount_type',
  })
  discountType: AgencyPlanPromotionDiscountType;

  @Column({ type: 'int', name: 'discount_value' })
  discountValue: number;

  @Column({ type: 'int', name: 'max_discount_gross_amount', nullable: true })
  maxDiscountGrossAmount?: number | null;

  @Column({
    type: 'enum',
    enum: AgencyPlanPromotionTargetScope,
    enumName: 'agency_plan_promotion_target_scope_enum',
    name: 'target_scope',
    default: AgencyPlanPromotionTargetScope.ALL_PLANS,
  })
  targetScope: AgencyPlanPromotionTargetScope;

  @Column({ type: 'jsonb', name: 'target_rules', default: {} })
  targetRules: AgencyPlanPromotionTargetRules;

  @Column({ type: 'int', name: 'duration_billing_cycles', default: 1 })
  durationBillingCycles: number;

  @Column({
    type: 'enum',
    enum: AgencyPlanPromotionApplicationTiming,
    enumName: 'agency_plan_promotion_application_timing_enum',
    name: 'application_timing',
    default: AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
  })
  applicationTiming: AgencyPlanPromotionApplicationTiming;

  @Column({ type: 'boolean', name: 'is_automatic', default: false })
  isAutomatic: boolean;

  @Column({ type: 'boolean', name: 'is_combinable', default: false })
  isCombinable: boolean;

  @Column({ type: 'int', name: 'usage_limit_total', nullable: true })
  usageLimitTotal?: number | null;

  @Column({ type: 'int', name: 'usage_limit_per_account', nullable: true })
  usageLimitPerAccount?: number | null;

  @Column({ type: 'int', name: 'usage_count', default: 0 })
  usageCount: number;

  @Column({ type: 'timestamptz', name: 'starts_at', nullable: true })
  startsAt?: Date | null;

  @Column({ type: 'timestamptz', name: 'ends_at', nullable: true })
  endsAt?: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser?: User | null;

  @Column({ type: 'uuid', name: 'created_by_user_id', nullable: true })
  createdByUserId?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by_user_id' })
  updatedByUser?: User | null;

  @Column({ type: 'uuid', name: 'updated_by_user_id', nullable: true })
  updatedByUserId?: string | null;

  @Column({ type: 'timestamptz', name: 'archived_at', nullable: true })
  archivedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => AgencyPlanPromotionCode, (code) => code.campaign)
  codes?: AgencyPlanPromotionCode[];

  @OneToMany(() => AgencyPlanPromotionReservation, (reservation) => reservation.campaign)
  reservations?: AgencyPlanPromotionReservation[];

  @OneToMany(() => AgencyPlanPromotionRedemption, (redemption) => redemption.campaign)
  redemptions?: AgencyPlanPromotionRedemption[];
}
