import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Delete,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import {
  CreateListingAgentProposalMessageDto,
  HideListingAgentProposalsDto,
  ListingAgentAssignmentQueryDto,
  ListingAgentProposalInputDto,
  ListingAgentProposalMessageQueryDto,
  ListingAgentProposalQueryDto,
  ReopenListingAgentRecruitmentDto,
  UpdateListingAgentProposalDto,
} from './dto';
import { ListingAgentProposalsService } from './listing-agent-proposals.service';

@Controller('listing-agent-proposals')
export class ListingAgentProposalsController {
  constructor(
    private readonly listingAgentProposalsService: ListingAgentProposalsService,
  ) {}

  /** POST /api/listing-agent-proposals/listings/:listingId — submit a collaboration proposal as an agent. */
  @Post('listings/:listingId')
  @Roles(UserRole.AGENT)
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
  @Roles(UserRole.AGENT)
  async findForAgent(
    @CurrentUser('id') userId: string,
    @Query() query: ListingAgentProposalQueryDto,
  ) {
    return this.listingAgentProposalsService.findForAgent(userId, query);
  }

  /** GET /api/listing-agent-proposals/agent/assignments — list accepted listing collaborations for the current agent. */
  @Get('agent/assignments')
  @Roles(UserRole.AGENT)
  async findAssignmentsForAgent(
    @CurrentUser('id') userId: string,
    @Query() query: ListingAgentAssignmentQueryDto,
  ) {
    return this.listingAgentProposalsService.findAssignmentsForAgent(
      userId,
      query,
    );
  }

  /** POST /api/listing-agent-proposals/agent/assignments/:id/create-listing-copy — create an editable CRM listing copy from an accepted assignment. */
  @Post('agent/assignments/:id/create-listing-copy')
  @Roles(UserRole.AGENT)
  async createListingCopyForAgentAssignment(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.listingAgentProposalsService.createListingCopyForAgentAssignment(
      userId,
      id,
    );
  }

  /** GET /api/listing-agent-proposals/agent/:id — show one proposal sent by the current agent. */
  @Get('agent/:id')
  @Roles(UserRole.AGENT)
  async findOneForAgent(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.listingAgentProposalsService.findOneForAgent(userId, id);
  }

  /** PATCH /api/listing-agent-proposals/agent/:id — edit an active proposal sent by the current agent. */
  @Patch('agent/:id')
  @Roles(UserRole.AGENT)
  async updateForAgent(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateListingAgentProposalDto,
  ) {
    return this.listingAgentProposalsService.updateForAgent(userId, id, dto);
  }

  /** POST /api/listing-agent-proposals/agent/:id/withdraw — withdraw an active proposal sent by the current agent. */
  @Post('agent/:id/withdraw')
  @Roles(UserRole.AGENT)
  async withdrawForAgent(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.listingAgentProposalsService.withdrawForAgent(userId, id);
  }

  /** DELETE /api/listing-agent-proposals/agent/:id — hide one proposal from the current agent's sent proposals list. */
  @Delete('agent/:id')
  @Roles(UserRole.AGENT)
  async hideOneForAgent(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.listingAgentProposalsService.hideForAgent(userId, [id]);
  }

  /** POST /api/listing-agent-proposals/agent/hide — hide multiple proposals from the current agent's sent proposals list. */
  @Post('agent/hide')
  @Roles(UserRole.AGENT)
  async hideManyForAgent(
    @CurrentUser('id') userId: string,
    @Body() dto: HideListingAgentProposalsDto,
  ) {
    return this.listingAgentProposalsService.hideForAgent(userId, dto.ids);
  }

  /** GET /api/listing-agent-proposals/seller — list proposals received by the current private seller. */
  @Get('seller')
  @Roles(UserRole.OWNER, UserRole.VIEWER)
  async findForSeller(
    @CurrentUser('id') userId: string,
    @Query() query: ListingAgentProposalQueryDto,
  ) {
    return this.listingAgentProposalsService.findForSeller(userId, query);
  }

  /** GET /api/listing-agent-proposals/seller/:id — show one proposal received by the current private seller. */
  @Get('seller/:id')
  @Roles(UserRole.OWNER, UserRole.VIEWER)
  async findOneForSeller(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.listingAgentProposalsService.findOneForSeller(userId, id);
  }

  /** POST /api/listing-agent-proposals/seller/:id/accept — accept an agent proposal and create an assignment. */
  @Post('seller/:id/accept')
  @Roles(UserRole.OWNER, UserRole.VIEWER)
  async acceptForSeller(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.listingAgentProposalsService.acceptForSeller(userId, id);
  }

  /** POST /api/listing-agent-proposals/seller/:id/reject — reject an agent proposal. */
  @Post('seller/:id/reject')
  @Roles(UserRole.OWNER, UserRole.VIEWER)
  async rejectForSeller(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.listingAgentProposalsService.rejectForSeller(userId, id);
  }

  /** DELETE /api/listing-agent-proposals/seller/:id — hide one proposal from the current seller's received proposals list. */
  @Delete('seller/:id')
  @Roles(UserRole.OWNER, UserRole.VIEWER)
  async hideOneForSeller(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.listingAgentProposalsService.hideForSeller(userId, [id]);
  }

  /** POST /api/listing-agent-proposals/seller/hide — hide multiple proposals from the current seller's received proposals list. */
  @Post('seller/hide')
  @Roles(UserRole.OWNER, UserRole.VIEWER)
  async hideManyForSeller(
    @CurrentUser('id') userId: string,
    @Body() dto: HideListingAgentProposalsDto,
  ) {
    return this.listingAgentProposalsService.hideForSeller(userId, dto.ids);
  }

  /** POST /api/listing-agent-proposals/seller/listings/:listingId/close-recruitment — close agent recruitment for an owned listing. */
  @Post('seller/listings/:listingId/close-recruitment')
  @Roles(UserRole.OWNER, UserRole.VIEWER)
  async closeRecruitmentForSeller(
    @CurrentUser('id') userId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ) {
    return this.listingAgentProposalsService.closeRecruitmentForSeller(
      userId,
      listingId,
    );
  }

  /** POST /api/listing-agent-proposals/seller/listings/:listingId/reopen-recruitment — reopen agent recruitment for an owned listing. */
  @Post('seller/listings/:listingId/reopen-recruitment')
  @Roles(UserRole.OWNER, UserRole.VIEWER)
  async reopenRecruitmentForSeller(
    @CurrentUser('id') userId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Body() dto: ReopenListingAgentRecruitmentDto = {},
  ) {
    return this.listingAgentProposalsService.reopenRecruitmentForSeller(
      userId,
      listingId,
      dto,
    );
  }

  /** GET /api/listing-agent-proposals/:id/messages — list chat messages for a proposal participant. */
  @Get(':id/messages')
  @Roles(UserRole.OWNER, UserRole.VIEWER, UserRole.AGENT)
  async findMessages(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListingAgentProposalMessageQueryDto,
  ) {
    return this.listingAgentProposalsService.findMessages(userId, id, query);
  }

  /** POST /api/listing-agent-proposals/:id/messages — send a chat message as a proposal participant. */
  @Post(':id/messages')
  @Roles(UserRole.OWNER, UserRole.VIEWER, UserRole.AGENT)
  async createMessage(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateListingAgentProposalMessageDto,
  ) {
    return this.listingAgentProposalsService.createMessage(userId, id, dto);
  }
}
