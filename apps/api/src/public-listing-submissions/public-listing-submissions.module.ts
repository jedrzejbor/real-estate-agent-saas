import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../listings/entities/listing.entity';
import { Agent, Agency } from '../users/entities';
import { PublicListingSubmission } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([PublicListingSubmission, Listing, Agent, Agency]),
  ],
  exports: [TypeOrmModule],
})
export class PublicListingSubmissionsModule {}
