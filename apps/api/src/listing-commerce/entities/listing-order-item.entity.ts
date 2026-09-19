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
import {
  ListingProductFulfillmentParameters,
  ListingProductType,
} from '../listing-commerce.types';
import { ListingEntitlement } from './listing-entitlement.entity';
import { ListingOrder } from './listing-order.entity';
import { ListingProductCatalog } from './listing-product-catalog.entity';

@Entity('listing_order_items')
@Index(['orderId', 'createdAt'])
export class ListingOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ListingOrder, (order) => order.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: ListingOrder;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @ManyToOne(() => ListingProductCatalog, (product) => product.orderItems, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'product_id' })
  product: ListingProductCatalog;

  @Column({ type: 'uuid', name: 'product_id' })
  productId: string;

  @Column({ type: 'varchar', length: 80, name: 'product_code_snapshot' })
  productCodeSnapshot: string;

  @Column({ type: 'varchar', length: 160, name: 'product_name_snapshot' })
  productNameSnapshot: string;

  @Column({
    type: 'enum',
    enum: ListingProductType,
    enumName: 'listing_product_type_enum',
    name: 'product_type_snapshot',
  })
  productTypeSnapshot: ListingProductType;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'int', name: 'unit_gross_amount' })
  unitGrossAmount: number;

  @Column({ type: 'int', name: 'subtotal_gross_amount' })
  subtotalGrossAmount: number;

  @Column({ type: 'int', name: 'discount_gross_amount', default: 0 })
  discountGrossAmount: number;

  @Column({ type: 'int', name: 'total_gross_amount' })
  totalGrossAmount: number;

  @Column({ type: 'int', name: 'vat_rate_basis_points', nullable: true })
  vatRateBasisPoints?: number | null;

  @Column({ type: 'int', name: 'vat_gross_amount', nullable: true })
  vatGrossAmount?: number | null;

  @Column({ type: 'int', name: 'duration_days' })
  durationDays: number;

  @Column({ type: 'jsonb', name: 'fulfillment_parameters', default: {} })
  fulfillmentParameters: ListingProductFulfillmentParameters;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @OneToOne(() => ListingEntitlement, (entitlement) => entitlement.orderItem)
  entitlement?: ListingEntitlement | null;
}
