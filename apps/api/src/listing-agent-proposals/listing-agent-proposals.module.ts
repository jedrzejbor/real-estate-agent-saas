import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '../email';
import { Listing } from '../listings/entities';
import { UsersModule } from '../users';
import { ListingAgentProposalsController } from './listing-agent-proposals.controller';
import { ListingAgentProposal } from './entities';
import { ListingAgentProposalsService } from './listing-agent-proposals.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ListingAgentProposal, Listing]),
    UsersModule,
    EmailModule,
  ],
  controllers: [ListingAgentProposalsController],
  providers: [ListingAgentProposalsService],
  exports: [ListingAgentProposalsService],
})
export class ListingAgentProposalsModule {}
