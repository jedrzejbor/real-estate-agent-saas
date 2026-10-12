import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';
import { Repository } from 'typeorm';
import {
  AuthorizationId,
  newAuthorizationId,
  ProviderReferenceType,
} from '../../domain/payment.types';
import { RecurringAuthorization } from './recurring-authorization.entity';

const VERSION = 1;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const HEADER_LENGTH = 1 + IV_LENGTH + TAG_LENGTH;

/**
 * The only persistence and plaintext-read path for provider references.
 * Construct this backend-only store with a 32-byte key from a secret store.
 * It is intentionally not exported from PaymentsModule or any controller.
 */
export class RecurringAuthorizationReferenceStore {
  private readonly key: Buffer;

  constructor(
    private readonly repository: Repository<RecurringAuthorization>,
    key: Buffer,
  ) {
    if (!Buffer.isBuffer(key) || key.length !== 32) {
      throw new Error('Recurring authorization encryption key must be 32 bytes');
    }
    this.key = Buffer.from(key);
  }

  async storePendingReference(input: {
    subscriptionId: string;
    provider: string;
    providerReferenceType: ProviderReferenceType;
    providerReference: string;
  }): Promise<AuthorizationId> {
    if (!input.provider.trim() || !input.providerReference) {
      throw new Error('Provider and reference are required');
    }

    const id = newAuthorizationId();
    const ciphertext = this.encrypt(input.providerReference, {
      id,
      subscriptionId: input.subscriptionId,
      provider: input.provider,
      providerReferenceType: input.providerReferenceType,
    });
    await this.repository.save(
      this.repository.create({
        id,
        subscriptionId: input.subscriptionId,
        provider: input.provider,
        providerReferenceType: input.providerReferenceType,
        providerReferenceCiphertext: ciphertext,
        status: 'pending',
      }),
    );
    return id;
  }

  /** Call only from a recurring payment operation for the matching subscription. */
  async readActiveReferenceForRecurringOperation(
    authorizationId: AuthorizationId,
    subscriptionId: string,
    now: Date = new Date(),
  ): Promise<string> {
    const authorization = await this.repository
      .createQueryBuilder('authorization')
      .addSelect('authorization.providerReferenceCiphertext')
      .where('authorization.id = :authorizationId', { authorizationId })
      .andWhere('authorization.subscriptionId = :subscriptionId', {
        subscriptionId,
      })
      .andWhere('authorization.status = :status', { status: 'active' })
      .getOne();
    if (
      !authorization ||
      !authorization.consentedAt ||
      authorization.consentedAt > now ||
      (authorization.expiresAt && authorization.expiresAt <= now)
    ) {
      throw new Error('Recurring authorization unavailable');
    }

    return this.decrypt(authorization);
  }

  private encrypt(
    reference: string,
    binding: Pick<
      RecurringAuthorization,
      'id' | 'subscriptionId' | 'provider' | 'providerReferenceType'
    >,
  ): Buffer {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(this.bindingBytes(binding));
    const body = Buffer.concat([
      cipher.update(reference, 'utf8'),
      cipher.final(),
    ]);
    return Buffer.concat([
      Buffer.from([VERSION]),
      iv,
      cipher.getAuthTag(),
      body,
    ]);
  }

  private decrypt(authorization: RecurringAuthorization): string {
    const envelope = authorization.providerReferenceCiphertext;
    if (
      !Buffer.isBuffer(envelope) ||
      envelope.length <= HEADER_LENGTH ||
      envelope[0] !== VERSION
    ) {
      throw new Error('Recurring authorization ciphertext is invalid');
    }

    const iv = envelope.subarray(1, 1 + IV_LENGTH);
    const tag = envelope.subarray(1 + IV_LENGTH, HEADER_LENGTH);
    const body = envelope.subarray(HEADER_LENGTH);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAAD(this.bindingBytes(authorization));
    decipher.setAuthTag(tag);
    try {
      return Buffer.concat([decipher.update(body), decipher.final()]).toString(
        'utf8',
      );
    } catch {
      throw new Error('Recurring authorization ciphertext is invalid');
    }
  }

  private bindingBytes(
    binding: Pick<
      RecurringAuthorization,
      'id' | 'subscriptionId' | 'provider' | 'providerReferenceType'
    >,
  ): Buffer {
    return Buffer.from(
      JSON.stringify([
        binding.id,
        binding.subscriptionId,
        binding.provider,
        binding.providerReferenceType,
      ]),
      'utf8',
    );
  }
}
