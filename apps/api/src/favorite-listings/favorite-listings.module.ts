import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../listings/entities';
import { FavoriteListing } from './entities';
import { FavoriteListingsController } from './favorite-listings.controller';
import { FavoriteListingsService } from './favorite-listings.service';

@Module({
  imports: [TypeOrmModule.forFeature([FavoriteListing, Listing])],
  controllers: [FavoriteListingsController],
  providers: [FavoriteListingsService],
  exports: [FavoriteListingsService],
})
export class FavoriteListingsModule {}
