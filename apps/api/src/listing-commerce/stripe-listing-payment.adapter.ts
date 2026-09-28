import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type { VerifiedListingPaymentEventContract } from './contracts';
import type {
  CreatedListingPaymentSession,
  CreateListingPaymentSessionInput,
  ListingPaymentGateway,
} from './listing-payment-gateway.port';
import { ListingPaymentEventType } from './listing-commerce.types';

const STRIPE_PROVIDER = 'stripe';

@Injectable()
export class StripeListingPaymentAdapter implements ListingPaymentGateway {
  readonly provider = STRIPE_PROVIDER;

  private client: Stripe | null = null;

  constructor(private readonly configService: ConfigService) {}

  async createCheckoutSession(
    input: CreateListingPaymentSessionInput,
  ): Promise<CreatedListingPaymentSession> {
    const session = await this.getClient().checkout.sessions.create(
      {
        mode: 'payment',
        client_reference_id: input.orderId,
        customer_email: input.buyerEmail,
        expires_at: Math.floor(input.expiresAt.getTime() / 1_000),
        success_url: this.buildRedirectUrl('success', input.orderId),
        cancel_url: this.buildRedirectUrl('cancel', input.orderId),
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: input.currency.toLowerCase(),
              unit_amount: input.totalGrossAmount,
              product_data: {
                name: `Zamówienie ${input.orderNumber}`,
                description: truncateDescription(input.itemNames.join(', ')),
              },
            },
          },
        ],
        metadata: {
          listingOrderId: input.orderId,
          listingOrderNumber: input.orderNumber,
          listingPaymentAttemptId: input.paymentAttemptId,
          listingPaymentAttemptNumber: String(input.attemptNumber),
        },
        payment_intent_data: {
          metadata: {
            listingOrderId: input.orderId,
            listingOrderNumber: input.orderNumber,
            listingPaymentAttemptId: input.paymentAttemptId,
            listingPaymentAttemptNumber: String(input.attemptNumber),
          },
        },
      },
      {
        idempotencyKey: `listing-payment-attempt:${input.paymentAttemptId}:checkout:v1`,
      },
    );

    if (!session.url) {
      throw new ServiceUnavailableException(
        'Operator płatności nie zwrócił adresu checkoutu',
      );
    }

    return {
      provider: STRIPE_PROVIDER,
      sessionId: session.id,
      checkoutUrl: session.url,
      expiresAt: session.expires_at
        ? new Date(session.expires_at * 1_000)
        : null,
    };
  }

  verifyAndMapWebhook(
    rawBody: Buffer,
    signature: string,
  ): VerifiedListingPaymentEventContract | null {
    const secret = this.configService.get<string>(
      'STRIPE_LISTING_WEBHOOK_SECRET',
    );
    if (!secret) {
      throw new ServiceUnavailableException(
        'Stripe listing webhook secret is not configured',
      );
    }

    let event: Stripe.Event;
    try {
      event = this.getClient().webhooks.constructEvent(
        rawBody,
        signature,
        secret,
      );
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    return mapStripeListingPaymentEvent(event);
  }

  private getClient(): Stripe {
    if (this.client) return this.client;

    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new ServiceUnavailableException(
        'Stripe secret key is not configured',
      );
    }
    this.client = new Stripe(secretKey, {
      maxNetworkRetries: 2,
      timeout: 10_000,
    });
    return this.client;
  }

  private buildRedirectUrl(
    outcome: 'success' | 'cancel',
    orderId: string,
  ): string {
    const configured = this.configService.get<string>(
      outcome === 'success'
        ? 'STRIPE_LISTING_SUCCESS_URL'
        : 'STRIPE_LISTING_CANCEL_URL',
    );
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    let url: URL;
    try {
      url = new URL(
        configured || `/seller/payments/${outcome}`,
        frontendUrl,
      );
    } catch {
      throw new ServiceUnavailableException(
        'Stripe listing redirect URL is invalid',
      );
    }
    const production =
      this.configService.get<string>('NODE_ENV') === 'production';
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      (production && url.protocol !== 'https:')
    ) {
      throw new ServiceUnavailableException(
        'Stripe listing redirect URL is not secure',
      );
    }
    url.searchParams.set('orderId', orderId);
    if (outcome === 'success') {
      url.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
    }
    return url
      .toString()
      .replace('%7BCHECKOUT_SESSION_ID%7D', '{CHECKOUT_SESSION_ID}');
  }
}

export function mapStripeListingPaymentEvent(
  event: Stripe.Event,
): VerifiedListingPaymentEventContract | null {
  const eventType = mapStripeEventType(event.type);
  if (!eventType) return null;

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.listingOrderId;
  if (!orderId) {
    throw new BadRequestException(
      'Stripe checkout session does not identify a listing order',
    );
  }

  if (
    eventType === ListingPaymentEventType.PAYMENT_SUCCEEDED &&
    session.payment_status !== 'paid'
  ) {
    return null;
  }

  return {
    provider: STRIPE_PROVIDER,
    eventId: event.id,
    eventType,
    orderId,
    paymentAttemptId: session.metadata?.listingPaymentAttemptId ?? null,
    checkoutSessionId: session.id,
    paymentId: getExpandableId(session.payment_intent),
    amountGross: session.amount_total,
    currency: session.currency?.toUpperCase() ?? null,
    occurredAt: new Date(event.created * 1_000),
    payload: {
      stripeEventType: event.type,
      livemode: event.livemode,
      paymentStatus: session.payment_status,
      status: session.status,
    },
  };
}

function mapStripeEventType(
  type: string,
): ListingPaymentEventType | null {
  switch (type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      return ListingPaymentEventType.PAYMENT_SUCCEEDED;
    case 'checkout.session.async_payment_failed':
      return ListingPaymentEventType.PAYMENT_FAILED;
    case 'checkout.session.expired':
      return ListingPaymentEventType.CHECKOUT_EXPIRED;
    default:
      return null;
  }
}

function getExpandableId(
  value: string | Stripe.PaymentIntent | null,
): string | null {
  return typeof value === 'string' ? value : value?.id ?? null;
}

function truncateDescription(value: string): string | undefined {
  const normalized = value.trim();
  return normalized ? normalized.slice(0, 500) : undefined;
}
