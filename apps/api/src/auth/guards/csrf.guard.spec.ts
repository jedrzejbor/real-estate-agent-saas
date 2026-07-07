import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import {
  ACCESS_TOKEN_COOKIE,
  CSRF_TOKEN_COOKIE,
  CSRF_TOKEN_HEADER,
  LEGACY_CSRF_TOKEN_COOKIE,
} from '../auth-token-cookies';
import { CsrfGuard } from './csrf.guard';

function buildContext({
  method = 'POST',
  path = '/api/listings',
  cookie,
  csrfHeader,
}: {
  method?: string;
  path?: string;
  cookie?: string;
  csrfHeader?: string;
}): ExecutionContext {
  const request = {
    method,
    path,
    headers: { cookie },
    header: jest.fn((name: string) =>
      name.toLowerCase() === CSRF_TOKEN_HEADER ? csrfHeader : undefined,
    ),
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('CsrfGuard', () => {
  const guard = new CsrfGuard();

  it('accepts the PodAdresem CSRF cookie', () => {
    const context = buildContext({
      cookie: `${ACCESS_TOKEN_COOKIE}=access; ${CSRF_TOKEN_COOKIE}=csrf-token`,
      csrfHeader: 'csrf-token',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('accepts the legacy EstateFlow CSRF cookie during migration', () => {
    const context = buildContext({
      cookie: `${ACCESS_TOKEN_COOKIE}=access; ${LEGACY_CSRF_TOKEN_COOKIE}=legacy-token`,
      csrfHeader: 'legacy-token',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects mismatched CSRF tokens', () => {
    const context = buildContext({
      cookie: `${ACCESS_TOKEN_COOKIE}=access; ${CSRF_TOKEN_COOKIE}=csrf-token`,
      csrfHeader: 'other-token',
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
