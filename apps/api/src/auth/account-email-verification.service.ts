import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { APP_NAME } from '../common/brand';
import { EmailService } from '../email';
import { MonitoringService } from '../monitoring';
import { User } from '../users/entities/user.entity';
import { normalizeAccountEmail } from './account-email';

const TOKEN_BYTES = 32;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const SEND_WINDOW_MS = 24 * 60 * 60 * 1000;
const SEND_COOLDOWN_MS = 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;

interface ReservedDelivery {
  userId: string;
  email: string;
  token: string;
  tokenHash: string;
  previousTokenHash: string | null;
  previousExpiresAt: Date | null;
  previousSentAt: Date | null;
  previousWindowStartedAt: Date | null;
  previousSendCount: number;
}

/** Manages mailbox proof independently of registration and JWT policy. */
@Injectable()
export class AccountEmailVerificationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly monitoringService: MonitoringService,
  ) {}

  /** Used by registration in the next rollout stage. No token is returned. */
  async sendForUser(userId: string): Promise<boolean> {
    const delivery = await this.reserveDelivery(userId);
    if (!delivery) return false;

    try {
      await this.emailService.send({
        to: delivery.email,
        subject: `Potwierdź adres e-mail w ${APP_NAME}`,
        text: this.buildEmailText(delivery.token),
      });
      this.monitoringService.recordSuccess(
        'account_email_verification',
        'verification_email_sent',
        { userId },
      );
      return true;
    } catch {
      await this.restoreAfterDeliveryFailure(delivery);
      this.monitoringService.recordFailure(
        'account_email_verification',
        'verification_email_delivery_failed',
        new Error('Email delivery failed'),
        { userId },
      );
      throw new ServiceUnavailableException(
        'Nie można teraz wysłać wiadomości. Spróbuj ponownie później.',
      );
    }
  }

  /** Always returns the same response for unknown, verified and pending emails. */
  async requestResend(email: string): Promise<{ success: true }> {
    try {
      const normalizedEmail = normalizeAccountEmail(email);
      const user = await this.dataSource.getRepository(User).findOne({
        where: { email: normalizedEmail },
        select: { id: true },
      });
      if (user) await this.sendForUser(user.id);
    } catch {
      this.monitoringService.recordFailure(
        'account_email_verification',
        'verification_request_failed',
        new Error('Verification request failed'),
      );
      // Delivery and database failures are monitored by the service/operations.
      // The public response must not disclose whether an address has an account.
    }
    return { success: true };
  }

  /** Atomic single-use confirmation; never creates an authentication session. */
  async confirm(token: string): Promise<void> {
    if (!/^[0-9a-f]{64}$/.test(token)) {
      throw new BadRequestException('Link weryfikacyjny jest nieprawidłowy');
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const result = await this.dataSource
      .createQueryBuilder()
      .update(User)
      .set({
        emailVerifiedAt: () => 'CURRENT_TIMESTAMP',
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
      })
      .where('email_verification_token_hash = :tokenHash', { tokenHash })
      .andWhere('email_verification_expires_at > CURRENT_TIMESTAMP')
      .andWhere('email_verified_at IS NULL')
      .andWhere('"isActive" = true')
      .execute();

    if (result.affected !== 1) {
      this.monitoringService.recordWarning(
        'account_email_verification',
        'verification_token_rejected',
      );
      throw new BadRequestException(
        'Link weryfikacyjny jest nieprawidłowy lub wygasł',
      );
    }

    this.monitoringService.recordSuccess(
      'account_email_verification',
      'account_email_verified',
    );
  }

  private async reserveDelivery(
    userId: string,
  ): Promise<ReservedDelivery | null> {
    return this.dataSource.transaction(async (manager) => {
      const user = await this.findUserForUpdate(manager, userId);
      if (!user || !user.isActive || user.emailVerifiedAt) return null;

      const now = new Date();
      if (
        user.emailVerificationSentAt &&
        now.getTime() - user.emailVerificationSentAt.getTime() <
          SEND_COOLDOWN_MS
      ) {
        this.monitoringService.recordWarning(
          'account_email_verification',
          'verification_send_cooldown',
          { userId },
        );
        return null;
      }

      const previousWindowStartedAt =
        user.emailVerificationWindowStartedAt ?? null;
      const previousSendCount = user.emailVerificationSendCount ?? 0;
      const windowIsCurrent =
        previousWindowStartedAt !== null &&
        now.getTime() - previousWindowStartedAt.getTime() < SEND_WINDOW_MS;
      const nextCount = windowIsCurrent ? previousSendCount + 1 : 1;
      if (nextCount > MAX_SENDS_PER_WINDOW) {
        this.monitoringService.recordWarning(
          'account_email_verification',
          'verification_send_limit_reached',
          { userId },
        );
        return null;
      }

      const token = randomBytes(TOKEN_BYTES).toString('hex');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const delivery: ReservedDelivery = {
        userId,
        email: user.email,
        token,
        tokenHash,
        previousTokenHash: user.emailVerificationTokenHash ?? null,
        previousExpiresAt: user.emailVerificationExpiresAt ?? null,
        previousSentAt: user.emailVerificationSentAt ?? null,
        previousWindowStartedAt,
        previousSendCount,
      };

      await manager.update(User, userId, {
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
        emailVerificationSentAt: now,
        emailVerificationWindowStartedAt: windowIsCurrent
          ? previousWindowStartedAt
          : now,
        emailVerificationSendCount: nextCount,
      });

      return delivery;
    });
  }

  private findUserForUpdate(manager: EntityManager, userId: string) {
    return manager
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect([
        'user.emailVerificationTokenHash',
        'user.emailVerificationExpiresAt',
        'user.emailVerificationSentAt',
        'user.emailVerificationWindowStartedAt',
        'user.emailVerificationSendCount',
      ])
      .where('user.id = :userId', { userId })
      .setLock('pessimistic_write')
      .getOne();
  }

  private async restoreAfterDeliveryFailure(
    delivery: ReservedDelivery,
  ): Promise<void> {
    try {
      await this.dataSource
        .createQueryBuilder()
        .update(User)
        .set({
          emailVerificationTokenHash: delivery.previousTokenHash,
          emailVerificationExpiresAt: delivery.previousExpiresAt,
          emailVerificationSentAt: delivery.previousSentAt,
          emailVerificationWindowStartedAt: delivery.previousWindowStartedAt,
          emailVerificationSendCount: delivery.previousSendCount,
        })
        .where('id = :userId', { userId: delivery.userId })
        .andWhere('email_verification_token_hash = :tokenHash', {
          tokenHash: delivery.tokenHash,
        })
        .execute();
    } catch {
      this.monitoringService.recordFailure(
        'account_email_verification',
        'verification_delivery_recovery_failed',
        new Error('Delivery recovery failed'),
        { userId: delivery.userId },
      );
    }
  }

  private buildEmailText(token: string): string {
    const configuredUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    let url: URL;
    try {
      url = new URL('/verify-email', configuredUrl);
      if (
        (url.protocol !== 'https:' &&
          !(this.configService.get('NODE_ENV') !== 'production' &&
            url.protocol === 'http:')) ||
        url.username ||
        url.password
      ) {
        throw new Error('Invalid frontend URL');
      }
    } catch {
      throw new ServiceUnavailableException(
        'Adres strony do weryfikacji e-maila nie jest skonfigurowany',
      );
    }
    url.hash = `token=${token}`;

    return [
      `Potwierdź adres e-mail swojego konta ${APP_NAME}:`,
      '',
      url.toString(),
      '',
      'Link jest ważny przez 24 godziny i można użyć go tylko raz.',
      'Jeśli to nie Ty zakładałeś konto, zignoruj tę wiadomość.',
    ].join('\n');
  }
}
