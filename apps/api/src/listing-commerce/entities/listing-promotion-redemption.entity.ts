import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities';
import { ListingOrder } from './listing-order.entity';
import { ListingPromotionCampaign } from './listing-promotion-campaign.entity';
import { ListingPromotionCode } from './listing-promotion-code.entity';
import { ListingPromotionReservation } from './listing-promotion-reservation.entity';

@Entity('listing_promotion_redemptions')
@Index(['campaignId', 'createdAt'])
@Index(['codeId', 'createdAt'])
@Index(['buyerUserId', 'createdAt'])
@Index(['orderId'])
@Index(['reservationId'], { unique: true, where: 'reservation_id IS NOT NULL' })
export class ListingPromotionRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ListingPromotionCampaign, (campaign) => campaign.redemptions, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign: ListingPromotionCampaign;

  @Column({ type: 'uuid', name: 'campaign_id' })
  campaignId: string;

  @ManyToOne(() => ListingPromotionCode, (code) => code.redemptions, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'code_id' })
  code?: ListingPromotionCode | null;

  @Column({ type: 'uuid', name: 'code_id', nullable: true })
  codeId?: string | null;

  @OneToOne(() => ListingPromotionReservation, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'reservation_id' })
  reservation?: ListingPromotionReservation | null;

  @Column({ type: 'uuid', name: 'reservation_id', nullable: true })
  reservationId?: string | null;

  @OneToOne(() => ListingOrder, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_id' })
  order: ListingOrder;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'buyer_user_id' })
  buyerUser?: User | null;

  @Column({ type: 'uuid', name: 'buyer_user_id', nullable: true })
  buyerUserId?: string | null;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'int', name: 'discount_gross_amount' })
  discountGrossAmount: number;

  @Column({ type: 'jsonb', name: 'pricing_snapshot' })
  pricingSnapshot: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
