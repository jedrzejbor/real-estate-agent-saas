import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateListingQuoteDto } from './dto';
import { ListingQuotesService } from './listing-quotes.service';

@Controller('listing-checkout')
export class ListingCheckoutController {
  constructor(private readonly listingQuotesService: ListingQuotesService) {}

  /** POST /api/listing-checkout/quote — authoritative server-side quote. */
  @Post('quote')
  @HttpCode(HttpStatus.OK)
  createQuote(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateListingQuoteDto,
  ) {
    return this.listingQuotesService.createQuote(userId, dto);
  }
}
