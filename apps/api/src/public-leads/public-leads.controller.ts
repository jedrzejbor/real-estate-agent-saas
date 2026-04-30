import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
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
  @HttpCode(HttpStatus.CREATED)
  async createForPublicListing(
    @Param('slug') slug: string,
    @Body() dto: CreatePublicLeadDto,
    @Req() request: Request,
  ) {
    return this.publicLeadsService.createForPublicListing(slug, dto, request);
  }
}
