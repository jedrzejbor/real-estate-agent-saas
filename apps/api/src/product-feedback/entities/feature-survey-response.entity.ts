import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FeatureSurvey } from './feature-survey.entity';

@Entity('feature_survey_responses')
@Index(['surveyId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['workspaceId', 'createdAt'])
@Index(['ipHash', 'createdAt'])
@Index(['email', 'createdAt'])
export class FeatureSurveyResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'survey_id' })
  surveyId: string;

  @ManyToOne(() => FeatureSurvey, (survey) => survey.responses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'survey_id' })
  survey: FeatureSurvey;

  @Column({ type: 'uuid', name: 'feedback_id', nullable: true })
  feedbackId?: string | null;

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

  @Column({ type: 'varchar', length: 128, name: 'ip_hash', nullable: true })
  ipHash?: string | null;

  @Column({ type: 'varchar', length: 500, name: 'user_agent', nullable: true })
  userAgent?: string | null;

  @Column({ type: 'jsonb' })
  answers: Record<string, unknown>;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
