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
import { ListingAgentProposal } from './listing-agent-proposal.entity';

@Entity('listing_agent_proposal_messages')
@Index(['proposalId', 'createdAt'])
export class ListingAgentProposalMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ListingAgentProposal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'proposal_id' })
  proposal: ListingAgentProposal;

  @Column({ type: 'uuid', name: 'proposal_id' })
  proposalId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_user_id' })
  senderUser: User;

  @Column({ type: 'uuid', name: 'sender_user_id' })
  senderUserId: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'timestamptz', name: 'read_at', nullable: true })
  readAt?: Date | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
