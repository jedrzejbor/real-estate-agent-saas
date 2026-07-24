import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../listings/entities';
import { ListingAgentProposal } from '../listing-agent-proposals';
import { ReleaseFlagsModule } from '../release-flags';
import { UsersModule } from '../users';
import { AgentListingMarketController } from './agent-listing-market.controller';
import { AgentListingMarketService } from './agent-listing-market.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Listing, ListingAgentProposal]),
    ReleaseFlagsModule,
    UsersModule,
  ],
  controllers: [AgentListingMarketController],
  providers: [AgentListingMarketService],
})
export class AgentListingMarketModule {}
