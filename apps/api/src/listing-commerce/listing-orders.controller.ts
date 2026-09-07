import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ListingOrdersService } from './listing-orders.service';

@Controller('listing-orders')
export class ListingOrdersController {
  constructor(private readonly listingOrdersService: ListingOrdersService) {}

  /** GET /api/listing-orders/:id — current state for the owning buyer. */
  @Get(':id')
  findOwnedOrder(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    return this.listingOrdersService.findOwnedOrder(userId, orderId);
  }
}
