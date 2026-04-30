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
  PublicListingSubmissionSource,
  PublicListingSubmissionStatus,
} from '../../common/enums';
import { Listing } from '../../listings/entities/listing.entity';
import { Agent, Agency } from '../../users/entities';

export interface PublicListingSubmissionPayload {
  listing: Record<string, unknown>;
  publicSettings?: Record<string, unknown>;
  address?: Record<string, unknown>;
  images?: Array<Record<string, unknown>>;
  utm?: Record<string, unknown>;
  referrer?: string | null;
}

@Entity('public_listing_submissions')
@Index(['status', 'createdAt'])
@Index(['source', 'createdAt'])
@Index(['email', 'createdAt'])
export class PublicListingSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({
    type: 'enum',
    enum: PublicListingSubmissionStatus,
    default: PublicListingSubmissionStatus.DRAFT,
  })
  status: PublicListingSubmissionStatus;

  @Index()
  @Column({
    type: 'enum',
    enum: PublicListingSubmissionSource,
    default: PublicListingSubmissionSource.PUBLIC_WIZARD,
  })
  source: PublicListingSubmissionSource;

  @Column({ type: 'varchar', length: 255, name: 'owner_name' })
  ownerName: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 30 })
  phone: string;

  @Column({ type: 'varchar', length: 255, name: 'agency_name', nullable: true })
  agencyName?: string | null;

  @Column({ type: 'boolean', name: 'contact_consent', default: false })
  contactConsent: boolean;

  @Column({ type: 'boolean', name: 'terms_consent', default: false })
  termsConsent: boolean;

  @Column({ type: 'boolean', name: 'marketing_consent', default: false })
  marketingConsent: boolean;

  @Column({ type: 'text', name: 'consent_text', nullable: true })
  consentText?: string | null;

  @Column({ type: 'timestamptz', name: 'consented_at', nullable: true })
  consentedAt?: Date | null;

  @Index()
  @Column({
    type: 'varchar',
    length: 128,
    name: 'verification_token_hash',
    nullable: true,
  })
  verificationTokenHash?: string | null;

  @Index()
  @Column({
    type: 'varchar',
    length: 128,
    name: 'claim_token_hash',
    nullable: true,
  })
  claimTokenHash?: string | null;

  @Column({
    type: 'timestamptz',
    name: 'verification_expires_at',
    nullable: true,
  })
  verificationExpiresAt?: Date | null;

  @Column({ type: 'timestamptz', name: 'verified_at', nullable: true })
  verifiedAt?: Date | null;

  @Column({ type: 'timestamptz', name: 'published_at', nullable: true })
  publishedAt?: Date | null;

  @Column({ type: 'timestamptz', name: 'claimed_at', nullable: true })
  claimedAt?: Date | null;

  @Column({ type: 'timestamptz', name: 'rejected_at', nullable: true })
  rejectedAt?: Date | null;

  @Column({ type: 'timestamptz', name: 'expired_at', nullable: true })
  expiredAt?: Date | null;

  @Column({ type: 'varchar', length: 128, name: 'ip_hash', nullable: true })
  ipHash?: string | null;

  @Column({ type: 'varchar', length: 500, name: 'user_agent', nullable: true })
  userAgent?: string | null;

  @Column({ type: 'jsonb' })
  payload: PublicListingSubmissionPayload;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata: Record<string, unknown>;

  @Column({ type: 'varchar', length: 500, name: 'source_url', nullable: true })
  sourceUrl?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  referrer?: string | null;

  @Column({ type: 'varchar', length: 255, name: 'utm_source', nullable: true })
  utmSource?: string | null;

  @Column({ type: 'varchar', length: 255, name: 'utm_medium', nullable: true })
  utmMedium?: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'utm_campaign',
    nullable: true,
  })
  utmCampaign?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Listing, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'published_listing_id' })
  publishedListing?: Listing | null;

  @Index()
  @Column({ type: 'uuid', name: 'published_listing_id', nullable: true })
  publishedListingId?: string | null;

  @ManyToOne(() => Agent, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'claimed_agent_id' })
  claimedAgent?: Agent | null;

  @Index()
  @Column({ type: 'uuid', name: 'claimed_agent_id', nullable: true })
  claimedAgentId?: string | null;

  @ManyToOne(() => Agency, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'claimed_agency_id' })
  claimedAgency?: Agency | null;

  @Index()
  @Column({ type: 'uuid', name: 'claimed_agency_id', nullable: true })
  claimedAgencyId?: string | null;
}
