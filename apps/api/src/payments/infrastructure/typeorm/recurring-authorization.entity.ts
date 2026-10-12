import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  AuthorizationId,
  ProviderReferenceType,
} from '../../domain/payment.types';

export type RecurringAuthorizationStatus =
  | 'pending'
  | 'active'
  | 'revoked'
  | 'expired';

@Entity('recurring_authorizations')
@Index(
  'uq_recurring_authorizations_active_method',
  ['subscriptionId', 'providerReferenceType'],
  { unique: true, where: "status = 'active'" },
)
export class RecurringAuthorization {
  @PrimaryColumn({ type: 'uuid' })
  id: AuthorizationId;

  @Column({ type: 'uuid', name: 'subscription_id' })
  subscriptionId: string;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'varchar', length: 32, name: 'provider_reference_type' })
  providerReferenceType: ProviderReferenceType;

  /** AES-256-GCM envelope; never expose this field in an API response. */
  @Column({ type: 'bytea', name: 'provider_reference_ciphertext', select: false })
  providerReferenceCiphertext: Buffer;

  @Column({ type: 'varchar', length: 20 })
  status: RecurringAuthorizationStatus;

  @Column({ type: 'timestamptz', name: 'consented_at', nullable: true })
  consentedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'expires_at', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  last4: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  brand: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
