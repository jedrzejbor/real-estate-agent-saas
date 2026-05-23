import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole } from '../../common/enums';
import { Agent } from './agent.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  @Exclude()
  passwordHash: string;

  @Index()
  @Column({
    type: 'varchar',
    length: 128,
    name: 'password_reset_token_hash',
    nullable: true,
  })
  @Exclude()
  passwordResetTokenHash?: string | null;

  @Column({
    type: 'timestamptz',
    name: 'password_reset_expires_at',
    nullable: true,
  })
  @Exclude()
  passwordResetExpiresAt?: Date | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.AGENT })
  role: UserRole;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // ── Relations ──

  @OneToOne(() => Agent, (agent) => agent.user, { cascade: true })
  agent?: Agent;
}
