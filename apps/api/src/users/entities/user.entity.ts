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
import { AdminPermission, UserRole } from '../../common/enums';
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

  /** Null until the mailbox owner completes account verification. */
  @Column({
    type: 'timestamptz',
    name: 'email_verified_at',
    nullable: true,
  })
  emailVerifiedAt?: Date | null;

  @Index('uq_users_email_verification_token_hash', {
    unique: true,
    where: 'email_verification_token_hash IS NOT NULL',
  })
  @Column({
    type: 'varchar',
    length: 64,
    name: 'email_verification_token_hash',
    nullable: true,
    select: false,
  })
  @Exclude()
  emailVerificationTokenHash?: string | null;

  @Column({
    type: 'timestamptz',
    name: 'email_verification_expires_at',
    nullable: true,
    select: false,
  })
  @Exclude()
  emailVerificationExpiresAt?: Date | null;

  @Column({
    type: 'timestamptz',
    name: 'email_verification_sent_at',
    nullable: true,
    select: false,
  })
  @Exclude()
  emailVerificationSentAt?: Date | null;

  @Column({
    type: 'timestamptz',
    name: 'email_verification_window_started_at',
    nullable: true,
    select: false,
  })
  @Exclude()
  emailVerificationWindowStartedAt?: Date | null;

  @Column({
    type: 'integer',
    name: 'email_verification_send_count',
    default: 0,
    select: false,
  })
  @Exclude()
  emailVerificationSendCount: number;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.AGENT })
  role: UserRole;

  @Column({
    type: 'text',
    array: true,
    name: 'admin_permissions',
    nullable: true,
  })
  adminPermissions?: AdminPermission[] | null;

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
