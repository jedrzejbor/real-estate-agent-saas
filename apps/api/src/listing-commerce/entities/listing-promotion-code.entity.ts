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
  ListingPromotionCampaignStatus,
  ListingPromotionDiscountType,
} from '../listing-commerce.types';
import { ListingPromotionCampaign } from './listing-promotion-campaign.entity';
import { ListingPromotionRedemption } from './listing-promotion-redemption.entity';
import { ListingPromotionReservation } from './listing-promotion-reservation.entity';

@Entity('listing_promotion_codes')
@Index(['campaignId', 'status'])
@Index(['status', 'startsAt', 'endsAt'])
export class ListingPromotionCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ListingPromotionCampaign, (campaign) => campaign.codes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign: ListingPromotionCampaign;

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
    enum: ListingPromotionCampaignStatus,
    enumName: 'listing_promotion_campaign_status_enum',
    default: ListingPromotionCampaignStatus.ACTIVE,
  })
  status: ListingPromotionCampaignStatus;

  @Column({
    type: 'enum',
    enum: ListingPromotionDiscountType,
    enumName: 'listing_promotion_discount_type_enum',
    name: 'discount_type',
    nullable: true,
  })
  discountType?: ListingPromotionDiscountType | null;

  @Column({ type: 'int', name: 'discount_value', nullable: true })
  discountValue?: number | null;

  @Column({ type: 'int', name: 'max_discount_gross_amount', nullable: true })
  maxDiscountGrossAmount?: number | null;

  @Column({ type: 'boolean', name: 'is_combinable', nullable: true })
  isCombinable?: boolean | null;

  @Column({ type: 'int', name: 'usage_limit_total', nullable: true })
  usageLimitTotal?: number | null;

  @Column({ type: 'int', name: 'usage_limit_per_user', nullable: true })
  usageLimitPerUser?: number | null;

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

  @OneToMany(() => ListingPromotionReservation, (reservation) => reservation.code)
  reservations?: ListingPromotionReservation[];

  @OneToMany(() => ListingPromotionRedemption, (redemption) => redemption.code)
  redemptions?: ListingPromotionRedemption[];
}
