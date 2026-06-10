import type { Request, Response } from 'express';
import type { CookieOptions } from 'express';
import { ConfigService } from '@nestjs/config';

export const ACCESS_TOKEN_COOKIE = 'accessToken';
export const REFRESH_TOKEN_COOKIE = 'refreshToken';

const DEFAULT_ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const DEFAULT_REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
}

export function setAuthTokenCookies(
  response: Response,
  tokens: AuthTokenPair,
  configService: ConfigService,
): void {
  response.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...buildBaseCookieOptions(configService),
    maxAge: parseDurationMs(
      configService.get('JWT_ACCESS_EXPIRES_IN', '15m'),
      DEFAULT_ACCESS_TOKEN_TTL_MS,
    ),
  });

  response.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...buildBaseCookieOptions(configService),
    maxAge: parseDurationMs(
      configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      DEFAULT_REFRESH_TOKEN_TTL_MS,
    ),
  });
}

export function clearAuthTokenCookies(
  response: Response,
  configService: ConfigService,
): void {
  const options = buildBaseCookieOptions(configService);
  response.clearCookie(ACCESS_TOKEN_COOKIE, options);
  response.clearCookie(REFRESH_TOKEN_COOKIE, options);
}

export function extractAccessTokenFromRequest(
  request: Request,
): string | null {
  return extractTokenFromRequest(request, ACCESS_TOKEN_COOKIE);
}

export function extractRefreshTokenFromRequest(
  request: Request,
): string | null {
  return extractTokenFromRequest(request, REFRESH_TOKEN_COOKIE);
}

function extractTokenFromRequest(
  request: Request,
  cookieName: string,
): string | null {
  const cookies = parseCookieHeader(request.headers.cookie);
  return cookies[cookieName] ?? null;
}

function buildBaseCookieOptions(configService: ConfigService): CookieOptions {
  const sameSite = configService.get<'lax' | 'strict' | 'none'>(
    'AUTH_COOKIE_SAME_SITE',
    'lax',
  );
  const secure =
    sameSite === 'none' || configService.get('NODE_ENV') === 'production';

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
  };
}

function parseCookieHeader(
  cookieHeader: string | undefined,
): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf('=');
        if (separatorIndex === -1) {
          return [part, ''];
        }

        const name = part.slice(0, separatorIndex);
        const value = part.slice(separatorIndex + 1);

        try {
          return [name, decodeURIComponent(value)];
        } catch {
          return [name, value];
        }
      }),
  );
}

function parseDurationMs(value: unknown, fallbackMs: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value !== 'string') {
    return fallbackMs;
  }

  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^(\d+)(ms|s|m|h|d)?$/);
  if (!match) {
    return fallbackMs;
  }

  const amount = Number(match[1]);
  const unit = match[2] ?? 'ms';

  if (!Number.isFinite(amount) || amount <= 0) {
    return fallbackMs;
  }

  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
}
