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
import { Listing } from '../../listings/entities';
import { User } from '../../users/entities';
import type { ListingQuoteContract } from '../contracts';
import {
  ListingOrderBuyerSnapshot,
  ListingOrderStatus,
} from '../listing-commerce.types';
import { ListingOrderItem } from './listing-order-item.entity';
import { ListingPaymentAttempt } from './listing-payment-attempt.entity';

@Entity('listing_orders')
@Index(['buyerUserId', 'createdAt'])
@Index(['listingId', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['provider', 'providerCheckoutSessionId'], {
  unique: true,
  where: 'provider IS NOT NULL AND provider_checkout_session_id IS NOT NULL',
})
@Index(['provider', 'providerPaymentId'], {
  unique: true,
  where: 'provider IS NOT NULL AND provider_payment_id IS NOT NULL',
})
export class ListingOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 40, name: 'order_number', unique: true })
  orderNumber: string;

  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 120,
    name: 'idempotency_key',
    unique: true,
  })
  idempotencyKey: string;

  @ManyToOne(() => Listing, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'listing_id' })
  listing?: Listing | null;

  @Column({ type: 'uuid', name: 'listing_id', nullable: true })
  listingId?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'buyer_user_id' })
  buyerUser?: User | null;

  @Column({ type: 'uuid', name: 'buyer_user_id', nullable: true })
  buyerUserId?: string | null;

  @Index()
  @Column({
    type: 'enum',
    enum: ListingOrderStatus,
    enumName: 'listing_order_status_enum',
    default: ListingOrderStatus.DRAFT,
  })
  status: ListingOrderStatus;

  @Column({ type: 'varchar', length: 3, default: 'PLN' })
  currency: string;

  @Column({ type: 'int', name: 'subtotal_gross_amount' })
  subtotalGrossAmount: number;

  @Column({ type: 'int', name: 'discount_gross_amount', default: 0 })
  discountGrossAmount: number;

  @Column({ type: 'int', name: 'total_gross_amount' })
  totalGrossAmount: number;

  @Column({ type: 'int', name: 'vat_gross_amount', nullable: true })
  vatGrossAmount?: number | null;

  @Column({ type: 'jsonb', name: 'buyer_snapshot' })
  buyerSnapshot: ListingOrderBuyerSnapshot;

  @Column({ type: 'jsonb', name: 'pricing_snapshot' })
  pricingSnapshot: ListingQuoteContract;

  @Index()
  @Column({ type: 'timestamptz', name: 'quote_expires_at' })
  quoteExpiresAt: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  provider?: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'provider_checkout_session_id',
    nullable: true,
  })
  providerCheckoutSessionId?: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'provider_payment_id',
    nullable: true,
  })
  providerPaymentId?: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @Column({ type: 'timestamptz', name: 'paid_at', nullable: true })
  paidAt?: Date | null;

  @Column({ type: 'timestamptz', name: 'cancelled_at', nullable: true })
  cancelledAt?: Date | null;

  @Column({ type: 'timestamptz', name: 'refunded_at', nullable: true })
  refundedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ListingOrderItem, (item) => item.order)
  items?: ListingOrderItem[];

  @OneToMany(() => ListingPaymentAttempt, (attempt) => attempt.order)
  paymentAttempts?: ListingPaymentAttempt[];
}
