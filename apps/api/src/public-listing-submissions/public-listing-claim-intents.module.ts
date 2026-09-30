import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicListingSubmission } from './entities';
import { PublicListingClaimIntentsService } from './public-listing-claim-intents.service';

@Module({
  imports: [TypeOrmModule.forFeature([PublicListingSubmission])],
  providers: [PublicListingClaimIntentsService],
  exports: [PublicListingClaimIntentsService],
})
export class PublicListingClaimIntentsModule {}
