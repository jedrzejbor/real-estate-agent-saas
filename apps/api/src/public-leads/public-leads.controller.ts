import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { CreatePublicLeadDto } from './dto';
import { PublicLeadsService } from './public-leads.service';

@Controller('public-leads')
export class PublicLeadsController {
  constructor(private readonly publicLeadsService: PublicLeadsService) {}

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
