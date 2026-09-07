import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReleaseFlagsModule } from '../release-flags';
import { AdminListingProductsController } from './admin-listing-products.controller';
import { AdminListingProductsService } from './admin-listing-products.service';
import {
  ListingEntitlement,
  ListingOrder,
  ListingOrderItem,
  ListingProductCatalog,
  ListingProductChange,
} from './entities';
import { ListingProductsController } from './listing-products.controller';
import { ListingProductsService } from './listing-products.service';

const LISTING_COMMERCE_ENTITIES = [
  ListingProductCatalog,
  ListingOrder,
  ListingOrderItem,
  ListingEntitlement,
  ListingProductChange,
];

@Module({
  imports: [
    TypeOrmModule.forFeature(LISTING_COMMERCE_ENTITIES),
    ReleaseFlagsModule,
  ],
  controllers: [ListingProductsController, AdminListingProductsController],
  providers: [ListingProductsService, AdminListingProductsService],
  exports: [TypeOrmModule, ListingProductsService],
})
export class ListingCommerceModule {}
