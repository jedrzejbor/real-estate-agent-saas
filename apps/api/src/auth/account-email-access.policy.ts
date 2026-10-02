import { User } from '../users/entities/user.entity';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const EMAIL_VERIFICATION_REQUIRED_CODE = 'EMAIL_VERIFICATION_REQUIRED';

/** Legacy accounts are enrolled separately, without treating them as verified. */
export function needsEmailVerification(user: User): boolean {
  return Boolean(user.emailVerificationRequiredAt && !user.emailVerifiedAt);
}

export function isEmailVerificationEnforced(config: ConfigService): boolean {
  return (
    config.get<string>('ACCOUNT_EMAIL_VERIFICATION_ENABLED', 'false') === 'true'
  );
}

/** Sensitive actions also require legacy accounts to prove their address at rollout. */
export function assertVerifiedEmailForSensitiveAction(
  user: Pick<User, 'emailVerifiedAt' | 'emailVerificationRequiredAt'>,
  config: ConfigService,
): void {
  if (
    (isEmailVerificationEnforced(config) || user.emailVerificationRequiredAt) &&
    !user.emailVerifiedAt
  ) {
    throw new ForbiddenException({ code: EMAIL_VERIFICATION_REQUIRED_CODE });
  }
}
