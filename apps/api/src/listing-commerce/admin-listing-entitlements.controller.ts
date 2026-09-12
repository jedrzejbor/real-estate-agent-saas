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
import {
  ArchiveListingManualAdjustmentDto,
  CreateListingManualAdjustmentDto,
  GrantListingEntitlementDto,
  RevokeListingEntitlementDto,
} from './dto';
import { ListingEntitlementsService } from './listing-entitlements.service';
import { ListingManualAdjustmentsService } from './listing-manual-adjustments.service';

@Controller('admin/listings/:listingId')
@Roles(UserRole.ADMIN)
export class AdminListingEntitlementsController {
  constructor(
    private readonly listingEntitlementsService: ListingEntitlementsService,
    private readonly listingManualAdjustmentsService: ListingManualAdjustmentsService,
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

  @Post('entitlements/:entitlementId/revoke')
  async revokeListingEntitlement(
    @CurrentUser('id') adminUserId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Param('entitlementId', ParseUUIDPipe) entitlementId: string,
    @Body() dto: RevokeListingEntitlementDto,
  ) {
    return this.listingEntitlementsService.revokeAdminEntitlement({
      actorUserId: adminUserId,
      listingId,
      entitlementId,
      reason: dto.reason,
    });
  }

  @Post('manual-adjustments')
  async createManualAdjustment(
    @CurrentUser('id') adminUserId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Body() dto: CreateListingManualAdjustmentDto,
  ) {
    return this.listingManualAdjustmentsService.createAdjustment({
      actorUserId: adminUserId,
      listingId,
      label: dto.label,
      reason: dto.reason,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      maxDiscountGrossAmount: dto.maxDiscountGrossAmount,
      targetScope: dto.targetScope,
      targetRules: dto.targetRules,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: new Date(dto.endsAt),
    });
  }

  @Post('manual-adjustments/:adjustmentId/archive')
  async archiveManualAdjustment(
    @CurrentUser('id') adminUserId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Param('adjustmentId', ParseUUIDPipe) adjustmentId: string,
    @Body() dto: ArchiveListingManualAdjustmentDto,
  ) {
    return this.listingManualAdjustmentsService.archiveAdjustment({
      actorUserId: adminUserId,
      listingId,
      adjustmentId,
      reason: dto.reason,
    });
  }
}
