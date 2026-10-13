import { Module, ServiceUnavailableException } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitoringModule } from '../monitoring';
import { PlanCatalog } from '../plans/entities';
import { UsersModule } from '../users/users.module';
import { AdminAgencyPlanPromotionsController } from './admin-agency-plan-promotions.controller';
import { AdminAgencyPlanPromotionsService } from './admin-agency-plan-promotions.service';
import { AgencyPlanCheckoutAttemptsService } from './agency-plan-checkout-attempts.service';
import {
  AGENCY_PLAN_PAYMENT_GATEWAY,
  type AgencyPlanPaymentGateway,
} from './agency-plan-payment-gateway.port';
import { AgencyPlanPaymentEventsService } from './agency-plan-payment-events.service';
import { AgencyPlanPaymentReconciliationScheduler } from './agency-plan-payment-reconciliation.scheduler';
import { AgencyPlanPaymentReconciliationService } from './agency-plan-payment-reconciliation.service';
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

const unavailablePaymentGateway: AgencyPlanPaymentGateway = {
  provider: 'unavailable',
  async createSubscriptionCheckoutSession() {
    throw new ServiceUnavailableException('Płatności są tymczasowo niedostępne. Spróbuj ponownie później.');
  },
};

@Module({
  imports: [
    MonitoringModule,
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
    AgencyPlanPaymentEventsService,
    AgencyPlanPaymentReconciliationScheduler,
    AgencyPlanPaymentReconciliationService,
    AgencyPlanPromotionsService,
    AgencyPlanQuotesService,
    {
      provide: AGENCY_PLAN_PAYMENT_GATEWAY,
      useValue: unavailablePaymentGateway,
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
