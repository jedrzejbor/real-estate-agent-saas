import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BlogAuthor } from './blog-author.entity';
import { BlogCategory } from './blog-category.entity';
import { BlogPostTag } from './blog-post-tag.entity';

export enum BlogPostStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum BlogContentFormat {
  MARKDOWN = 'markdown',
  HTML = 'html',
  JSON = 'json',
}

export enum BlogRobotsDirective {
  INDEX_FOLLOW = 'index_follow',
  NOINDEX_FOLLOW = 'noindex_follow',
}

@Entity('blog_posts')
@Index(['status', 'publishedAt'])
@Index(['categoryId', 'publishedAt'])
@Index(['authorId', 'publishedAt'])
export class BlogPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 180 })
  title: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 160, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  excerpt?: string | null;

  @Column({ type: 'text', default: '' })
  content: string;

  @Column({
    type: 'enum',
    enum: BlogContentFormat,
    default: BlogContentFormat.MARKDOWN,
  })
  contentFormat: BlogContentFormat;

  @Column({ type: 'varchar', length: 500, nullable: true })
  coverImageUrl?: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  coverImageAlt?: string | null;

  @Column({
    type: 'enum',
    enum: BlogPostStatus,
    default: BlogPostStatus.DRAFT,
  })
  status: BlogPostStatus;

  @Column({ type: 'uuid', nullable: true })
  categoryId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  authorId?: string | null;

  @Column({ type: 'varchar', length: 70, nullable: true })
  seoTitle?: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  seoDescription?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  canonicalUrl?: string | null;

  @Column({
    type: 'enum',
    enum: BlogRobotsDirective,
    default: BlogRobotsDirective.NOINDEX_FOLLOW,
  })
  robots: BlogRobotsDirective;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt?: Date | null;

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string | null;

  @Column({ type: 'uuid', nullable: true })
  updatedBy?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => BlogCategory, (category) => category.posts, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'categoryId' })
  category?: BlogCategory | null;

  @ManyToOne(() => BlogAuthor, (author) => author.posts, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'authorId' })
  author?: BlogAuthor | null;

  @OneToMany(() => BlogPostTag, (tag) => tag.post, { cascade: true })
  tags?: BlogPostTag[];
}
