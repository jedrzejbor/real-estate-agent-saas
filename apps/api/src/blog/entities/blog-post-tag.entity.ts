import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BlogPost } from './blog-post.entity';

@Entity('blog_post_tags')
@Index(['postId', 'tag'], { unique: true })
@Index(['tag'])
export class BlogPostTag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  postId: string;

  @Column({ type: 'varchar', length: 80 })
  tag: string;

  @ManyToOne(() => BlogPost, (post) => post.tags, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'postId' })
  post: BlogPost;
}
