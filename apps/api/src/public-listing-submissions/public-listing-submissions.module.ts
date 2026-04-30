import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityModule } from '../activity';
import { EmailModule } from '../email';
import { Address } from '../listings/entities/address.entity';
import { Listing } from '../listings/entities/listing.entity';
import { ListingImage } from '../listings/entities/listing-image.entity';
import { Agent, Agency } from '../users/entities';
import { UsersModule } from '../users';
import { PublicListingSubmission } from './entities';
import { PublicListingSubmissionsController } from './public-listing-submissions.controller';
import { PublicListingSubmissionsService } from './public-listing-submissions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PublicListingSubmission,
      Listing,
      Address,
      ListingImage,
      Agent,
      Agency,
    ]),
    ActivityModule,
    EmailModule,
    UsersModule,
  ],
  controllers: [PublicListingSubmissionsController],
  providers: [PublicListingSubmissionsService],
  exports: [TypeOrmModule, PublicListingSubmissionsService],
})
export class PublicListingSubmissionsModule {}
