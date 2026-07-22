import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import {
  ListingAgentProposalInputDto,
  ListingAgentProposalQueryDto,
  UpdateListingAgentProposalDto,
} from './dto';
import { ListingAgentProposalsService } from './listing-agent-proposals.service';

@Controller('listing-agent-proposals')
@Roles(UserRole.AGENT)
export class ListingAgentProposalsController {
  constructor(
    private readonly listingAgentProposalsService: ListingAgentProposalsService,
  ) {}

  /** POST /api/listing-agent-proposals/listings/:listingId — submit a collaboration proposal as an agent. */
  @Post('listings/:listingId')
  async createForListing(
    @CurrentUser('id') userId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Body() dto: ListingAgentProposalInputDto,
  ) {
    return this.listingAgentProposalsService.createForListing(
      userId,
      listingId,
      dto,
    );
  }

  /** GET /api/listing-agent-proposals/agent — list proposals sent by the current agent. */
  @Get('agent')
  async findForAgent(
    @CurrentUser('id') userId: string,
    @Query() query: ListingAgentProposalQueryDto,
  ) {
    return this.listingAgentProposalsService.findForAgent(userId, query);
  }

  /** GET /api/listing-agent-proposals/agent/:id — show one proposal sent by the current agent. */
  @Get('agent/:id')
  async findOneForAgent(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.listingAgentProposalsService.findOneForAgent(userId, id);
  }

  /** PATCH /api/listing-agent-proposals/agent/:id — edit an active proposal sent by the current agent. */
  @Patch('agent/:id')
  async updateForAgent(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateListingAgentProposalDto,
  ) {
    return this.listingAgentProposalsService.updateForAgent(userId, id, dto);
  }

  /** POST /api/listing-agent-proposals/agent/:id/withdraw — withdraw an active proposal sent by the current agent. */
  @Post('agent/:id/withdraw')
  async withdrawForAgent(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.listingAgentProposalsService.withdrawForAgent(userId, id);
  }
}
