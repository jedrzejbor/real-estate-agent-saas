import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ListingCheckoutSessionsService } from './listing-checkout-sessions.service';
import { ListingOrdersService } from './listing-orders.service';

@Controller('listing-orders')
export class ListingOrdersController {
  constructor(
    private readonly listingOrdersService: ListingOrdersService,
    private readonly listingCheckoutSessionsService: ListingCheckoutSessionsService,
  ) {}

  /** GET /api/listing-orders/by-listing/:listingId — owner-scoped order history. */
  @Get('by-listing/:listingId')
  findOwnedOrdersForListing(
    @CurrentUser('id') userId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ) {
    return this.listingOrdersService.findOwnedOrdersForListing(
      userId,
      listingId,
    );
  }

  /** GET /api/listing-orders/:id — current state for the owning buyer. */
  @Get(':id')
  findOwnedOrder(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    return this.listingOrdersService.findOwnedOrder(userId, orderId);
  }

  /** POST /api/listing-orders/:id/checkout-session — start or resume Stripe checkout. */
  @Post(':id/checkout-session')
  @HttpCode(HttpStatus.OK)
  createCheckoutSession(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    return this.listingCheckoutSessionsService.createOwnedCheckoutSession(
      userId,
      orderId,
    );
  }
}
