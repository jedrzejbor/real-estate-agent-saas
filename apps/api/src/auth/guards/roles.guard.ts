import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminPermission, UserRole } from '../../common/enums';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

interface AuthenticatedUserForAccessControl {
  role?: UserRole;
  adminPermissions?: AdminPermission[] | null;
}

/**
 * RBAC guard — checks if the authenticated user has one of the required roles.
 * Usage: @Roles(UserRole.OWNER, UserRole.ADMIN)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredPermissions = this.reflector.getAllAndOverride<
      AdminPermission[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (
      (!requiredRoles || requiredRoles.length === 0) &&
      (!requiredPermissions || requiredPermissions.length === 0)
    ) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUserForAccessControl }>();

    if (requiredRoles?.length && (!user || !requiredRoles.includes(user.role!))) {
      throw new ForbiddenException('Brak uprawnień do tego zasobu');
    }

    if (
      requiredPermissions?.length &&
      !hasRequiredAdminPermissions(user, requiredPermissions)
    ) {
      throw new ForbiddenException('Brak uprawnień do tej operacji');
    }

    return true;
  }
}

function hasRequiredAdminPermissions(
  user: AuthenticatedUserForAccessControl | undefined,
  requiredPermissions: AdminPermission[],
): boolean {
  if (!user || user.role !== UserRole.ADMIN) return false;
  if (user.adminPermissions === null || user.adminPermissions === undefined) {
    return true;
  }
  return requiredPermissions.every((permission) =>
    user.adminPermissions?.includes(permission),
  );
}
