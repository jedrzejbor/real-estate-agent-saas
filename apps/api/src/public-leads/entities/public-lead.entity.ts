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
import { PublicLeadSource, PublicLeadStatus } from '../../common/enums';
import { Client } from '../../clients/entities/client.entity';
import { Listing } from '../../listings/entities/listing.entity';
import { Agent, Agency } from '../../users/entities';

@Entity('public_leads')
@Index(['agencyId', 'status', 'createdAt'])
@Index(['agentId', 'status', 'createdAt'])
@Index(['listingId', 'status', 'createdAt'])
export class PublicLead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  fullName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone?: string | null;

  @Column({ type: 'text', nullable: true })
  message?: string | null;

  @Index()
  @Column({
    type: 'enum',
    enum: PublicLeadSource,
    default: PublicLeadSource.PUBLIC_LISTING_PAGE,
  })
  source: PublicLeadSource;

  @Index()
  @Column({
    type: 'enum',
    enum: PublicLeadStatus,
    default: PublicLeadStatus.NEW,
  })
  status: PublicLeadStatus;

  @Column({ type: 'varchar', length: 160, name: 'public_slug_snapshot' })
  publicSlugSnapshot: string;

  @Column({ type: 'varchar', length: 500, name: 'source_url', nullable: true })
  sourceUrl?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  referrer?: string | null;

  @Column({ type: 'varchar', length: 255, name: 'utm_source', nullable: true })
  utmSource?: string | null;

  @Column({ type: 'varchar', length: 255, name: 'utm_medium', nullable: true })
  utmMedium?: string | null;

  @Column({ type: 'varchar', length: 255, name: 'utm_campaign', nullable: true })
  utmCampaign?: string | null;

  @Column({ type: 'varchar', length: 255, name: 'utm_term', nullable: true })
  utmTerm?: string | null;

  @Column({ type: 'varchar', length: 255, name: 'utm_content', nullable: true })
  utmContent?: string | null;

  @Column({ type: 'boolean', name: 'contact_consent', default: false })
  contactConsent: boolean;

  @Column({ type: 'boolean', name: 'marketing_consent', default: false })
  marketingConsent: boolean;

  @Column({ type: 'text', name: 'consent_text', nullable: true })
  consentText?: string | null;

  @Column({ type: 'timestamptz', name: 'consented_at', nullable: true })
  consentedAt?: Date | null;

  @Column({ type: 'varchar', length: 128, name: 'ip_hash', nullable: true })
  ipHash?: string | null;

  @Column({ type: 'varchar', length: 500, name: 'user_agent', nullable: true })
  userAgent?: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata: Record<string, unknown>;

  @Column({ type: 'timestamptz', name: 'handled_at', nullable: true })
  handledAt?: Date | null;

  @Column({ type: 'timestamptz', name: 'converted_at', nullable: true })
  convertedAt?: Date | null;

  @Column({ type: 'timestamptz', name: 'archived_at', nullable: true })
  archivedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Listing, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'listing_id' })
  listing?: Listing | null;

  @Index()
  @Column({ type: 'uuid', name: 'listing_id', nullable: true })
  listingId?: string | null;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @Index()
  @Column({ type: 'uuid', name: 'agent_id' })
  agentId: string;

  @ManyToOne(() => Agency, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agency_id' })
  agency?: Agency | null;

  @Index()
  @Column({ type: 'uuid', name: 'agency_id', nullable: true })
  agencyId?: string | null;

  @ManyToOne(() => Client, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'converted_client_id' })
  convertedClient?: Client | null;

  @Index()
  @Column({ type: 'uuid', name: 'converted_client_id', nullable: true })
  convertedClientId?: string | null;
}
