import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../common/enums';

export const ROLES_KEY = 'roles';

/**
 * Require specific roles to access a route.
 * Usage: @Roles(UserRole.OWNER, UserRole.ADMIN)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
