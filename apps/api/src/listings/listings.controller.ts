import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ListingsService } from './listings.service';
import { CreateListingDto, UpdateListingDto, ListingQueryDto } from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  /** POST /api/listings — create a new listing. */
  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateListingDto,
  ) {
    return this.listingsService.create(userId, dto);
  }

  /** GET /api/listings — list all listings (paginated, filtered). */
  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: ListingQueryDto,
  ) {
    return this.listingsService.findAll(userId, query);
  }

  /** GET /api/listings/public — list public listing URLs for sitemap. */
  @Public()
  @Get('public')
  async findPublicSitemapEntries() {
    return this.listingsService.findPublicSitemapEntries();
  }

  /** GET /api/listings/public-agents/:agentId — get public agent profile. */
  @Public()
  @Get('public-agents/:agentId')
  async findPublicAgentProfile(
    @Param('agentId', ParseUUIDPipe) agentId: string,
  ) {
    return this.listingsService.findPublicAgentProfile(agentId);
  }

  /** GET /api/listings/public/:slug — get public listing by slug. */
  @Public()
  @Get('public/:slug')
  async findPublicBySlug(@Param('slug') slug: string) {
    return this.listingsService.findPublicBySlug(slug);
  }

  /** GET /api/listings/:id/history — get audit log for a listing. */
  @Get(':id/history')
  async findHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.listingsService.findHistory(id, userId);
  }

  /** GET /api/listings/:id — get single listing. */
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.listingsService.findOne(id, userId);
  }

  /** PATCH /api/listings/:id — update a listing. */
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.listingsService.update(id, userId, dto);
  }

  /** POST /api/listings/:id/publish — publish public listing page. */
  @Post(':id/publish')
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.listingsService.publish(id, userId);
  }

  /** POST /api/listings/:id/unpublish — unpublish public listing page. */
  @Post(':id/unpublish')
  async unpublish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.listingsService.unpublish(id, userId);
  }

  /** POST /api/listings/:id/status/rollback — rollback latest status change. */
  @Post(':id/status/rollback')
  async rollbackStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.listingsService.rollbackStatus(id, userId);
  }

  /** DELETE /api/listings/:id — archive/delete a listing. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.listingsService.remove(id, userId);
  }
}
