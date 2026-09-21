import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanCatalog } from '../plans/entities';
import { UsersModule } from '../users/users.module';
import { AdminAgencyPlanPromotionsController } from './admin-agency-plan-promotions.controller';
import { AdminAgencyPlanPromotionsService } from './admin-agency-plan-promotions.service';
import { AgencyPlanCheckoutAttemptsService } from './agency-plan-checkout-attempts.service';
import { AGENCY_PLAN_PAYMENT_GATEWAY } from './agency-plan-payment-gateway.port';
import { AgencyPlanPaymentEventsService } from './agency-plan-payment-events.service';
import { AgencyPlanPaymentReconciliationService } from './agency-plan-payment-reconciliation.service';
import { AgencyPlanCheckoutController } from './agency-plan-checkout.controller';
import { AgencyPlanPromotionsService } from './agency-plan-promotions.service';
import { AgencyPlanQuotesService } from './agency-plan-quotes.service';
import { StripeAgencyPlanPaymentAdapter } from './stripe-agency-plan-payment.adapter';
import { StripeAgencyPlanWebhooksController } from './stripe-agency-plan-webhooks.controller';
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
    StripeAgencyPlanWebhooksController,
  ],
  providers: [
    AdminAgencyPlanPromotionsService,
    AgencyPlanCheckoutAttemptsService,
    AgencyPlanPaymentEventsService,
    AgencyPlanPaymentReconciliationService,
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
    AgencyPlanPaymentEventsService,
    AgencyPlanPaymentReconciliationService,
    AgencyPlanPromotionsService,
    AgencyPlanQuotesService,
  ],
})
export class AgencyPlanCommerceModule {}
