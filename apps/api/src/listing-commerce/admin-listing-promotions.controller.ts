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
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { AdminListingPromotionsService } from './admin-listing-promotions.service';
import {
  CreateListingPromotionCampaignDto,
  CreateListingPromotionCodeDto,
  UpdateListingPromotionCampaignDto,
} from './dto';

@Controller('admin/listing-promotions')
@Roles(UserRole.ADMIN)
export class AdminListingPromotionsController {
  constructor(
    private readonly adminListingPromotionsService: AdminListingPromotionsService,
  ) {}

  @Get()
  async findCampaigns() {
    return this.adminListingPromotionsService.findCampaigns();
  }

  @Post()
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
