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
import {
  AgencyPlanPromotionApplicationTiming,
  AgencyPlanPromotionDiscountType,
  AgencyPlanPromotionStatus,
} from '../agency-plan-commerce.types';
import { AgencyPlanPromotionCampaign } from './agency-plan-promotion-campaign.entity';
import { AgencyPlanPromotionRedemption } from './agency-plan-promotion-redemption.entity';
import { AgencyPlanPromotionReservation } from './agency-plan-promotion-reservation.entity';

@Entity('agency_plan_promotion_codes')
@Index(['campaignId', 'status'])
@Index(['status', 'startsAt', 'endsAt'])
export class AgencyPlanPromotionCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AgencyPlanPromotionCampaign, (campaign) => campaign.codes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign: AgencyPlanPromotionCampaign;

  @Column({ type: 'uuid', name: 'campaign_id' })
  campaignId: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, name: 'code_hash', unique: true })
  codeHash: string;

  @Column({ type: 'varchar', length: 12, name: 'code_last4', nullable: true })
  codeLast4?: string | null;

  @Column({ type: 'varchar', length: 160 })
  label: string;

  @Column({
    type: 'enum',
    enum: AgencyPlanPromotionStatus,
    enumName: 'agency_plan_promotion_status_enum',
    default: AgencyPlanPromotionStatus.ACTIVE,
  })
  status: AgencyPlanPromotionStatus;

  @Column({
    type: 'enum',
    enum: AgencyPlanPromotionDiscountType,
    enumName: 'agency_plan_promotion_discount_type_enum',
    name: 'discount_type',
    nullable: true,
  })
  discountType?: AgencyPlanPromotionDiscountType | null;

  @Column({ type: 'int', name: 'discount_value', nullable: true })
  discountValue?: number | null;

  @Column({ type: 'int', name: 'max_discount_gross_amount', nullable: true })
  maxDiscountGrossAmount?: number | null;

  @Column({ type: 'int', name: 'duration_billing_cycles', nullable: true })
  durationBillingCycles?: number | null;

  @Column({
    type: 'enum',
    enum: AgencyPlanPromotionApplicationTiming,
    enumName: 'agency_plan_promotion_application_timing_enum',
    name: 'application_timing',
    nullable: true,
  })
  applicationTiming?: AgencyPlanPromotionApplicationTiming | null;

  @Column({ type: 'boolean', name: 'is_combinable', nullable: true })
  isCombinable?: boolean | null;

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

  @Column({ type: 'timestamptz', name: 'archived_at', nullable: true })
  archivedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => AgencyPlanPromotionReservation, (reservation) => reservation.code)
  reservations?: AgencyPlanPromotionReservation[];

  @OneToMany(() => AgencyPlanPromotionRedemption, (redemption) => redemption.code)
  redemptions?: AgencyPlanPromotionRedemption[];
}
