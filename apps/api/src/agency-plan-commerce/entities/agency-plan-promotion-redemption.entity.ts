import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AgencyPlan } from '../../common/enums';
import { Agency } from '../../users/entities';
import {
  AgencyPlanBillingInterval,
  AgencyPlanPromotionApplicationTiming,
  AgencyPlanPromotionDiscountSourceType,
} from '../agency-plan-commerce.types';
import { AgencyPlanQuote } from './agency-plan-quote.entity';
import { AgencyPlanPromotionCampaign } from './agency-plan-promotion-campaign.entity';
import { AgencyPlanPromotionCode } from './agency-plan-promotion-code.entity';
import { AgencyPlanPromotionReservation } from './agency-plan-promotion-reservation.entity';

@Entity('agency_plan_promotion_redemptions')
@Index(['agencyId', 'createdAt'])
@Index(['campaignId', 'createdAt'])
@Index(['codeId', 'createdAt'])
@Index(['reservationId'], { unique: true, where: 'reservation_id IS NOT NULL' })
export class AgencyPlanPromotionRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Agency, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agency_id' })
  agency?: Agency | null;

  @Column({ type: 'uuid', name: 'agency_id', nullable: true })
  agencyId?: string | null;

  @ManyToOne(() => AgencyPlanQuote, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'quote_id' })
  quote?: AgencyPlanQuote | null;

  @Column({ type: 'uuid', name: 'quote_id', nullable: true })
  quoteId?: string | null;

  @ManyToOne(() => AgencyPlanPromotionCampaign, (campaign) => campaign.redemptions, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign: AgencyPlanPromotionCampaign;

  @Column({ type: 'uuid', name: 'campaign_id' })
  campaignId: string;

  @ManyToOne(() => AgencyPlanPromotionCode, (code) => code.redemptions, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'code_id' })
  code?: AgencyPlanPromotionCode | null;

  @Column({ type: 'uuid', name: 'code_id', nullable: true })
  codeId?: string | null;

  @ManyToOne(() => AgencyPlanPromotionReservation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reservation_id' })
  reservation?: AgencyPlanPromotionReservation | null;

  @Column({ type: 'uuid', name: 'reservation_id', nullable: true })
  reservationId?: string | null;

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

  @Column({ type: 'varchar', length: 3, default: 'PLN' })
  currency: 'PLN';

  @Column({ type: 'int', name: 'subtotal_gross_amount' })
  subtotalGrossAmount: number;

  @Column({ type: 'int', name: 'discount_gross_amount' })
  discountGrossAmount: number;

  @Column({ type: 'int', name: 'total_gross_amount' })
  totalGrossAmount: number;

  @Column({ type: 'int', name: 'duration_billing_cycles' })
  durationBillingCycles: number;

  @Column({
    type: 'enum',
    enum: AgencyPlanPromotionApplicationTiming,
    enumName: 'agency_plan_promotion_application_timing_enum',
    name: 'application_timing',
  })
  applicationTiming: AgencyPlanPromotionApplicationTiming;

  @Column({ type: 'varchar', length: 32, name: 'source_type' })
  sourceType: AgencyPlanPromotionDiscountSourceType;

  @Column({ type: 'jsonb', name: 'pricing_snapshot' })
  pricingSnapshot: Record<string, unknown>;

  @Column({ type: 'varchar', length: 255, name: 'billing_event_id', nullable: true })
  billingEventId?: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
