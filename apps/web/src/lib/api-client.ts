import { refreshTokens } from '@/lib/auth';

const SERVER_API_BASE_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:4000/api';
const BROWSER_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const API_BASE_URL =
  typeof window === 'undefined' ? SERVER_API_BASE_URL : BROWSER_API_BASE_URL;

/** Standard API error shape. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: Record<string, unknown>,
  ) {
    const msg =
      typeof body.message === 'string'
        ? body.message
        : Array.isArray(body.message)
          ? (body.message as string[]).join(', ')
          : `Request failed with status ${status}`;
    super(msg);
    this.name = 'ApiError';
  }
}

export interface PlanLimitErrorBody extends Record<string, unknown> {
  code: 'PLAN_LIMIT_REACHED';
  resource: 'listings' | 'clients' | 'appointments' | 'images';
  limit: number;
  currentUsage: number;
  planCode: string;
  upgradeRequired: boolean;
  message: string;
}

export function isPlanLimitApiError(
  error: unknown,
): error is ApiError & { body: PlanLimitErrorBody } {
  return (
    error instanceof ApiError &&
    error.body.code === 'PLAN_LIMIT_REACHED' &&
    typeof error.body.resource === 'string'
  );
}

export function getApiErrorMessage(error: unknown): string {
  if (isPlanLimitApiError(error)) {
    return `${error.body.message} (${error.body.currentUsage}/${error.body.limit})`;
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return error instanceof Error ? error.message : 'Wystąpił nieoczekiwany błąd';
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  /** Skip Authorization header (for public endpoints). */
  skipAuth?: boolean;
  /** Internal — prevents infinite retry loop after token refresh. */
  _retried?: boolean;
};

function notifyAuthorizationLost(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('auth:unauthorized'));
}

// ── Refresh mutex ──
// Ensures only one refresh request is in-flight at a time.
// Concurrent requests that 401 will queue behind the same refresh promise.
let refreshPromise: Promise<void> | null = null;

async function ensureRefreshed(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = refreshTokens()
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Thin wrapper around `fetch` that:
 * - prefixes the API base URL
 * - attaches the JWT Bearer token from localStorage
 * - serialises JSON body
 * - throws `ApiError` on non-2xx responses
 * - on 401: silently refreshes the access token once and retries
 */
export async function apiFetch<T = unknown>(
  path: string,
  {
    body,
    skipAuth,
    _retried,
    headers: extraHeaders,
    ...init
  }: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(extraHeaders);

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (!skipAuth && typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;

  // ── Silent token refresh on 401 ──
  if (!skipAuth && res.status === 401 && !_retried) {
    try {
      await ensureRefreshed();
      // Retry the original request with the new access token
      return apiFetch<T>(path, {
        body,
        skipAuth,
        _retried: true,
        headers: extraHeaders,
        ...init,
      });
    } catch {
      // Refresh itself failed — session is truly expired
      notifyAuthorizationLost();
      throw new ApiError(401, {
        message: 'Sesja wygasła. Zaloguj się ponownie.',
      });
    }
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (!skipAuth && res.status === 401) {
      notifyAuthorizationLost();
    }
    throw new ApiError(res.status, json);
  }

  return json as T;
}

export async function apiFormDataFetch<T = unknown>(
  path: string,
  formData: FormData,
  {
    skipAuth,
    _retried,
    headers: extraHeaders,
    ...init
  }: Omit<RequestOptions, 'body'> = {},
): Promise<T> {
  const headers = new Headers(extraHeaders);

  if (!skipAuth && typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    body: formData,
  });

  if (!skipAuth && res.status === 401 && !_retried) {
    try {
      await ensureRefreshed();
      return apiFormDataFetch<T>(path, formData, {
        skipAuth,
        _retried: true,
        headers: extraHeaders,
        ...init,
      });
    } catch {
      notifyAuthorizationLost();
      throw new ApiError(401, {
        message: 'Sesja wygasła. Zaloguj się ponownie.',
      });
    }
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (!skipAuth && res.status === 401) {
      notifyAuthorizationLost();
    }
    throw new ApiError(res.status, json);
  }

  return json as T;
}
