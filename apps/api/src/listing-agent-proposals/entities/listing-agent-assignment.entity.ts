import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ListingAgentAssignmentStatus } from '../../common/enums';
import { Listing } from '../../listings/entities/listing.entity';
import { Agent, Agency, User } from '../../users/entities';
import { ListingAgentProposal } from './listing-agent-proposal.entity';

@Entity('listing_agent_assignments')
@Index(['listingId', 'agentId'], {
  unique: true,
  where: "status = 'active'",
})
@Index(['agentId', 'status', 'createdAt'])
@Index(['ownerUserId', 'status', 'createdAt'])
@Index(['proposalId'], { unique: true })
export class ListingAgentAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Listing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: Listing;

  @Column({ type: 'uuid', name: 'listing_id' })
  listingId: string;

  @ManyToOne(() => ListingAgentProposal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'proposal_id' })
  proposal: ListingAgentProposal;

  @Column({ type: 'uuid', name: 'proposal_id' })
  proposalId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_user_id' })
  ownerUser: User;

  @Column({ type: 'uuid', name: 'owner_user_id' })
  ownerUserId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @Column({ type: 'uuid', name: 'agent_id' })
  agentId: string;

  @ManyToOne(() => Agency, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agency_id' })
  agency?: Agency | null;

  @Column({ type: 'uuid', name: 'agency_id', nullable: true })
  agencyId?: string | null;

  @Column({
    type: 'enum',
    enum: ListingAgentAssignmentStatus,
    default: ListingAgentAssignmentStatus.ACTIVE,
  })
  status: ListingAgentAssignmentStatus;

  @Column({
    type: 'jsonb',
    name: 'accepted_terms_snapshot',
    default: () => "'{}'::jsonb",
  })
  acceptedTermsSnapshot: Record<string, unknown>;

  @ManyToOne(() => Listing, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agent_listing_id' })
  agentListing?: Listing | null;

  @Column({ type: 'uuid', name: 'agent_listing_id', nullable: true })
  agentListingId?: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true })
  revokedAt?: Date | null;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt?: Date | null;
}
