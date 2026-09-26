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
import { Agency } from '../../users/entities';
import {
  AgencyPlanPromotionApplicationTiming,
  AgencyPlanPromotionReservationStatus,
} from '../agency-plan-commerce.types';
import { AgencyPlanQuote } from './agency-plan-quote.entity';
import { AgencyPlanPromotionCampaign } from './agency-plan-promotion-campaign.entity';
import { AgencyPlanPromotionCode } from './agency-plan-promotion-code.entity';

@Entity('agency_plan_promotion_reservations')
@Index(['quoteId', 'status'])
@Index(['campaignId', 'status'])
@Index(['codeId', 'status'])
@Index(['status', 'expiresAt'])
export class AgencyPlanPromotionReservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AgencyPlanQuote, (quote) => quote.promotionReservations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'quote_id' })
  quote: AgencyPlanQuote;

  @Column({ type: 'uuid', name: 'quote_id' })
  quoteId: string;

  @ManyToOne(() => AgencyPlanPromotionCampaign, (campaign) => campaign.reservations, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign: AgencyPlanPromotionCampaign;

  @Column({ type: 'uuid', name: 'campaign_id' })
  campaignId: string;

  @ManyToOne(() => AgencyPlanPromotionCode, (code) => code.reservations, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'code_id' })
  code?: AgencyPlanPromotionCode | null;

  @Column({ type: 'uuid', name: 'code_id', nullable: true })
  codeId?: string | null;

  @ManyToOne(() => Agency, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agency_id' })
  agency?: Agency | null;

  @Column({ type: 'uuid', name: 'agency_id', nullable: true })
  agencyId?: string | null;

  @Column({
    type: 'enum',
    enum: AgencyPlanPromotionReservationStatus,
    enumName: 'agency_plan_promotion_reservation_status_enum',
    default: AgencyPlanPromotionReservationStatus.RESERVED,
  })
  status: AgencyPlanPromotionReservationStatus;

  @Column({ type: 'int', name: 'discount_gross_amount' })
  discountGrossAmount: number;

  @Column({ type: 'int', name: 'duration_billing_cycles' })
  durationBillingCycles: number;

  @Column({
    type: 'enum',
    enum: AgencyPlanPromotionApplicationTiming,
    enumName: 'agency_plan_promotion_application_timing_enum',
    name: 'application_timing',
  })
  applicationTiming: AgencyPlanPromotionApplicationTiming;

  @Column({ type: 'timestamptz', name: 'reserved_at' })
  reservedAt: Date;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', name: 'applied_at', nullable: true })
  appliedAt?: Date | null;

  @Column({ type: 'timestamptz', name: 'released_at', nullable: true })
  releasedAt?: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
