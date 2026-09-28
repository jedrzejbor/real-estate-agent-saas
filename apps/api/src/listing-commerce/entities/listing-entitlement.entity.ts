import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Listing } from '../../listings/entities';
import { User } from '../../users/entities';
import {
  ListingEntitlementSource,
  ListingEntitlementStatus,
  ListingEntitlementType,
  ListingProductFulfillmentParameters,
} from '../listing-commerce.types';
import { ListingOrderItem } from './listing-order-item.entity';

@Entity('listing_entitlements')
@Index(['listingId', 'type', 'status', 'endsAt'])
@Index(['status', 'endsAt'])
export class ListingEntitlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Listing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: Listing;

  @Column({ type: 'uuid', name: 'listing_id' })
  listingId: string;

  @Index()
  @Column({
    type: 'enum',
    enum: ListingEntitlementType,
    enumName: 'listing_entitlement_type_enum',
  })
  type: ListingEntitlementType;

  @Column({
    type: 'enum',
    enum: ListingEntitlementStatus,
    enumName: 'listing_entitlement_status_enum',
    default: ListingEntitlementStatus.SCHEDULED,
  })
  status: ListingEntitlementStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tier?: string | null;

  @Column({
    type: 'enum',
    enum: ListingEntitlementSource,
    enumName: 'listing_entitlement_source_enum',
    name: 'source_type',
  })
  sourceType: ListingEntitlementSource;

  @OneToOne(() => ListingOrderItem, (item) => item.entitlement, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'order_item_id' })
  orderItem?: ListingOrderItem | null;

  @Index({ unique: true })
  @Column({
    type: 'uuid',
    name: 'order_item_id',
    nullable: true,
    unique: true,
  })
  orderItemId?: string | null;

  @Column({ type: 'timestamptz', name: 'starts_at' })
  startsAt: Date;

  @Column({ type: 'timestamptz', name: 'ends_at' })
  endsAt: Date;

  @Column({ type: 'jsonb', default: {} })
  parameters: ListingProductFulfillmentParameters;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'granted_by_user_id' })
  grantedByUser?: User | null;

  @Column({ type: 'uuid', name: 'granted_by_user_id', nullable: true })
  grantedByUserId?: string | null;

  @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true })
  revokedAt?: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'revoked_by_user_id' })
  revokedByUser?: User | null;

  @Column({ type: 'uuid', name: 'revoked_by_user_id', nullable: true })
  revokedByUserId?: string | null;

  @Column({ type: 'text', name: 'revoked_reason', nullable: true })
  revokedReason?: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
