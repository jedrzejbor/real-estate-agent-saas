import { apiFetch, ApiError } from './api-client';

export const EMAIL_VERIFICATION_REQUIRED_CODE = 'EMAIL_VERIFICATION_REQUIRED';

export function isEmailVerificationRequired(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    error.status === 403 &&
    error.body.code === EMAIL_VERIFICATION_REQUIRED_CODE
  );
}

export async function requestAccountEmailVerification(
  email: string,
): Promise<void> {
  await apiFetch('/auth/email-verification/request', {
    method: 'POST',
    skipAuth: true,
    body: { email },
  });
}

export async function confirmAccountEmailVerification(
  token: string,
): Promise<void> {
  await apiFetch('/auth/email-verification/confirm', {
    method: 'POST',
    skipAuth: true,
    body: { token },
  });
}
