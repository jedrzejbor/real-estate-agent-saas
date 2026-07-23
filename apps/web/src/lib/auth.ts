import { appendCsrfHeader } from '@/lib/csrf';
import { z } from 'zod';
import type { ReleaseFlags } from './release-flags';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// ── Types ──

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  isActive?: boolean;
  createdAt?: string;
  agency: {
    id: string;
    name: string;
    plan: string;
    subscription: string;
    ownerId: string | null;
    billingInterval: 'monthly' | 'yearly' | null;
    currentPeriodEnd: string | null;
    trialEndsAt: string | null;
  } | null;
  entitlements: {
    plan: {
      code: string;
      label: string;
      status: string;
    };
    limits: {
      activeListings: number | null;
      clients: number | null;
      monthlyAppointments: number | null;
      users: number | null;
      imagesPerListing: number | null;
    };
    features: {
      reportsOverview: boolean;
      reportsListingsBasic: boolean;
      reportsClientsBasic: boolean;
      reportsAppointmentsBasic: boolean;
      publicListings: boolean;
      publicLeadForms: boolean;
      agentListingMarket: boolean;
      customBranding: boolean;
      multiUser: boolean;
      customDomain: boolean;
      apiAccess: boolean;
      dedicatedSupport: boolean;
    };
  };
  releaseFlags: ReleaseFlags;
  usage: {
    activeListings: number;
    clients: number;
    monthlyAppointments: number;
    users: number;
  };
  agent: {
    id?: string;
    firstName: string;
    lastName: string;
    phone?: string;
    licenseNo?: string;
    bio?: string;
    avatarUrl?: string;
  } | null;
}

export function getUsagePercentage(
  usage: number,
  limit: number | null | undefined,
): number | null {
  if (limit === null || limit === undefined || limit <= 0) return null;
  return Math.round((usage / limit) * 100);
}

export function isUsageWarning(
  usage: number,
  limit: number | null | undefined,
): boolean {
  const percentage = getUsagePercentage(usage, limit);
  return (
    percentage !== null &&
    percentage >= 80 &&
    limit !== null &&
    limit !== undefined &&
    usage < limit
  );
}

export function isUsageExceeded(
  usage: number,
  limit: number | null | undefined,
): boolean {
  return limit !== null && limit !== undefined && usage >= limit;
}

export interface AuthResponse {
  user: AuthUser;
}

export const PRIVATE_SELLER_HOME_PATH = '/seller';
export const AGENT_DASHBOARD_PATH = '/dashboard';

// ── Zod Schemas (frontend validation, mirrors backend DTOs) ──

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email jest wymagany')
    .email('Nieprawidłowy format email'),
  password: z.string().min(1, 'Hasło jest wymagane'),
});

export const registerSchema = z.object({
  accountType: z.enum(['agent', 'private_seller'], {
    message: 'Wybierz typ konta',
  }),
  selectedPlan: z
    .enum(['free', 'starter', 'professional', 'enterprise'])
    .optional(),
  email: z
    .string()
    .min(1, 'Email jest wymagany')
    .email('Nieprawidłowy format email'),
  password: z
    .string()
    .min(8, 'Hasło musi mieć minimum 8 znaków')
    .regex(/[A-Z]/, 'Hasło musi zawierać wielką literę')
    .regex(/[a-z]/, 'Hasło musi zawierać małą literę')
    .regex(/\d/, 'Hasło musi zawierać cyfrę'),
  firstName: z
    .string()
    .min(1, 'Imię jest wymagane')
    .max(50, 'Imię może mieć maksymalnie 50 znaków'),
  lastName: z
    .string()
    .min(1, 'Nazwisko jest wymagane')
    .max(50, 'Nazwisko może mieć maksymalnie 50 znaków'),
});

export const requestPasswordResetSchema = z.object({
  email: z
    .string()
    .min(1, 'Email jest wymagany')
    .email('Nieprawidłowy format email'),
});

const passwordSchema = z
  .string()
  .min(8, 'Hasło musi mieć minimum 8 znaków')
  .regex(/[A-Z]/, 'Hasło musi zawierać wielką literę')
  .regex(/[a-z]/, 'Hasło musi zawierać małą literę')
  .regex(/\d/, 'Hasło musi zawierać cyfrę');

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Link resetu hasła jest nieprawidłowy'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Potwierdź nowe hasło'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Hasła nie są takie same',
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type RequestPasswordResetFormData = z.infer<
  typeof requestPasswordResetSchema
>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export async function requestPasswordReset(
  input: RequestPasswordResetFormData,
): Promise<void> {
  await authFetch('/auth/password-reset/request', {
    method: 'POST',
    body: input,
  });
}

export async function resetPassword(
  input: ResetPasswordFormData,
): Promise<void> {
  await authFetch('/auth/password-reset/confirm', {
    method: 'POST',
    body: input,
  });
}

export function isPrivateSellerUser(user: Pick<AuthUser, 'role'>): boolean {
  return user.role === 'viewer';
}

export function isAgentUser(user: Pick<AuthUser, 'role'>): boolean {
  return user.role === 'agent';
}

export function getDefaultAuthenticatedPath(user: AuthUser): string {
  return isPrivateSellerUser(user)
    ? PRIVATE_SELLER_HOME_PATH
    : AGENT_DASHBOARD_PATH;
}

export function getAuthenticatedRedirectPath(
  user: AuthUser,
  preferredPath?: string | null,
): string {
  if (
    !preferredPath ||
    !preferredPath.startsWith('/') ||
    preferredPath.startsWith('//')
  ) {
    return getDefaultAuthenticatedPath(user);
  }

  if (
    isPrivateSellerUser(user) &&
    preferredPath.startsWith(AGENT_DASHBOARD_PATH)
  ) {
    return PRIVATE_SELLER_HOME_PATH;
  }

  return preferredPath;
}

export function getSafeReturnToPath(value?: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return null;
  }

  return value;
}

export function buildAuthReturnToPath(
  authPath: '/login' | '/register',
  returnTo?: string | null,
): string {
  const safeReturnTo = getSafeReturnToPath(returnTo);

  if (!safeReturnTo) {
    return authPath;
  }

  const params = new URLSearchParams({ returnTo: safeReturnTo });
  return `${authPath}?${params.toString()}`;
}

// ── Auth cookie helpers ──

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export function clearLegacyAuthTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Ask the API to rotate httpOnly access + refresh cookies.
 * Throws if the refresh cookie is missing or invalid.
 */
export async function refreshTokens(): Promise<void> {
  const headers = new Headers();
  await appendCsrfHeader(headers, 'POST');

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(`Refresh failed: ${res.status}`);
  }
}

async function authFetch(
  path: string,
  {
    body,
    ...init
  }: Omit<RequestInit, 'body'> & { body?: Record<string, unknown> },
): Promise<void> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  await appendCsrfHeader(headers, init.method);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.ok) return;

  const json = await res.json().catch(() => ({}));
  const message =
    typeof json.message === 'string'
      ? json.message
      : Array.isArray(json.message)
        ? json.message.join(', ')
        : 'Wystąpił nieoczekiwany błąd';

  throw new Error(message);
}
