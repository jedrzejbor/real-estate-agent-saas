import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ListingEntitlementsService } from './listing-entitlements.service';

@Controller('listing-entitlements')
export class ListingEntitlementsController {
  constructor(
    private readonly listingEntitlementsService: ListingEntitlementsService,
  ) {}

  /** GET /api/listing-entitlements/by-listing/:listingId — owner-scoped lifecycle state. */
  @Get('by-listing/:listingId')
  findOwnedForListing(
    @CurrentUser('id') userId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ) {
    return this.listingEntitlementsService.findOwnedForListing(
      userId,
      listingId,
    );
  }
}
