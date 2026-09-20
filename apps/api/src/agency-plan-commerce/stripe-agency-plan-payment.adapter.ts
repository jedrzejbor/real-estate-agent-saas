import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  AgencyPlanBillingInterval,
  AgencyPlanPaymentEventType,
} from './agency-plan-commerce.types';
import type { VerifiedAgencyPlanPaymentEventContract } from './contracts';
import type {
  AgencyPlanPaymentGateway,
  CreatedAgencyPlanSubscriptionCheckout,
  CreateAgencyPlanSubscriptionCheckoutInput,
} from './agency-plan-payment-gateway.port';

const STRIPE_PROVIDER = 'stripe';

@Injectable()
export class StripeAgencyPlanPaymentAdapter
  implements AgencyPlanPaymentGateway
{
  readonly provider = STRIPE_PROVIDER;

  private client: Stripe | null = null;

  constructor(private readonly configService: ConfigService) {}

  async createSubscriptionCheckoutSession(
    input: CreateAgencyPlanSubscriptionCheckoutInput,
  ): Promise<CreatedAgencyPlanSubscriptionCheckout> {
    const couponId = await this.createDiscountCoupon(input);
    const session = await this.getClient().checkout.sessions.create(
      {
        mode: 'subscription',
        client_reference_id: input.quoteId,
        ...(input.billingCustomerId
          ? { customer: input.billingCustomerId }
          : { customer_email: input.buyerEmail }),
        expires_at: Math.floor(input.expiresAt.getTime() / 1_000),
        success_url: this.buildRedirectUrl('success', input.quoteId),
        cancel_url: this.buildRedirectUrl('cancel', input.quoteId),
        line_items: [
          {
            quantity: 1,
            price: input.providerPriceReference,
          },
        ],
        discounts: couponId ? [{ coupon: couponId }] : undefined,
        metadata: buildMetadata(input),
        subscription_data: {
          metadata: buildMetadata(input),
        },
      },
      {
        idempotencyKey: `agency-plan-checkout-attempt:${input.checkoutAttemptId}:checkout:v1`,
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
      subscriptionId: getExpandableId(session.subscription),
      expiresAt: session.expires_at
        ? new Date(session.expires_at * 1_000)
        : null,
    };
  }

  verifyAndMapWebhook(
    rawBody: Buffer,
    signature: string,
  ): VerifiedAgencyPlanPaymentEventContract | null {
    const secret = this.configService.get<string>(
      'STRIPE_AGENCY_PLAN_WEBHOOK_SECRET',
    );
    if (!secret) {
      throw new ServiceUnavailableException(
        'Stripe agency plan webhook secret is not configured',
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

    return mapStripeAgencyPlanPaymentEvent(event);
  }

  private async createDiscountCoupon(
    input: CreateAgencyPlanSubscriptionCheckoutInput,
  ): Promise<string | null> {
    if (input.discountGrossAmount <= 0) return null;

    const durationCycles = input.discountDurationBillingCycles ?? 1;
    const coupon = await this.getClient().coupons.create(
      {
        name: `Rabat ${input.planLabel} (${input.quoteId})`,
        currency: input.currency.toLowerCase(),
        amount_off: input.discountGrossAmount,
        duration: durationCycles === 1 ? 'once' : 'repeating',
        ...(durationCycles === 1
          ? {}
          : {
              duration_in_months: getStripeCouponDurationInMonths(
                input.billingInterval,
                durationCycles,
              ),
            }),
        metadata: buildMetadata(input),
      },
      {
        idempotencyKey: `agency-plan-checkout-attempt:${input.checkoutAttemptId}:coupon:v1`,
      },
    );

    return coupon.id;
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
    quoteId: string,
  ): string {
    const configured = this.configService.get<string>(
      outcome === 'success'
        ? 'STRIPE_AGENCY_PLAN_SUCCESS_URL'
        : 'STRIPE_AGENCY_PLAN_CANCEL_URL',
    );
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    let url: URL;
    try {
      url = new URL(
        configured || `/dashboard/billing/${outcome}`,
        frontendUrl,
      );
    } catch {
      throw new ServiceUnavailableException(
        'Stripe agency plan redirect URL is invalid',
      );
    }
    const production =
      this.configService.get<string>('NODE_ENV') === 'production';
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      (production && url.protocol !== 'https:')
    ) {
      throw new ServiceUnavailableException(
        'Stripe agency plan redirect URL is not secure',
      );
    }
    url.searchParams.set('quoteId', quoteId);
    if (outcome === 'success') {
      url.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
    }
    return url
      .toString()
      .replace('%7BCHECKOUT_SESSION_ID%7D', '{CHECKOUT_SESSION_ID}');
  }
}

export function mapStripeAgencyPlanPaymentEvent(
  event: Stripe.Event,
): VerifiedAgencyPlanPaymentEventContract | null {
  const eventType = mapStripeEventType(event.type);
  if (!eventType) return null;

  const session = event.data.object as Stripe.Checkout.Session;
  const quoteId = session.metadata?.agencyPlanQuoteId;
  if (!quoteId) {
    throw new BadRequestException(
      'Stripe checkout session does not identify an agency plan quote',
    );
  }

  if (
    eventType === AgencyPlanPaymentEventType.CHECKOUT_COMPLETED &&
    session.payment_status !== 'paid'
  ) {
    return null;
  }

  return {
    provider: STRIPE_PROVIDER,
    eventId: event.id,
    eventType,
    quoteId,
    checkoutAttemptId:
      session.metadata?.agencyPlanCheckoutAttemptId ?? null,
    agencyId: session.metadata?.agencyId ?? null,
    checkoutSessionId: session.id,
    subscriptionId: getExpandableId(session.subscription),
    customerId: getExpandableId(session.customer),
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

function mapStripeEventType(type: string): AgencyPlanPaymentEventType | null {
  switch (type) {
    case 'checkout.session.completed':
      return AgencyPlanPaymentEventType.CHECKOUT_COMPLETED;
    case 'checkout.session.async_payment_failed':
      return AgencyPlanPaymentEventType.CHECKOUT_FAILED;
    case 'checkout.session.expired':
      return AgencyPlanPaymentEventType.CHECKOUT_EXPIRED;
    default:
      return null;
  }
}

function buildMetadata(
  input: CreateAgencyPlanSubscriptionCheckoutInput,
): Record<string, string> {
  return {
    agencyId: input.agencyId,
    agencyPlanQuoteId: input.quoteId,
    agencyPlanCheckoutAttemptId: input.checkoutAttemptId,
    agencyPlanCheckoutAttemptNumber: String(input.attemptNumber),
    planCode: input.planCode,
    billingInterval: input.billingInterval,
    subtotalGrossAmount: String(input.subtotalGrossAmount),
    discountGrossAmount: String(input.discountGrossAmount),
    totalGrossAmount: String(input.totalGrossAmount),
  };
}

function getStripeCouponDurationInMonths(
  billingInterval: AgencyPlanBillingInterval,
  durationBillingCycles: number,
): number {
  return billingInterval === AgencyPlanBillingInterval.YEARLY
    ? durationBillingCycles * 12
    : durationBillingCycles;
}

function getExpandableId(value: string | { id: string } | null): string | null {
  return typeof value === 'string' ? value : value?.id ?? null;
}
