import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ProductFeedback } from './product-feedback.entity';

@Entity('product_feedback_votes')
@Unique(['feedbackId', 'userId'])
@Index(['userId', 'createdAt'])
@Index(['feedbackId', 'createdAt'])
export class ProductFeedbackVote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'feedback_id' })
  feedbackId: string;

  @ManyToOne(() => ProductFeedback, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'feedback_id' })
  feedback: ProductFeedback;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'workspace_id', nullable: true })
  workspaceId?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
