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
import { AgencyPlanPaymentEventsService } from './agency-plan-payment-events.service';
import { StripeAgencyPlanPaymentAdapter } from './stripe-agency-plan-payment.adapter';

@Controller('agency-plan-payments/webhooks')
export class StripeAgencyPlanWebhooksController {
  constructor(
    private readonly stripeAdapter: StripeAgencyPlanPaymentAdapter,
    private readonly agencyPlanPaymentEventsService: AgencyPlanPaymentEventsService,
  ) {}

  /** POST /api/agency-plan-payments/webhooks/stripe — raw, signed Stripe events for agency plan checkout. */
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
      await this.agencyPlanPaymentEventsService.processVerifiedEvent(event);
    return { received: true, processed: true, result };
  }
}
