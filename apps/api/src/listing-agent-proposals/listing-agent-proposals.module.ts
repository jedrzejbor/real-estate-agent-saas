import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsModule } from '../analytics';
import { EmailModule } from '../email';
import { Address, Listing, ListingImage } from '../listings/entities';
import { MonitoringModule } from '../monitoring';
import { UsersModule } from '../users';
import { ListingAgentProposalsController } from './listing-agent-proposals.controller';
import {
  ListingAgentAssignment,
  ListingAgentProposal,
  ListingAgentProposalMessage,
} from './entities';
import { ListingAgentProposalsService } from './listing-agent-proposals.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ListingAgentProposal,
      ListingAgentAssignment,
      ListingAgentProposalMessage,
      Listing,
      Address,
      ListingImage,
    ]),
    AnalyticsModule,
    UsersModule,
    EmailModule,
    MonitoringModule,
  ],
  controllers: [ListingAgentProposalsController],
  providers: [ListingAgentProposalsService],
  exports: [ListingAgentProposalsService],
})
export class ListingAgentProposalsModule {}
