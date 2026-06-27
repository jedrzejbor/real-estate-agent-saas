import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from './entities/listing.entity';
import { ListingImage } from './entities/listing-image.entity';
import { Address } from './entities/address.entity';
import { Client } from '../clients/entities/client.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Agent } from '../users/entities/agent.entity';
import { AgencyRetainedListingChoice } from '../users/entities';
import { AnalyticsEvent } from '../analytics/entities/analytics-event.entity';
import { ListingDocumentEvent } from '../listing-documents/entities';
import { Location } from '../locations/entities';
import { PublicLead } from '../public-leads/entities/public-lead.entity';
import { Task } from '../tasks/entities';
import { UsersModule } from '../users';
import { ActivityModule } from '../activity';
import { MonitoringModule } from '../monitoring';
import { MatchingModule } from '../matching';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Listing,
      ListingImage,
      Address,
      Client,
      Appointment,
      Agent,
      Location,
      AnalyticsEvent,
      ListingDocumentEvent,
      PublicLead,
      Task,
      AgencyRetainedListingChoice,
    ]),
    UsersModule,
    ActivityModule,
    MonitoringModule,
    MatchingModule,
  ],
  controllers: [ListingsController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}
