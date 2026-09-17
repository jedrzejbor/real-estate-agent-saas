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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminPermission, UserRole } from '../common/enums';
import { AdminAgencyPlanPromotionsService } from './admin-agency-plan-promotions.service';
import {
  CreateAgencyPlanPromotionCampaignDto,
  CreateAgencyPlanPromotionCodeDto,
  UpdateAgencyPlanPromotionCampaignDto,
} from './dto';

@Controller('admin/agency-plan-promotions')
@Roles(UserRole.ADMIN)
@Permissions(AdminPermission.LISTING_COMMERCE_READ)
export class AdminAgencyPlanPromotionsController {
  constructor(
    private readonly adminAgencyPlanPromotionsService: AdminAgencyPlanPromotionsService,
  ) {}

  @Get()
  async findCampaigns() {
    return this.adminAgencyPlanPromotionsService.findCampaigns();
  }

  @Post()
  @Permissions(AdminPermission.LISTING_COMMERCE_MANAGE_PROMOTIONS)
  async createCampaign(
    @CurrentUser('id') adminUserId: string,
    @Body() dto: CreateAgencyPlanPromotionCampaignDto,
  ) {
    return this.adminAgencyPlanPromotionsService.createCampaign(
      adminUserId,
      dto,
    );
  }

  @Get(':code')
  async findCampaign(@Param('code') code: string) {
    return this.adminAgencyPlanPromotionsService.findCampaign(code);
  }

  @Patch(':code')
  @Permissions(AdminPermission.LISTING_COMMERCE_MANAGE_PROMOTIONS)
  async updateCampaign(
    @CurrentUser('id') adminUserId: string,
    @Param('code') code: string,
    @Body() dto: UpdateAgencyPlanPromotionCampaignDto,
  ) {
    return this.adminAgencyPlanPromotionsService.updateCampaign(
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
    return this.adminAgencyPlanPromotionsService.archiveCampaign(
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
    return this.adminAgencyPlanPromotionsService.restoreCampaign(
      adminUserId,
      code,
    );
  }

  @Post(':code/codes')
  @Permissions(AdminPermission.LISTING_COMMERCE_MANAGE_PROMOTIONS)
  async createCode(
    @CurrentUser('id') adminUserId: string,
    @Param('code') campaignCode: string,
    @Body() dto: CreateAgencyPlanPromotionCodeDto,
  ) {
    return this.adminAgencyPlanPromotionsService.createCode(
      adminUserId,
      campaignCode,
      dto,
    );
  }
}
