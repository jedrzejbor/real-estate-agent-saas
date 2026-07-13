import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  FavoriteListingIdsQueryDto,
  FavoriteListingQueryDto,
} from './dto';
import { FavoriteListingsService } from './favorite-listings.service';

@Controller('favorite-listings')
export class FavoriteListingsController {
  constructor(
    private readonly favoriteListingsService: FavoriteListingsService,
  ) {}

  /** GET /api/favorite-listings — list current user's favorite listings. */
  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: FavoriteListingQueryDto,
  ) {
    return this.favoriteListingsService.findUserFavorites(userId, query);
  }

  /** GET /api/favorite-listings/ids — check which listing IDs are favorites. */
  @Get('ids')
  async findIds(
    @CurrentUser('id') userId: string,
    @Query() query: FavoriteListingIdsQueryDto,
  ) {
    return this.favoriteListingsService.findFavoriteListingIds(
      userId,
      query.listingIds,
    );
  }

  /** POST /api/favorite-listings/:listingId — add a public listing to favorites. */
  @Post(':listingId')
  @HttpCode(HttpStatus.CREATED)
  async add(
    @CurrentUser('id') userId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ) {
    return this.favoriteListingsService.addFavorite(userId, listingId);
  }

  /** DELETE /api/favorite-listings/:listingId — remove a listing from favorites. */
  @Delete(':listingId')
  async remove(
    @CurrentUser('id') userId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ) {
    return this.favoriteListingsService.removeFavorite(userId, listingId);
  }
}
