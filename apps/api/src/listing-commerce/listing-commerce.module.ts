import { Module, ServiceUnavailableException } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReleaseFlagsModule } from '../release-flags';
import { MonitoringModule } from '../monitoring';
import { UsersModule } from '../users';
import { EmailModule } from '../email';
import { AnalyticsModule } from '../analytics';
import { Listing } from '../listings/entities';
import { PublicListingSubmissionsModule } from '../public-listing-submissions';
import { PaymentsModule } from '../payments/payments.module';
import { TpayWebhookController } from '../payments/infrastructure/tpay/tpay-webhook.controller';
import { PublicListingSubmission } from '../public-listing-submissions/entities';
import { AdminListingEntitlementsController } from './admin-listing-entitlements.controller';
import { AdminListingProductsController } from './admin-listing-products.controller';
import { AdminListingProductsService } from './admin-listing-products.service';
import { AdminListingPromotionsController } from './admin-listing-promotions.controller';
import { AdminListingPromotionsService } from './admin-listing-promotions.service';
import {
  ListingEntitlement,
  ListingManualAdjustment,
  ListingOrder,
  ListingOrderItem,
  ListingPaymentAttempt,
  ListingPaymentEvent,
  ListingProductCatalog,
  ListingProductChange,
  ListingPromotionCampaign,
  ListingPromotionCode,
  ListingPromotionRedemption,
  ListingPromotionReservation,
} from './entities';
import { ListingCheckoutController } from './listing-checkout.controller';
import { ListingEntitlementsController } from './listing-entitlements.controller';
import { ListingCheckoutSessionsService } from './listing-checkout-sessions.service';
import { ListingCommerceTelemetryService } from './listing-commerce-telemetry.service';
import { ListingEntitlementsService } from './listing-entitlements.service';
import { ListingEntitlementsScheduler } from './listing-entitlements.scheduler';
import {
  LISTING_PAYMENT_GATEWAY,
  type ListingPaymentGateway,
} from './listing-payment-gateway.port';
import { ListingOrdersController } from './listing-orders.controller';
import { ListingRefundsService } from './listing-refunds.service';
import { RefundAdminGuard } from './refund-admin.guard';
import { ListingOrdersService } from './listing-orders.service';
import { ListingPaymentEventsService } from './listing-payment-events.service';
import { ListingPaymentReconciliationScheduler } from './listing-payment-reconciliation.scheduler';
import { ListingPaymentReconciliationService } from './listing-payment-reconciliation.service';
import { ListingManualAdjustmentsService } from './listing-manual-adjustments.service';
import { ListingProductsController } from './listing-products.controller';
import { ListingProductsService } from './listing-products.service';
import { ListingPromotionsService } from './listing-promotions.service';
import { ListingQuotesService } from './listing-quotes.service';

const unavailablePaymentGateway: ListingPaymentGateway = {
  provider: 'unavailable',
  async createCheckoutSession() {
    throw new ServiceUnavailableException('Płatności są tymczasowo niedostępne. Spróbuj ponownie później.');
  },
};

const LISTING_COMMERCE_ENTITIES = [
  ListingProductCatalog,
  ListingOrder,
  ListingOrderItem,
  ListingPaymentAttempt,
  ListingPaymentEvent,
  ListingEntitlement,
  ListingManualAdjustment,
  ListingProductChange,
  ListingPromotionCampaign,
  ListingPromotionCode,
  ListingPromotionReservation,
  ListingPromotionRedemption,
  Listing,
  PublicListingSubmission,
];

@Module({
  imports: [
    TypeOrmModule.forFeature(LISTING_COMMERCE_ENTITIES),
    ReleaseFlagsModule,
    MonitoringModule,
    UsersModule,
    EmailModule,
    AnalyticsModule,
    PublicListingSubmissionsModule,
    PaymentsModule,
  ],
  controllers: [
    ListingProductsController,
    AdminListingEntitlementsController,
    AdminListingProductsController,
    AdminListingPromotionsController,
    ListingCheckoutController,
    ListingEntitlementsController,
    ListingOrdersController,
    TpayWebhookController,
  ],
  providers: [
    ListingProductsService,
    ListingPromotionsService,
    ListingManualAdjustmentsService,
    AdminListingProductsService,
    AdminListingPromotionsService,
    ListingQuotesService,
    ListingOrdersService,
    ListingRefundsService,
    RefundAdminGuard,
    ListingCheckoutSessionsService,
    ListingCommerceTelemetryService,
    ListingEntitlementsService,
    ListingEntitlementsScheduler,
    ListingPaymentEventsService,
    ListingPaymentReconciliationService,
    ListingPaymentReconciliationScheduler,
    {
      provide: LISTING_PAYMENT_GATEWAY,
      useValue: unavailablePaymentGateway,
    },
  ],
  exports: [
    TypeOrmModule,
    ListingProductsService,
    ListingPromotionsService,
    ListingManualAdjustmentsService,
    ListingEntitlementsService,
    ListingCommerceTelemetryService,
    ListingPaymentEventsService,
  ],
})
export class ListingCommerceModule {}
