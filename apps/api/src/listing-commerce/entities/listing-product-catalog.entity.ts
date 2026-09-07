import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  ListingProductFulfillmentParameters,
  ListingProductType,
} from '../listing-commerce.types';
import { ListingOrderItem } from './listing-order-item.entity';
import { ListingProductChange } from './listing-product-change.entity';

@Entity('listing_product_catalog')
@Index(['isActive', 'isPublic', 'sortOrder'])
export class ListingProductCatalog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 80, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Index()
  @Column({
    type: 'enum',
    enum: ListingProductType,
    enumName: 'listing_product_type_enum',
  })
  type: ListingProductType;

  /** Gross price in the smallest currency unit (grosze for PLN). */
  @Column({ type: 'int', name: 'price_gross_amount' })
  priceGrossAmount: number;

  @Column({ type: 'varchar', length: 3, default: 'PLN' })
  currency: string;

  /** 23% is represented as 2300. Null until the tax treatment is confirmed. */
  @Column({ type: 'int', name: 'vat_rate_basis_points', nullable: true })
  vatRateBasisPoints?: number | null;

  @Column({ type: 'int', name: 'duration_days' })
  durationDays: number;

  @Column({ type: 'varchar', length: 50, name: 'featured_tier', nullable: true })
  featuredTier?: string | null;

  @Column({ type: 'int', name: 'priority_weight', default: 0 })
  priorityWeight: number;

  @Column({ type: 'jsonb', name: 'fulfillment_parameters', default: {} })
  fulfillmentParameters: ListingProductFulfillmentParameters;

  @Column({ type: 'boolean', name: 'is_public', default: true })
  isPublic: boolean;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder: number;

  /** Optional immutable price reference maintained by a payment adapter. */
  @Column({
    type: 'varchar',
    length: 255,
    name: 'provider_price_reference',
    nullable: true,
  })
  providerPriceReference?: string | null;

  @Column({ type: 'timestamptz', name: 'archived_at', nullable: true })
  archivedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ListingOrderItem, (item) => item.product)
  orderItems?: ListingOrderItem[];

  @OneToMany(() => ListingProductChange, (change) => change.product)
  changes?: ListingProductChange[];
}
