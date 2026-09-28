import { SetMetadata } from '@nestjs/common';
import { AdminPermission } from '../../common/enums';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Require fine-grained admin capabilities in addition to role checks.
 *
 * Admin users with `adminPermissions = null` keep legacy full access. Once an
 * explicit list is configured for an admin, every permission required by the
 * route must be present in that list.
 */
export const Permissions = (...permissions: AdminPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

