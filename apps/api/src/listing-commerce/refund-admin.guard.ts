import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AdminPermission, UserRole } from '../common/enums';

/** Refunds require an explicit grant, including for legacy admins with null permissions. */
@Injectable()
export class RefundAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<{
      user?: { id?: string; role?: UserRole; adminPermissions?: AdminPermission[] | null };
    }>().user;
    if (!user?.id || user.role !== UserRole.ADMIN ||
        !user.adminPermissions?.includes(AdminPermission.LISTING_COMMERCE_MANAGE_REFUNDS)) {
      throw new ForbiddenException('Brak uprawnień do zwrotu płatności');
    }
    return true;
  }
}
