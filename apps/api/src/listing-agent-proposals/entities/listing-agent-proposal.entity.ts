import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  ListingAgentProposalCommissionType,
  ListingAgentProposalExclusivity,
  ListingAgentProposalStatus,
} from '../../common/enums';
import { Listing } from '../../listings/entities/listing.entity';
import { Agent, Agency, User } from '../../users/entities';

@Entity('listing_agent_proposals')
@Index(['listingId', 'agentId'], {
  unique: true,
  where: "status IN ('draft', 'sent', 'updated')",
})
@Index(['agentId', 'status', 'createdAt'])
@Index(['ownerUserId', 'status', 'createdAt'])
@Index(['listingId', 'status', 'createdAt'])
export class ListingAgentProposal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Listing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: Listing;

  @Column({ type: 'uuid', name: 'listing_id' })
  listingId: string;

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
    enum: ListingAgentProposalStatus,
    default: ListingAgentProposalStatus.SENT,
  })
  status: ListingAgentProposalStatus;

  @Column({
    type: 'enum',
    enum: ListingAgentProposalCommissionType,
    name: 'commission_type',
    nullable: true,
  })
  commissionType?: ListingAgentProposalCommissionType | null;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'commission_value',
    nullable: true,
  })
  commissionValue?: number | string | null;

  @Column({
    type: 'int',
    name: 'minimum_contract_months',
    nullable: true,
  })
  minimumContractMonths?: number | null;

  @Column({
    type: 'enum',
    enum: ListingAgentProposalExclusivity,
    nullable: true,
  })
  exclusivity?: ListingAgentProposalExclusivity | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  services: string[];

  @Column({ type: 'text', name: 'marketing_plan', nullable: true })
  marketingPlan?: string | null;

  @Column({ type: 'text', name: 'valuation_opinion', nullable: true })
  valuationOpinion?: string | null;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'proposed_price',
    nullable: true,
  })
  proposedPrice?: number | string | null;

  @Column({ type: 'text', nullable: true })
  availability?: string | null;

  @Column({ type: 'text', nullable: true })
  message?: string | null;

  @Column({ type: 'timestamptz', name: 'valid_until', nullable: true })
  validUntil?: Date | null;

  @Column({ type: 'timestamptz', name: 'accepted_at', nullable: true })
  acceptedAt?: Date | null;

  @Column({ type: 'timestamptz', name: 'rejected_at', nullable: true })
  rejectedAt?: Date | null;

  @Column({ type: 'timestamptz', name: 'withdrawn_at', nullable: true })
  withdrawnAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
