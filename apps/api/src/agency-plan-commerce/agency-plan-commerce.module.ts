import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanCatalog } from '../plans/entities';
import { UsersModule } from '../users/users.module';
import { AdminAgencyPlanPromotionsController } from './admin-agency-plan-promotions.controller';
import { AdminAgencyPlanPromotionsService } from './admin-agency-plan-promotions.service';
import { AgencyPlanCheckoutAttemptsService } from './agency-plan-checkout-attempts.service';
import { AGENCY_PLAN_PAYMENT_GATEWAY } from './agency-plan-payment-gateway.port';
import { AgencyPlanCheckoutController } from './agency-plan-checkout.controller';
import { AgencyPlanPromotionsService } from './agency-plan-promotions.service';
import { AgencyPlanQuotesService } from './agency-plan-quotes.service';
import { StripeAgencyPlanPaymentAdapter } from './stripe-agency-plan-payment.adapter';
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
    StripeAgencyPlanPaymentAdapter,
    {
      provide: AGENCY_PLAN_PAYMENT_GATEWAY,
      useExisting: StripeAgencyPlanPaymentAdapter,
    },
  ],
  exports: [
    AdminAgencyPlanPromotionsService,
    AgencyPlanCheckoutAttemptsService,
    AgencyPlanPromotionsService,
    AgencyPlanQuotesService,
  ],
})
export class AgencyPlanCommerceModule {}
