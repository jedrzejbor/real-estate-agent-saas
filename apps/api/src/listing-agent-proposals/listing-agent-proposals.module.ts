import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '../email';
import { Listing } from '../listings/entities';
import { UsersModule } from '../users';
import { ListingAgentProposalsController } from './listing-agent-proposals.controller';
import { ListingAgentAssignment, ListingAgentProposal } from './entities';
import { ListingAgentProposalsService } from './listing-agent-proposals.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ListingAgentProposal, ListingAgentAssignment, Listing]),
    UsersModule,
    EmailModule,
  ],
  controllers: [ListingAgentProposalsController],
  providers: [ListingAgentProposalsService],
  exports: [ListingAgentProposalsService],
})
export class ListingAgentProposalsModule {}
