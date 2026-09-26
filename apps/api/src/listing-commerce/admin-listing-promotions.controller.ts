import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminPermission, UserRole } from '../common/enums';
import { AdminListingPromotionsService } from './admin-listing-promotions.service';
import {
  CreateListingPromotionCampaignDto,
  CreateListingPromotionCodeDto,
  UpdateListingPromotionCampaignDto,
} from './dto';

@Controller('admin/listing-promotions')
@Roles(UserRole.ADMIN)
@Permissions(AdminPermission.LISTING_COMMERCE_READ)
export class AdminListingPromotionsController {
  constructor(
    private readonly adminListingPromotionsService: AdminListingPromotionsService,
  ) {}

  @Get()
  async findCampaigns() {
    return this.adminListingPromotionsService.findCampaigns();
  }

  @Post()
  @Permissions(AdminPermission.LISTING_COMMERCE_MANAGE_PROMOTIONS)
  async createCampaign(
    @CurrentUser('id') adminUserId: string,
    @Body() dto: CreateListingPromotionCampaignDto,
  ) {
    return this.adminListingPromotionsService.createCampaign(adminUserId, dto);
  }

  @Get(':code')
  async findCampaign(@Param('code') code: string) {
    return this.adminListingPromotionsService.findCampaign(code);
  }

  @Patch(':code')
  @Permissions(AdminPermission.LISTING_COMMERCE_MANAGE_PROMOTIONS)
  async updateCampaign(
    @CurrentUser('id') adminUserId: string,
    @Param('code') code: string,
    @Body() dto: UpdateListingPromotionCampaignDto,
  ) {
    return this.adminListingPromotionsService.updateCampaign(
      adminUserId,
      code,
      dto,
    );
  }

  @Post(':code/archive')
  @HttpCode(HttpStatus.OK)
  @Permissions(AdminPermission.LISTING_COMMERCE_MANAGE_PROMOTIONS)
  async archiveCampaign(
    @CurrentUser('id') adminUserId: string,
    @Param('code') code: string,
  ) {
    return this.adminListingPromotionsService.archiveCampaign(
      adminUserId,
      code,
    );
  }

  @Post(':code/restore')
  @HttpCode(HttpStatus.OK)
  @Permissions(AdminPermission.LISTING_COMMERCE_MANAGE_PROMOTIONS)
  async restoreCampaign(
    @CurrentUser('id') adminUserId: string,
    @Param('code') code: string,
  ) {
    return this.adminListingPromotionsService.restoreCampaign(
      adminUserId,
      code,
    );
  }

  @Post(':code/codes')
  @Permissions(AdminPermission.LISTING_COMMERCE_MANAGE_PROMOTIONS)
  async createCode(
    @CurrentUser('id') adminUserId: string,
    @Param('code') campaignCode: string,
    @Body() dto: CreateListingPromotionCodeDto,
  ) {
    return this.adminListingPromotionsService.createCode(
      adminUserId,
      campaignCode,
      dto,
    );
  }
}
