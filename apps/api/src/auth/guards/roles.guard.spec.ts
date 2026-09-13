import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminPermission, UserRole } from '../../common/enums';
import { RolesGuard } from './roles.guard';

function buildContext(user?: {
  role?: UserRole;
  adminPermissions?: AdminPermission[] | null;
}): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn(() => ({
      getRequest: jest.fn(() => ({ user })),
    })),
  } as unknown as ExecutionContext;
}

function buildGuard(metadata: {
  roles?: UserRole[];
  permissions?: AdminPermission[];
}) {
  const reflector = {
    getAllAndOverride: jest
      .fn()
      .mockReturnValueOnce(metadata.roles)
      .mockReturnValueOnce(metadata.permissions),
  };
  return new RolesGuard(reflector as unknown as Reflector);
}

describe('RolesGuard permissions', () => {
  it('allows routes without role or permission metadata', () => {
    const guard = buildGuard({});

    expect(guard.canActivate(buildContext())).toBe(true);
  });

  it('rejects users without the required role', () => {
    const guard = buildGuard({ roles: [UserRole.ADMIN] });

    expect(() => guard.canActivate(buildContext({ role: UserRole.AGENT })))
      .toThrow(ForbiddenException);
  });

  it('keeps legacy full access for admins without explicit permission lists', () => {
    const guard = buildGuard({
      roles: [UserRole.ADMIN],
      permissions: [AdminPermission.LISTING_COMMERCE_MANAGE_PRODUCTS],
    });

    expect(
      guard.canActivate(
        buildContext({
          role: UserRole.ADMIN,
          adminPermissions: null,
        }),
      ),
    ).toBe(true);
  });

  it('allows explicitly permitted admin operations', () => {
    const guard = buildGuard({
      roles: [UserRole.ADMIN],
      permissions: [AdminPermission.LISTING_COMMERCE_MANAGE_GRANTS],
    });

    expect(
      guard.canActivate(
        buildContext({
          role: UserRole.ADMIN,
          adminPermissions: [AdminPermission.LISTING_COMMERCE_MANAGE_GRANTS],
        }),
      ),
    ).toBe(true);
  });

  it('rejects admins missing an explicitly required permission', () => {
    const guard = buildGuard({
      roles: [UserRole.ADMIN],
      permissions: [AdminPermission.LISTING_COMMERCE_MANAGE_PROMOTIONS],
    });

    expect(() =>
      guard.canActivate(
        buildContext({
          role: UserRole.ADMIN,
          adminPermissions: [AdminPermission.LISTING_COMMERCE_READ],
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});

