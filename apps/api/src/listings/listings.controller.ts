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
