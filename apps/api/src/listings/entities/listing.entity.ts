import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import {
  PropertyType,
  ListingStatus,
  TransactionType,
} from '../../common/enums';
import { Agent } from '../../users/entities/agent.entity';
import { ListingImage } from './listing-image.entity';
import { Address } from './address.entity';

@Entity('listings')
export class Listing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Index()
  @Column({ type: 'enum', enum: PropertyType })
  propertyType: PropertyType;

  @Index()
  @Column({ type: 'enum', enum: ListingStatus, default: ListingStatus.DRAFT })
  status: ListingStatus;

  @Column({ type: 'enum', enum: TransactionType })
  transactionType: TransactionType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'varchar', length: 3, default: 'PLN' })
  currency: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  areaM2: number;

  @Column({ type: 'smallint', nullable: true })
  rooms: number;

  @Column({ type: 'smallint', nullable: true })
  bathrooms: number;

  @Column({ type: 'smallint', nullable: true })
  floor: number;

  @Column({ type: 'smallint', nullable: true })
  totalFloors: number;

  @Column({ type: 'smallint', nullable: true })
  yearBuilt: number;

  @Column({ type: 'boolean', default: false })
  isPremium: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // ── Relations ──

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @Index()
  @Column({ type: 'uuid' })
  agentId: string;

  @OneToMany(() => ListingImage, (img) => img.listing, {
    cascade: true,
    eager: false,
  })
  images: ListingImage[];

  @OneToOne(() => Address, (addr) => addr.listing, {
    cascade: true,
    eager: true,
  })
  address: Address;
}
