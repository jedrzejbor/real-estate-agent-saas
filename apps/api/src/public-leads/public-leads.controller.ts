import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CreatePublicLeadDto, PublicLeadQueryDto } from './dto';
import { PublicLeadsService } from './public-leads.service';

@Controller('public-leads')
export class PublicLeadsController {
  constructor(private readonly publicLeadsService: PublicLeadsService) {}

  /** GET /api/public-leads — list public inquiries for current agent. */
  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: PublicLeadQueryDto,
  ) {
    return this.publicLeadsService.findAll(userId, query);
  }

  /** POST /api/public-leads/listings/:slug — capture a public listing inquiry. */
  @Public()
  @Post('listings/:slug')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  async createForPublicListing(
    @Param('slug') slug: string,
    @Body() dto: CreatePublicLeadDto,
    @Req() request: Request,
  ) {
    return this.publicLeadsService.createForPublicListing(slug, dto, request);
  }

  /** POST /api/public-leads/agents/:agentId — capture a public profile inquiry. */
  @Public()
  @Post('agents/:agentId')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  async createForPublicAgentProfile(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body() dto: CreatePublicLeadDto,
    @Req() request: Request,
  ) {
    return this.publicLeadsService.createForPublicAgentProfile(
      agentId,
      dto,
      request,
    );
  }
}
