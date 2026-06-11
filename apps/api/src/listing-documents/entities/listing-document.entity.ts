import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  ListingDocumentCategory,
  ListingDocumentStatus,
} from '../../common/enums';
import { Listing } from '../../listings/entities/listing.entity';
import { Agent } from '../../users/entities/agent.entity';
import { User } from '../../users/entities/user.entity';

@Entity('listing_documents')
@Index(['agentId', 'listingId'])
@Index(['listingId', 'category'])
@Index(['listingId', 'status'])
export class ListingDocument {
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

  @Column({ type: 'enum', enum: ListingDocumentCategory })
  category: ListingDocumentCategory;

  @Column({
    type: 'enum',
    enum: ListingDocumentStatus,
    default: ListingDocumentStatus.REQUESTED,
  })
  status: ListingDocumentStatus;

  @Column({ type: 'varchar', length: 255 })
  displayName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  originalFilename?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  mimeType?: string | null;

  @Column({ type: 'integer', nullable: true })
  fileSize?: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  storageKey?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  checksum?: string | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  dueDate?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploadedBy?: User | null;

  @Column({ type: 'uuid', name: 'uploaded_by_user_id', nullable: true })
  uploadedByUserId?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt?: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by_user_id' })
  reviewedBy?: User | null;

  @Column({ type: 'uuid', name: 'reviewed_by_user_id', nullable: true })
  reviewedByUserId?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt?: Date | null;
}
