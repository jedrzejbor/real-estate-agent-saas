import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from './entities/listing.entity';
import { ListingImage } from './entities/listing-image.entity';
import { Address } from './entities/address.entity';
import { Agent } from '../users/entities/agent.entity';
import { UsersModule } from '../users';
import { ActivityModule } from '../activity';
import { MonitoringModule } from '../monitoring';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Listing, ListingImage, Address, Agent]),
    UsersModule,
    ActivityModule,
    MonitoringModule,
  ],
  controllers: [ListingsController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}
