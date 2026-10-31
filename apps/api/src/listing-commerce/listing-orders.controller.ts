import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminPermission, UserRole } from '../common/enums';
import { RequestListingRefundDto } from './dto/request-listing-refund.dto';
import { ListingOrdersService } from './listing-orders.service';
import { ListingRefundsService } from './listing-refunds.service';
import { RefundAdminGuard } from './refund-admin.guard';

@Controller('listing-orders')
export class ListingOrdersController {
  constructor(
    private readonly listingOrdersService: ListingOrdersService,
    private readonly listingRefundsService: ListingRefundsService,
  ) {}

  /** POST /api/listing-orders/:id/refunds — explicit admin permission only. */
  @Post(':id/refunds')
  @Roles(UserRole.ADMIN)
  @Permissions(AdminPermission.LISTING_COMMERCE_MANAGE_REFUNDS)
  @UseGuards(RefundAdminGuard)
  @HttpCode(HttpStatus.OK)
  requestRefund(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: RequestListingRefundDto,
  ) {
    return this.listingRefundsService.requestRefund(adminUserId, orderId, dto);
  }

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

  /** POST /api/listing-orders/:id/checkout-session — unavailable during payment migration. */
  @Post(':id/checkout-session')
  @HttpCode(HttpStatus.OK)
  createCheckoutSession() {
    throw new ServiceUnavailableException({
      code: 'PAYMENTS_UNAVAILABLE',
      message: 'Płatności są tymczasowo niedostępne. Spróbuj ponownie później.',
    });
  }
}
