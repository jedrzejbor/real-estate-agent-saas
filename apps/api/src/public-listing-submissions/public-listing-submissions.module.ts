import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '../email';
import { Listing } from '../listings/entities/listing.entity';
import { Agent, Agency } from '../users/entities';
import { PublicListingSubmission } from './entities';
import { PublicListingSubmissionsController } from './public-listing-submissions.controller';
import { PublicListingSubmissionsService } from './public-listing-submissions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PublicListingSubmission, Listing, Agent, Agency]),
    EmailModule,
  ],
  controllers: [PublicListingSubmissionsController],
  providers: [PublicListingSubmissionsService],
  exports: [TypeOrmModule, PublicListingSubmissionsService],
})
export class PublicListingSubmissionsModule {}
