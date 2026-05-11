import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FeatureSurveyResponse } from './feature-survey-response.entity';

export enum FeatureSurveyStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

export enum FeatureSurveyAudience {
  ALL_USERS = 'all_users',
  REGISTERED_USERS = 'registered_users',
  PUBLIC_VISITORS = 'public_visitors',
  PLAN_SEGMENT = 'plan_segment',
  BETA_USERS = 'beta_users',
}

export enum FeatureSurveyQuestionType {
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  RATING = 'rating',
  NPS = 'nps',
  TEXT = 'text',
}

export interface FeatureSurveyQuestionOption {
  value: string;
  label: string;
}

export interface FeatureSurveyQuestion {
  id: string;
  type: FeatureSurveyQuestionType;
  label: string;
  required?: boolean;
  options?: FeatureSurveyQuestionOption[];
  min?: number;
  max?: number;
}

export interface FeatureSurveyAudienceRules {
  planCodes?: string[];
  userIds?: string[];
  workspaceIds?: string[];
  module?: string;
}

@Entity('feature_surveys')
@Index(['status', 'startsAt', 'endsAt'])
@Index(['audience', 'status'])
export class FeatureSurvey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 160 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    type: 'enum',
    enum: FeatureSurveyStatus,
    default: FeatureSurveyStatus.DRAFT,
  })
  status: FeatureSurveyStatus;

  @Column({
    type: 'enum',
    enum: FeatureSurveyAudience,
    default: FeatureSurveyAudience.REGISTERED_USERS,
  })
  audience: FeatureSurveyAudience;

  @Column({ type: 'timestamptz', name: 'starts_at', nullable: true })
  startsAt?: Date | null;

  @Column({ type: 'timestamptz', name: 'ends_at', nullable: true })
  endsAt?: Date | null;

  @Column({ type: 'jsonb' })
  questions: FeatureSurveyQuestion[];

  @Column({
    type: 'jsonb',
    name: 'audience_rules',
    default: () => "'{}'::jsonb",
  })
  audienceRules: FeatureSurveyAudienceRules;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata: Record<string, unknown>;

  @OneToMany(() => FeatureSurveyResponse, (response) => response.survey)
  responses: FeatureSurveyResponse[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
