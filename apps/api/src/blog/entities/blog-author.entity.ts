import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BlogPost } from './blog-post.entity';

@Entity('blog_authors')
export class BlogAuthor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  displayName: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  bio?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  role?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  expertise?: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  sameAsLinks: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => BlogPost, (post) => post.author)
  posts?: BlogPost[];
}
