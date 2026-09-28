import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { ListingPaymentEventsService } from './listing-payment-events.service';
import { StripeListingPaymentAdapter } from './stripe-listing-payment.adapter';

@Controller('listing-payments/webhooks')
export class StripeListingWebhooksController {
  constructor(
    private readonly stripeAdapter: StripeListingPaymentAdapter,
    private readonly listingPaymentEventsService: ListingPaymentEventsService,
  ) {}

  /** POST /api/listing-payments/webhooks/stripe — raw, signed Stripe events. */
  @Public()
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ) {
    if (!request.rawBody) {
      throw new BadRequestException('Missing raw webhook body');
    }
    if (!signature) {
      throw new BadRequestException('Missing Stripe webhook signature');
    }

    const event = this.stripeAdapter.verifyAndMapWebhook(
      request.rawBody,
      signature,
    );
    if (!event) return { received: true, processed: false };

    const result =
      await this.listingPaymentEventsService.processVerifiedEvent(event);
    return { received: true, processed: true, result };
  }
}
