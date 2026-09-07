import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReleaseFlagsModule } from '../release-flags';
import { Listing } from '../listings/entities';
import { PublicListingSubmission } from '../public-listing-submissions/entities';
import { AdminListingProductsController } from './admin-listing-products.controller';
import { AdminListingProductsService } from './admin-listing-products.service';
import {
  ListingEntitlement,
  ListingOrder,
  ListingOrderItem,
  ListingPaymentEvent,
  ListingProductCatalog,
  ListingProductChange,
} from './entities';
import { ListingCheckoutController } from './listing-checkout.controller';
import { ListingCheckoutSessionsService } from './listing-checkout-sessions.service';
import { ListingEntitlementsService } from './listing-entitlements.service';
import { LISTING_PAYMENT_GATEWAY } from './listing-payment-gateway.port';
import { ListingOrdersController } from './listing-orders.controller';
import { ListingOrdersService } from './listing-orders.service';
import { ListingPaymentEventsService } from './listing-payment-events.service';
import { ListingProductsController } from './listing-products.controller';
import { ListingProductsService } from './listing-products.service';
import { ListingQuotesService } from './listing-quotes.service';
import { StripeListingPaymentAdapter } from './stripe-listing-payment.adapter';
import { StripeListingWebhooksController } from './stripe-listing-webhooks.controller';

const LISTING_COMMERCE_ENTITIES = [
  ListingProductCatalog,
  ListingOrder,
  ListingOrderItem,
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
    ListingPaymentEventsService,
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
