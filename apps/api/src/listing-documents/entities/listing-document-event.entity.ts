import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ListingDocumentEventType } from '../../common/enums';
import { Listing } from '../../listings/entities/listing.entity';
import { Agent } from '../../users/entities/agent.entity';
import { User } from '../../users/entities/user.entity';
import { ListingDocument } from './listing-document.entity';

@Entity('listing_document_events')
@Index(['documentId', 'createdAt'])
@Index(['agentId', 'listingId', 'createdAt'])
export class ListingDocumentEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ListingDocument, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: ListingDocument;

  @Column({ type: 'uuid', name: 'document_id' })
  documentId: string;

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

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_user_id' })
  actor?: User | null;

  @Column({ type: 'uuid', name: 'actor_user_id', nullable: true })
  actorUserId?: string | null;

  @Column({ type: 'enum', enum: ListingDocumentEventType })
  type: ListingDocumentEventType;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
