import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { GrantListingEntitlementDto } from './dto';
import { ListingEntitlementsService } from './listing-entitlements.service';

@Controller('admin/listings/:listingId')
@Roles(UserRole.ADMIN)
export class AdminListingEntitlementsController {
  constructor(
    private readonly listingEntitlementsService: ListingEntitlementsService,
  ) {}

  @Get('commerce-summary')
  async findCommerceSummary(
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ) {
    return this.listingEntitlementsService.findAdminCommerceSummary(listingId);
  }

  @Post('entitlement-grants')
  async grantListingEntitlement(
    @CurrentUser('id') adminUserId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Body() dto: GrantListingEntitlementDto,
  ) {
    return this.listingEntitlementsService.grantAdminEntitlement({
      actorUserId: adminUserId,
      listingId,
      productType: dto.productType,
      durationDays: dto.durationDays,
      reason: dto.reason,
      featuredTier: dto.featuredTier ?? undefined,
      priorityWeight: dto.priorityWeight,
    });
  }
}
