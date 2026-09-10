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
  ListingPromotionCampaignStatus,
  ListingPromotionDiscountType,
  ListingPromotionTargetRules,
  ListingPromotionTargetScope,
} from '../listing-commerce.types';
import { ListingPromotionCode } from './listing-promotion-code.entity';
import { ListingPromotionRedemption } from './listing-promotion-redemption.entity';
import { ListingPromotionReservation } from './listing-promotion-reservation.entity';

@Entity('listing_promotion_campaigns')
@Index(['status', 'startsAt', 'endsAt'])
@Index(['targetScope', 'status'])
export class ListingPromotionCampaign {
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
    enum: ListingPromotionCampaignStatus,
    enumName: 'listing_promotion_campaign_status_enum',
    default: ListingPromotionCampaignStatus.DRAFT,
  })
  status: ListingPromotionCampaignStatus;

  @Column({
    type: 'enum',
    enum: ListingPromotionDiscountType,
    enumName: 'listing_promotion_discount_type_enum',
    name: 'discount_type',
  })
  discountType: ListingPromotionDiscountType;

  @Column({ type: 'int', name: 'discount_value' })
  discountValue: number;

  @Column({ type: 'int', name: 'max_discount_gross_amount', nullable: true })
  maxDiscountGrossAmount?: number | null;

  @Column({
    type: 'enum',
    enum: ListingPromotionTargetScope,
    enumName: 'listing_promotion_target_scope_enum',
    name: 'target_scope',
    default: ListingPromotionTargetScope.ALL_PRODUCTS,
  })
  targetScope: ListingPromotionTargetScope;

  @Column({ type: 'jsonb', name: 'target_rules', default: {} })
  targetRules: ListingPromotionTargetRules;

  @Column({ type: 'boolean', name: 'is_automatic', default: false })
  isAutomatic: boolean;

  @Column({ type: 'boolean', name: 'is_combinable', default: false })
  isCombinable: boolean;

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

  @OneToMany(() => ListingPromotionCode, (code) => code.campaign)
  codes?: ListingPromotionCode[];

  @OneToMany(() => ListingPromotionReservation, (reservation) => reservation.campaign)
  reservations?: ListingPromotionReservation[];

  @OneToMany(() => ListingPromotionRedemption, (redemption) => redemption.campaign)
  redemptions?: ListingPromotionRedemption[];
}
