import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ProductFeedbackType {
  BUG_REPORT = 'bug_report',
  FEATURE_REQUEST = 'feature_request',
  IMPROVEMENT = 'improvement',
  GENERAL_FEEDBACK = 'general_feedback',
  SURVEY_RESPONSE = 'survey_response',
}

export enum ProductFeedbackStatus {
  NEW = 'new',
  TRIAGED = 'triaged',
  NEEDS_MORE_INFO = 'needs_more_info',
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  RELEASED = 'released',
  DECLINED = 'declined',
  DUPLICATE = 'duplicate',
  ARCHIVED = 'archived',
}

export enum ProductFeedbackCategory {
  LISTINGS = 'listings',
  CLIENTS = 'clients',
  CALENDAR = 'calendar',
  REPORTS = 'reports',
  PUBLIC_CATALOG = 'public_catalog',
  PUBLIC_LISTING_SUBMISSION = 'public_listing_submission',
  BILLING = 'billing',
  ONBOARDING = 'onboarding',
  INTEGRATIONS = 'integrations',
  UI_UX = 'ui_ux',
  OTHER = 'other',
}

export enum ProductFeedbackPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ProductFeedbackSource {
  DASHBOARD = 'dashboard',
  PUBLIC_CATALOG = 'public_catalog',
  PUBLIC_LISTING = 'public_listing',
  PUBLIC_FORM = 'public_form',
  HOMEPAGE = 'homepage',
  ERROR_PAGE = 'error_page',
}

@Entity('product_feedback')
@Index(['status', 'createdAt'])
@Index(['type', 'createdAt'])
@Index(['category', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['workspaceId', 'createdAt'])
@Index(['ipHash', 'createdAt'])
@Index(['email', 'createdAt'])
export class ProductFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ProductFeedbackType })
  type: ProductFeedbackType;

  @Column({
    type: 'enum',
    enum: ProductFeedbackStatus,
    default: ProductFeedbackStatus.NEW,
  })
  status: ProductFeedbackStatus;

  @Column({
    type: 'enum',
    enum: ProductFeedbackCategory,
    default: ProductFeedbackCategory.OTHER,
  })
  category: ProductFeedbackCategory;

  @Column({ type: 'enum', enum: ProductFeedbackSource })
  source: ProductFeedbackSource;

  @Column({ type: 'varchar', length: 160 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ProductFeedbackPriority,
    name: 'user_priority',
    nullable: true,
  })
  userPriority?: ProductFeedbackPriority | null;

  @Column({
    type: 'enum',
    enum: ProductFeedbackPriority,
    name: 'internal_priority',
    nullable: true,
  })
  internalPriority?: ProductFeedbackPriority | null;

  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId?: string | null;

  @Column({ type: 'uuid', name: 'agent_id', nullable: true })
  agentId?: string | null;

  @Column({ type: 'uuid', name: 'workspace_id', nullable: true })
  workspaceId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 500, name: 'source_url', nullable: true })
  sourceUrl?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  module?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  browser?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  os?: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  viewport?: string | null;

  @Column({ type: 'varchar', length: 80, name: 'app_version', nullable: true })
  appVersion?: string | null;

  @Column({
    type: 'varchar',
    length: 500,
    name: 'screenshot_url',
    nullable: true,
  })
  screenshotUrl?: string | null;

  @Column({ type: 'varchar', length: 128, name: 'ip_hash', nullable: true })
  ipHash?: string | null;

  @Column({ type: 'varchar', length: 500, name: 'user_agent', nullable: true })
  userAgent?: string | null;

  @Column({ type: 'uuid', name: 'duplicate_of_id', nullable: true })
  duplicateOfId?: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
