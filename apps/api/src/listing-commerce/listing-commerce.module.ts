import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ListingEntitlement,
  ListingOrder,
  ListingOrderItem,
  ListingProductCatalog,
} from './entities';

const LISTING_COMMERCE_ENTITIES = [
  ListingProductCatalog,
  ListingOrder,
  ListingOrderItem,
  ListingEntitlement,
];

@Module({
  imports: [TypeOrmModule.forFeature(LISTING_COMMERCE_ENTITIES)],
  exports: [TypeOrmModule],
})
export class ListingCommerceModule {}
