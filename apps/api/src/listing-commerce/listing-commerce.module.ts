import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReleaseFlagsModule } from '../release-flags';
import { MonitoringModule } from '../monitoring';
import { UsersModule } from '../users';
import { Listing } from '../listings/entities';
import { PublicListingSubmission } from '../public-listing-submissions/entities';
import { AdminListingProductsController } from './admin-listing-products.controller';
import { AdminListingProductsService } from './admin-listing-products.service';
import {
  ListingEntitlement,
  ListingOrder,
  ListingOrderItem,
  ListingPaymentAttempt,
  ListingPaymentEvent,
  ListingProductCatalog,
  ListingProductChange,
} from './entities';
import { ListingCheckoutController } from './listing-checkout.controller';
import { ListingCheckoutSessionsService } from './listing-checkout-sessions.service';
import { ListingEntitlementsService } from './listing-entitlements.service';
import { ListingEntitlementsScheduler } from './listing-entitlements.scheduler';
import { LISTING_PAYMENT_GATEWAY } from './listing-payment-gateway.port';
import { ListingOrdersController } from './listing-orders.controller';
import { ListingOrdersService } from './listing-orders.service';
import { ListingPaymentEventsService } from './listing-payment-events.service';
import { ListingPaymentReconciliationScheduler } from './listing-payment-reconciliation.scheduler';
import { ListingPaymentReconciliationService } from './listing-payment-reconciliation.service';
import { ListingProductsController } from './listing-products.controller';
import { ListingProductsService } from './listing-products.service';
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
  ListingProductChange,
  Listing,
  PublicListingSubmission,
];

@Module({
  imports: [
    TypeOrmModule.forFeature(LISTING_COMMERCE_ENTITIES),
    ReleaseFlagsModule,
    MonitoringModule,
    UsersModule,
  ],
  controllers: [
    ListingProductsController,
    AdminListingProductsController,
    ListingCheckoutController,
    ListingOrdersController,
    StripeListingWebhooksController,
  ],
  providers: [
    ListingProductsService,
    AdminListingProductsService,
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
    ListingEntitlementsService,
    ListingPaymentEventsService,
  ],
})
export class ListingCommerceModule {}
