import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { AgentListingMarketService } from './agent-listing-market.service';
import { AgentListingMarketQueryDto } from './dto';

@Controller('agent-listing-market')
@Roles(UserRole.AGENT)
export class AgentListingMarketController {
  constructor(
    private readonly agentListingMarketService: AgentListingMarketService,
  ) {}

  /** GET /api/agent-listing-market — list owner listings open for agent collaboration. */
  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: AgentListingMarketQueryDto,
  ) {
    return this.agentListingMarketService.findAll(userId, query);
  }
}
