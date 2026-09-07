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
  ListingProductCatalog,
  ListingProductChange,
} from './entities';
import { ListingCheckoutController } from './listing-checkout.controller';
import { ListingOrdersController } from './listing-orders.controller';
import { ListingOrdersService } from './listing-orders.service';
import { ListingProductsController } from './listing-products.controller';
import { ListingProductsService } from './listing-products.service';
import { ListingQuotesService } from './listing-quotes.service';

const LISTING_COMMERCE_ENTITIES = [
  ListingProductCatalog,
  ListingOrder,
  ListingOrderItem,
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
  ],
  providers: [
    ListingProductsService,
    AdminListingProductsService,
    ListingQuotesService,
    ListingOrdersService,
  ],
  exports: [TypeOrmModule, ListingProductsService],
})
export class ListingCommerceModule {}
