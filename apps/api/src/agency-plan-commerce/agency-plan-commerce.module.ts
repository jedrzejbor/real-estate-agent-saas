import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanCatalog } from '../plans/entities';
import { AdminAgencyPlanPromotionsController } from './admin-agency-plan-promotions.controller';
import { AdminAgencyPlanPromotionsService } from './admin-agency-plan-promotions.service';
import { AgencyPlanPromotionsService } from './agency-plan-promotions.service';
import { AgencyPlanQuotesService } from './agency-plan-quotes.service';
import {
  AgencyPlanPromotionCampaign,
  AgencyPlanPromotionCode,
  AgencyPlanPromotionRedemption,
  AgencyPlanPromotionReservation,
  AgencyPlanQuote,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlanCatalog,
      AgencyPlanPromotionCampaign,
      AgencyPlanPromotionCode,
      AgencyPlanPromotionRedemption,
      AgencyPlanPromotionReservation,
      AgencyPlanQuote,
    ]),
  ],
  controllers: [AdminAgencyPlanPromotionsController],
  providers: [
    AdminAgencyPlanPromotionsService,
    AgencyPlanPromotionsService,
    AgencyPlanQuotesService,
  ],
  exports: [
    AdminAgencyPlanPromotionsService,
    AgencyPlanPromotionsService,
    AgencyPlanQuotesService,
  ],
})
export class AgencyPlanCommerceModule {}
