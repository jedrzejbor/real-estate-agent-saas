import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReleaseFlagsModule } from '../release-flags';
import { MonitoringModule } from '../monitoring';
import { UsersModule } from '../users';
import { EmailModule } from '../email';
import { Listing } from '../listings/entities';
import { PublicListingSubmissionsModule } from '../public-listing-submissions';
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
import { ListingEntitlementsService } from './listing-entitlements.service';
import { ListingEntitlementsScheduler } from './listing-entitlements.scheduler';
import { LISTING_PAYMENT_GATEWAY } from './listing-payment-gateway.port';
import { ListingOrdersController } from './listing-orders.controller';
import { ListingOrdersService } from './listing-orders.service';
import { ListingPaymentEventsService } from './listing-payment-events.service';
import { ListingPaymentReconciliationScheduler } from './listing-payment-reconciliation.scheduler';
import { ListingPaymentReconciliationService } from './listing-payment-reconciliation.service';
import { ListingManualAdjustmentsService } from './listing-manual-adjustments.service';
import { ListingProductsController } from './listing-products.controller';
import { ListingProductsService } from './listing-products.service';
import { ListingPromotionsService } from './listing-promotions.service';
import { ListingQuotesService } from './listing-quotes.service';
import { StripeListingPaymentAdapter } from './stripe-listing-payment.adapter';
import { StripeListingWebhooksController } from './stripe-listing-webhooks.controller';

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
    PublicListingSubmissionsModule,
  ],
  controllers: [
    ListingProductsController,
    AdminListingEntitlementsController,
    AdminListingProductsController,
    AdminListingPromotionsController,
    ListingCheckoutController,
    ListingEntitlementsController,
    ListingOrdersController,
    StripeListingWebhooksController,
  ],
  providers: [
    ListingProductsService,
    ListingPromotionsService,
    ListingManualAdjustmentsService,
    AdminListingProductsService,
    AdminListingPromotionsService,
    ListingQuotesService,
    ListingOrdersService,
    ListingCheckoutSessionsService,
    ListingEntitlementsService,
    ListingEntitlementsScheduler,
    ListingPaymentEventsService,
    ListingPaymentReconciliationService,
    ListingPaymentReconciliationScheduler,
    StripeListingPaymentAdapter,
    {
      provide: LISTING_PAYMENT_GATEWAY,
      useExisting: StripeListingPaymentAdapter,
    },
  ],
  exports: [
    TypeOrmModule,
    ListingProductsService,
    ListingPromotionsService,
    ListingManualAdjustmentsService,
    ListingEntitlementsService,
    ListingPaymentEventsService,
  ],
})
export class ListingCommerceModule {}
