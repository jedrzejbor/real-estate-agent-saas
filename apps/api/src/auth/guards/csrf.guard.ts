import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  CSRF_TOKEN_COOKIE,
  CSRF_TOKEN_HEADER,
  LEGACY_CSRF_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  extractCookieFromRequest,
} from '../auth-token-cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_TOKEN_PATHS = new Set(['/auth/csrf', '/api/auth/csrf']);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(request.method.toUpperCase())) {
      return true;
    }

    if (CSRF_TOKEN_PATHS.has(request.path)) {
      return true;
    }

    const hasAuthCookie =
      Boolean(extractCookieFromRequest(request, ACCESS_TOKEN_COOKIE)) ||
      Boolean(extractCookieFromRequest(request, REFRESH_TOKEN_COOKIE));

    if (!hasAuthCookie) {
      return true;
    }

    const csrfCookie =
      extractCookieFromRequest(request, CSRF_TOKEN_COOKIE) ??
      extractCookieFromRequest(request, LEGACY_CSRF_TOKEN_COOKIE);
    const csrfHeader = request.header(CSRF_TOKEN_HEADER);

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }
}
