import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanCatalog } from '../plans';
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
  providers: [AgencyPlanQuotesService],
  exports: [AgencyPlanQuotesService],
})
export class AgencyPlanCommerceModule {}
