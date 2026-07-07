const CSRF_TOKEN_COOKIE = 'podadresem.csrf-token';
const LEGACY_CSRF_TOKEN_COOKIE = 'estateflow.csrf-token';
const CSRF_TOKEN_HEADER = 'x-csrf-token';

const SERVER_API_BASE_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:4000/api';
const BROWSER_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const API_BASE_URL =
  typeof window === 'undefined' ? SERVER_API_BASE_URL : BROWSER_API_BASE_URL;

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

let csrfPromise: Promise<string> | null = null;

export function isSafeHttpMethod(method: string | undefined): boolean {
  return SAFE_METHODS.has((method ?? 'GET').toUpperCase());
}

export async function appendCsrfHeader(
  headers: Headers,
  method: string | undefined,
): Promise<void> {
  if (typeof window === 'undefined' || isSafeHttpMethod(method)) {
    return;
  }

  headers.set(CSRF_TOKEN_HEADER, await ensureCsrfToken());
}

async function ensureCsrfToken(): Promise<string> {
  const existingToken =
    readCookie(CSRF_TOKEN_COOKIE) ?? readCookie(LEGACY_CSRF_TOKEN_COOKIE);
  if (existingToken) {
    return existingToken;
  }

  if (!csrfPromise) {
    csrfPromise = fetch(`${API_BASE_URL}/auth/csrf`, {
      method: 'GET',
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`CSRF token request failed: ${response.status}`);
        }

        const body = (await response.json().catch(() => ({}))) as {
          token?: unknown;
        };

        if (typeof body.token === 'string' && body.token.length > 0) {
          return body.token;
        }

        const cookieToken =
          readCookie(CSRF_TOKEN_COOKIE) ?? readCookie(LEGACY_CSRF_TOKEN_COOKIE);
        if (cookieToken) {
          return cookieToken;
        }

        throw new Error('CSRF token response did not include a token');
      })
      .finally(() => {
        csrfPromise = null;
      });
  }

  return csrfPromise;
}

function readCookie(name: string): string | null {
  const encodedName = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(encodedName));

  if (!cookie) {
    return null;
  }

  const value = cookie.slice(encodedName.length);

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
