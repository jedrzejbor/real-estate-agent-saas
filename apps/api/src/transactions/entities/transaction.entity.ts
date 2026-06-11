import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ListingCommissionType, TransactionStatus } from '../../common/enums';
import { Client } from '../../clients/entities/client.entity';
import { Listing } from '../../listings/entities/listing.entity';
import { Agent } from '../../users/entities/agent.entity';
import { TransactionTask } from './transaction-task.entity';

@Entity('transactions')
@Index(['agentId', 'status'])
@Index(['agentId', 'listingId'])
@Index(['agentId', 'buyerClientId'])
@Index(['agentId', 'expectedCloseDate'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @Column({ type: 'uuid', name: 'agent_id' })
  agentId: string;

  @ManyToOne(() => Listing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: Listing;

  @Column({ type: 'uuid', name: 'listing_id' })
  listingId: string;

  @ManyToOne(() => Client, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'buyer_client_id' })
  buyerClient: Client;

  @Column({ type: 'uuid', name: 'buyer_client_id' })
  buyerClientId: string;

  @ManyToOne(() => Client, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'seller_client_id' })
  sellerClient?: Client | null;

  @Column({ type: 'uuid', name: 'seller_client_id', nullable: true })
  sellerClientId?: string | null;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.LEAD_OFFER,
  })
  status: TransactionStatus;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  dealValue: number | string;

  @Column({ type: 'varchar', length: 3, default: 'PLN' })
  currency: string;

  @Column({ type: 'enum', enum: ListingCommissionType, nullable: true })
  commissionType?: ListingCommissionType | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  commissionValue?: number | string | null;

  @Column({ type: 'timestamptz', nullable: true })
  expectedCloseDate?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  reservationExpiresAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  preliminaryAgreementDate?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  financingDeadline?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  notaryDate?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  handoverDate?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  commissionDueDate?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt?: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  lostReason?: string | null;

  @Column({ type: 'text', nullable: true })
  blockerNote?: string | null;

  @Column({ type: 'text', nullable: true })
  privateNote?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt?: Date | null;

  @OneToMany(() => TransactionTask, (task) => task.transaction, {
    cascade: true,
    eager: false,
  })
  tasks: TransactionTask[];

  /** Derived from deal value and commission settings, not persisted. */
  commissionAmount?: number | null;
}
