import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateListingOrderDto, CreateListingQuoteDto } from './dto';
import { ListingOrdersService } from './listing-orders.service';
import { ListingQuotesService } from './listing-quotes.service';

@Controller('listing-checkout')
export class ListingCheckoutController {
  constructor(
    private readonly listingQuotesService: ListingQuotesService,
    private readonly listingOrdersService: ListingOrdersService,
  ) {}

  /** POST /api/listing-checkout/quote — authoritative server-side quote. */
  @Post('quote')
  @HttpCode(HttpStatus.OK)
  createQuote(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateListingQuoteDto,
  ) {
    return this.listingQuotesService.createQuote(userId, dto);
  }

  /** POST /api/listing-checkout/orders — create an order without a provider session. */
  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  createOrder(
    @CurrentUser('id') userId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreateListingOrderDto,
  ) {
    return this.listingOrdersService.createOrder(userId, idempotencyKey, dto);
  }
}
