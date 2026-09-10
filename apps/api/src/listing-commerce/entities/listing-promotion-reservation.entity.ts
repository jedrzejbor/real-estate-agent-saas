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
import { User } from '../../users/entities';
import { ListingPromotionReservationStatus } from '../listing-commerce.types';
import { ListingOrder } from './listing-order.entity';
import { ListingPromotionCampaign } from './listing-promotion-campaign.entity';
import { ListingPromotionCode } from './listing-promotion-code.entity';

@Entity('listing_promotion_reservations')
@Index(['campaignId', 'status'])
@Index(['codeId', 'status'])
@Index(['buyerUserId', 'status'])
@Index(['orderId'], { unique: true, where: 'order_id IS NOT NULL' })
@Index(['expiresAt', 'status'])
export class ListingPromotionReservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ListingPromotionCampaign, (campaign) => campaign.reservations, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign: ListingPromotionCampaign;

  @Column({ type: 'uuid', name: 'campaign_id' })
  campaignId: string;

  @ManyToOne(() => ListingPromotionCode, (code) => code.reservations, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'code_id' })
  code?: ListingPromotionCode | null;

  @Column({ type: 'uuid', name: 'code_id', nullable: true })
  codeId?: string | null;

  @ManyToOne(() => ListingOrder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  order?: ListingOrder | null;

  @Column({ type: 'uuid', name: 'order_id', nullable: true })
  orderId?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'buyer_user_id' })
  buyerUser?: User | null;

  @Column({ type: 'uuid', name: 'buyer_user_id', nullable: true })
  buyerUserId?: string | null;

  @Column({
    type: 'enum',
    enum: ListingPromotionReservationStatus,
    enumName: 'listing_promotion_reservation_status_enum',
    default: ListingPromotionReservationStatus.RESERVED,
  })
  status: ListingPromotionReservationStatus;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'int', name: 'discount_gross_amount' })
  discountGrossAmount: number;

  @Column({ type: 'jsonb', name: 'pricing_snapshot', default: {} })
  pricingSnapshot: Record<string, unknown>;

  @Column({ type: 'timestamptz', name: 'reserved_at' })
  reservedAt: Date;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', name: 'released_at', nullable: true })
  releasedAt?: Date | null;

  @Column({ type: 'timestamptz', name: 'applied_at', nullable: true })
  appliedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
