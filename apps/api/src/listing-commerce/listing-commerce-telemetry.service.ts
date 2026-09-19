import { Injectable, Logger, Optional } from '@nestjs/common';
import { AnalyticsService } from '../analytics';
import type {
  ListingCheckoutSessionContract,
  ListingOrderContract,
  ListingPaymentEventResultContract,
  ListingQuoteContract,
} from './contracts';
import { ListingPaymentEventType } from './listing-commerce.types';

type TelemetryProperties = Record<
  string,
  string | number | boolean | null | string[]
>;

@Injectable()
export class ListingCommerceTelemetryService {
  private readonly logger = new Logger(ListingCommerceTelemetryService.name);

  constructor(
    @Optional()
    private readonly analyticsService?: AnalyticsService,
  ) {}

  trackQuoteCreated(input: {
    buyerUserId: string;
    quote: ListingQuoteContract;
    promotionCodeProvided: boolean;
  }): Promise<void> {
    return this.track('listing_quote_created', input.buyerUserId, {
      ...quoteProperties(input.quote),
      promotionCodeProvided: input.promotionCodeProvided,
    });
  }

  trackOrderCreated(input: {
    buyerUserId: string;
    order: ListingOrderContract;
  }): Promise<void> {
    return this.track('listing_order_created', input.buyerUserId, {
      orderId: input.order.id,
      listingId: input.order.listingId,
      status: input.order.status,
      currency: input.order.currency,
      subtotalGrossAmount: input.order.subtotalGrossAmount,
      discountGrossAmount: input.order.discountGrossAmount,
      totalGrossAmount: input.order.totalGrossAmount,
      itemCount: input.order.items.length,
      productTypes: uniqueStrings(
        input.order.items.map((item) => item.productType),
      ),
      requiresPayment: input.order.requiresPayment,
      zeroValue: input.order.totalGrossAmount === 0,
    });
  }

  trackCheckoutSessionCreated(input: {
    buyerUserId: string;
    session: ListingCheckoutSessionContract;
  }): Promise<void> {
    return this.track('listing_checkout_session_created', input.buyerUserId, {
      orderId: input.session.orderId,
      orderStatus: input.session.orderStatus,
      provider: input.session.provider,
      attemptNumber: input.session.attemptNumber,
    });
  }

  trackPaymentEventProcessed(input: {
    result: ListingPaymentEventResultContract;
    eventType: ListingPaymentEventType;
    provider: string;
  }): Promise<void> {
    return this.track('listing_payment_event_processed', null, {
      orderId: input.result.orderId,
      orderStatus: input.result.orderStatus,
      outcome: input.result.status,
      eventType: input.eventType,
      provider: input.provider,
    });
  }

  trackPaymentEventFailed(input: {
    orderId: string;
    eventType: ListingPaymentEventType;
    provider: string;
    error: unknown;
  }): Promise<void> {
    return this.track('listing_payment_event_failed', null, {
      orderId: input.orderId,
      eventType: input.eventType,
      provider: input.provider,
      errorName:
        input.error instanceof Error ? input.error.constructor.name : 'Unknown',
    });
  }

  private async track(
    name: string,
    userId: string | null,
    properties: TelemetryProperties,
  ): Promise<void> {
    if (!this.analyticsService) return;

    try {
      await this.analyticsService.trackSystemEvent({
        name,
        userId,
        properties,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to track listing commerce telemetry event ${name}: ${getErrorMessage(error)}`,
      );
    }
  }
}

function quoteProperties(quote: ListingQuoteContract): TelemetryProperties {
  return {
    listingId: quote.listingId,
    currency: quote.currency,
    subtotalGrossAmount: quote.subtotalGrossAmount,
    discountGrossAmount: quote.discountGrossAmount,
    totalGrossAmount: quote.totalGrossAmount,
    vatGrossAmount: quote.vatGrossAmount,
    itemCount: quote.items.length,
    discountCount: quote.discounts.length,
    productTypes: uniqueStrings(quote.items.map((item) => item.productType)),
    discountSourceTypes: uniqueStrings(
      quote.discounts.map((discount) => discount.sourceType),
    ),
    zeroValue: quote.totalGrossAmount === 0,
  };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

