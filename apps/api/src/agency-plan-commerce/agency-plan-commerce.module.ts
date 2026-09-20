import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanCatalog } from '../plans/entities';
import { UsersModule } from '../users/users.module';
import { AdminAgencyPlanPromotionsController } from './admin-agency-plan-promotions.controller';
import { AdminAgencyPlanPromotionsService } from './admin-agency-plan-promotions.service';
import { AgencyPlanCheckoutAttemptsService } from './agency-plan-checkout-attempts.service';
import { AgencyPlanCheckoutController } from './agency-plan-checkout.controller';
import { AgencyPlanPromotionsService } from './agency-plan-promotions.service';
import { AgencyPlanQuotesService } from './agency-plan-quotes.service';
import {
  AgencyPlanCheckoutAttempt,
  AgencyPlanPromotionCampaign,
  AgencyPlanPromotionCode,
  AgencyPlanPromotionRedemption,
  AgencyPlanPromotionReservation,
  AgencyPlanQuote,
} from './entities';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([
      PlanCatalog,
      AgencyPlanCheckoutAttempt,
      AgencyPlanPromotionCampaign,
      AgencyPlanPromotionCode,
      AgencyPlanPromotionRedemption,
      AgencyPlanPromotionReservation,
      AgencyPlanQuote,
    ]),
  ],
  controllers: [
    AdminAgencyPlanPromotionsController,
    AgencyPlanCheckoutController,
  ],
  providers: [
    AdminAgencyPlanPromotionsService,
    AgencyPlanCheckoutAttemptsService,
    AgencyPlanPromotionsService,
    AgencyPlanQuotesService,
  ],
  exports: [
    AdminAgencyPlanPromotionsService,
    AgencyPlanCheckoutAttemptsService,
    AgencyPlanPromotionsService,
    AgencyPlanQuotesService,
  ],
})
export class AgencyPlanCommerceModule {}
