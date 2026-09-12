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
import { Listing } from '../../listings/entities';
import { User } from '../../users/entities';
import {
  ListingPromotionDiscountType,
  ListingPromotionTargetRules,
  ListingPromotionTargetScope,
} from '../listing-commerce.types';

@Entity('listing_manual_adjustments')
@Index(['listingId', 'archivedAt', 'startsAt', 'endsAt'])
export class ListingManualAdjustment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Listing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: Listing;

  @Column({ type: 'uuid', name: 'listing_id' })
  listingId: string;

  @Column({ type: 'varchar', length: 160 })
  label: string;

  @Column({ type: 'text' })
  reason: string;

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

  @Column({ type: 'timestamptz', name: 'starts_at' })
  startsAt: Date;

  @Column({ type: 'timestamptz', name: 'ends_at' })
  endsAt: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser?: User | null;

  @Column({ type: 'uuid', name: 'created_by_user_id', nullable: true })
  createdByUserId?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'archived_by_user_id' })
  archivedByUser?: User | null;

  @Column({ type: 'uuid', name: 'archived_by_user_id', nullable: true })
  archivedByUserId?: string | null;

  @Column({ type: 'text', name: 'archived_reason', nullable: true })
  archivedReason?: string | null;

  @Column({ type: 'timestamptz', name: 'archived_at', nullable: true })
  archivedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
