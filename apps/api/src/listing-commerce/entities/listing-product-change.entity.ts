import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities';
import {
  ListingProductChangeAction,
  ListingProductChangeValue,
} from '../listing-commerce.types';
import { ListingProductCatalog } from './listing-product-catalog.entity';

@Entity('listing_product_changes')
@Index(['productId', 'createdAt'])
export class ListingProductChange {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ListingProductCatalog, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: ListingProductCatalog;

  @Column({ type: 'uuid', name: 'product_id' })
  productId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_user_id' })
  actorUser?: User | null;

  @Column({ type: 'uuid', name: 'actor_user_id', nullable: true })
  actorUserId?: string | null;

  @Column({
    type: 'enum',
    enum: ListingProductChangeAction,
    enumName: 'listing_product_change_action_enum',
  })
  action: ListingProductChangeAction;

  @Column({ type: 'jsonb' })
  changes: ListingProductChangeValue[];

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
