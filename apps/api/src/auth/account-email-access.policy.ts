import { User } from '../users/entities/user.entity';

export const EMAIL_VERIFICATION_REQUIRED_CODE = 'EMAIL_VERIFICATION_REQUIRED';

/** Legacy accounts are enrolled separately, without treating them as verified. */
export function needsEmailVerification(user: User): boolean {
  return Boolean(user.emailVerificationRequiredAt && !user.emailVerifiedAt);
}
