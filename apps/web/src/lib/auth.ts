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
      customBranding: boolean;
      multiUser: boolean;
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

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: AuthUser;
}

// ── Zod Schemas (frontend validation, mirrors backend DTOs) ──

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email jest wymagany')
    .email('Nieprawidłowy format email'),
  password: z
    .string()
    .min(1, 'Hasło jest wymagane'),
});

export const registerSchema = z.object({
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

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;

// ── Token helpers ──

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export function getStoredTokens(): AuthTokens | null {
  if (typeof window === 'undefined') return null;
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export function storeTokens(tokens: AuthTokens): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Decode the JWT payload (no signature verification — client-side only).
 * Returns `null` if the token is missing or malformed.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

/**
 * Returns the expiry timestamp (ms) of the stored access token,
 * or `null` if the token is missing / has no `exp` claim.
 */
export function getAccessTokenExpiresAt(): number | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return null;
  return payload.exp * 1000; // convert seconds → ms
}

/**
 * Exchange the stored refresh token for a new access + refresh token pair.
 * Stores the new tokens and returns them.
 * Throws if the refresh token is missing or the request fails.
 */
export async function refreshTokens(): Promise<AuthTokens> {
  const stored = getStoredTokens();
  if (!stored?.refreshToken) {
    throw new Error('No refresh token available');
  }

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'x-refresh-token': stored.refreshToken },
  });

  if (!res.ok) {
    throw new Error(`Refresh failed: ${res.status}`);
  }

  const tokens: AuthTokens = await res.json();
  storeTokens(tokens);
  return tokens;
}
