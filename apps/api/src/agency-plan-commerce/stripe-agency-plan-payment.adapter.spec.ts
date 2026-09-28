import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { AgencyPlan } from '../common/enums';
import {
  AgencyPlanBillingInterval,
  AgencyPlanPaymentEventType,
} from './agency-plan-commerce.types';
import {
  mapStripeAgencyPlanPaymentEvent,
  StripeAgencyPlanPaymentAdapter,
} from './stripe-agency-plan-payment.adapter';

function checkoutEvent(
  type: string,
  sessionOverrides: Record<string, unknown> = {},
): Stripe.Event {
  return {
    id: 'evt_agent_1',
    object: 'event',
    api_version: '2025-12-15.clover',
    created: 1_789_641_600,
    data: {
      object: {
        id: 'cs_agent_1',
        object: 'checkout.session',
        amount_total: 9_950,
        currency: 'pln',
        customer: 'cus_agent_1',
        metadata: {
          agencyId: 'agency-1',
          agencyPlanQuoteId: 'quote-1',
          agencyPlanCheckoutAttemptId: 'attempt-1',
        },
        payment_status: 'paid',
        status: 'complete',
        subscription: 'sub_agent_1',
        ...sessionOverrides,
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type,
  } as unknown as Stripe.Event;
}

describe('StripeAgencyPlanPaymentAdapter webhook mapping', () => {
  it.each([
    [
      'checkout.session.completed',
      AgencyPlanPaymentEventType.CHECKOUT_COMPLETED,
    ],
    [
      'checkout.session.async_payment_failed',
      AgencyPlanPaymentEventType.CHECKOUT_FAILED,
    ],
    [
      'checkout.session.expired',
      AgencyPlanPaymentEventType.CHECKOUT_EXPIRED,
    ],
  ])('maps %s into a verified agency plan payment event', (stripeType, domainType) => {
    expect(mapStripeAgencyPlanPaymentEvent(checkoutEvent(stripeType))).toEqual({
      provider: 'stripe',
      eventId: 'evt_agent_1',
      eventType: domainType,
      quoteId: 'quote-1',
      checkoutAttemptId: 'attempt-1',
      agencyId: 'agency-1',
      checkoutSessionId: 'cs_agent_1',
      subscriptionId: 'sub_agent_1',
      customerId: 'cus_agent_1',
      amountGross: 9_950,
      currency: 'PLN',
      occurredAt: new Date('2026-09-17T10:40:00.000Z'),
      payload: {
        stripeEventType: stripeType,
        livemode: false,
        paymentStatus: 'paid',
        status: 'complete',
      },
    });
  });

  it('ignores unsupported events and completed sessions awaiting payment', () => {
    expect(mapStripeAgencyPlanPaymentEvent(checkoutEvent('customer.created'))).toBeNull();
    expect(
      mapStripeAgencyPlanPaymentEvent(
        checkoutEvent('checkout.session.completed', {
          payment_status: 'unpaid',
        }),
      ),
    ).toBeNull();
  });

  it('rejects checkout events without trusted quote metadata', () => {
    expect(() =>
      mapStripeAgencyPlanPaymentEvent(
        checkoutEvent('checkout.session.completed', { metadata: {} }),
      ),
    ).toThrow(BadRequestException);
  });
});

describe('StripeAgencyPlanPaymentAdapter signature verification', () => {
  const signingSecret = 'whsec_agency_plan_test';
  const stripe = new Stripe('sk_test_placeholder');
  const configService = {
    get: jest.fn((key: string, fallback?: string) => {
      const values: Record<string, string> = {
        STRIPE_SECRET_KEY: 'sk_test_placeholder',
        STRIPE_AGENCY_PLAN_WEBHOOK_SECRET: signingSecret,
      };
      return values[key] ?? fallback;
    }),
  };

  it('verifies the signature against the unparsed body before mapping', () => {
    const payload = JSON.stringify(
      checkoutEvent('checkout.session.completed'),
    );
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: signingSecret,
    });
    const adapter = new StripeAgencyPlanPaymentAdapter(
      configService as unknown as ConfigService,
    );

    expect(
      adapter.verifyAndMapWebhook(Buffer.from(payload), signature),
    ).toMatchObject({
      eventId: 'evt_agent_1',
      eventType: AgencyPlanPaymentEventType.CHECKOUT_COMPLETED,
      quoteId: 'quote-1',
      checkoutAttemptId: 'attempt-1',
    });
    expect(() =>
      adapter.verifyAndMapWebhook(Buffer.from(payload), 'invalid'),
    ).toThrow(BadRequestException);
  });

  it('fails closed when the webhook secret is missing', () => {
    const adapter = new StripeAgencyPlanPaymentAdapter({
      get: jest.fn((key: string) =>
        key === 'STRIPE_SECRET_KEY' ? 'sk_test_placeholder' : undefined,
      ),
    } as unknown as ConfigService);

    expect(() =>
      adapter.verifyAndMapWebhook(Buffer.from('{}'), 'signature'),
    ).toThrow(ServiceUnavailableException);
  });
});

describe('StripeAgencyPlanPaymentAdapter checkout creation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-17T10:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('rejects an expiration below the Stripe minimum before creating a coupon or session', async () => {
    const couponsCreate = jest.fn();
    const sessionsCreate = jest.fn();
    const adapter = new StripeAgencyPlanPaymentAdapter({
      get: jest.fn(),
    } as unknown as ConfigService);
    (adapter as unknown as { client: Stripe }).client = {
      coupons: { create: couponsCreate },
      checkout: { sessions: { create: sessionsCreate } },
    } as unknown as Stripe;

    await expect(adapter.createSubscriptionCheckoutSession({
      expiresAt: new Date('2026-09-17T10:29:59.000Z'),
    } as never)).rejects.toThrow(BadRequestException);
    expect(couponsCreate).not.toHaveBeenCalled();
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it('creates a subscription checkout with a durable per-attempt coupon discount', async () => {
    const couponsCreate = jest.fn().mockResolvedValue({ id: 'coupon_attempt_1' });
    const sessionsCreate = jest.fn().mockResolvedValue({
      id: 'cs_agent_1',
      url: 'https://checkout.stripe.test/agent-session',
      subscription: 'sub_pending_1',
      expires_at: 1_789_641_900,
    });
    const configService = {
      get: jest.fn((key: string, fallback?: string) => {
        const values: Record<string, string> = {
          FRONTEND_URL: 'https://podadresem.test',
        };
        return values[key] ?? fallback;
      }),
    };
    const adapter = new StripeAgencyPlanPaymentAdapter(
      configService as unknown as ConfigService,
    );
    (adapter as unknown as { client: Stripe }).client = {
      coupons: { create: couponsCreate },
      checkout: { sessions: { create: sessionsCreate } },
    } as unknown as Stripe;

    await expect(
      adapter.createSubscriptionCheckoutSession({
        quoteId: 'quote-1',
        checkoutAttemptId: 'attempt-1',
        attemptNumber: 1,
        agencyId: 'agency-1',
        agencyName: 'Example Agency',
        buyerEmail: 'owner@example.com',
        billingCustomerId: null,
        planCode: AgencyPlan.PROFESSIONAL,
        planLabel: 'Professional',
        billingInterval: AgencyPlanBillingInterval.MONTHLY,
        providerPriceReference: 'price_professional_monthly',
        currency: 'PLN',
        subtotalGrossAmount: 19_900,
        discountGrossAmount: 9_950,
        totalGrossAmount: 9_950,
        discountDurationBillingCycles: 3,
        expiresAt: new Date('2026-09-17T10:45:00.000Z'),
      }),
    ).resolves.toEqual({
      provider: 'stripe',
      sessionId: 'cs_agent_1',
      checkoutUrl: 'https://checkout.stripe.test/agent-session',
      subscriptionId: 'sub_pending_1',
      expiresAt: new Date('2026-09-17T10:45:00.000Z'),
    });

    expect(couponsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Rabat Professional (quote-1)',
        currency: 'pln',
        amount_off: 9_950,
        duration: 'repeating',
        duration_in_months: 3,
        metadata: expect.objectContaining({
          agencyId: 'agency-1',
          agencyPlanQuoteId: 'quote-1',
          agencyPlanCheckoutAttemptId: 'attempt-1',
          discountGrossAmount: '9950',
          totalGrossAmount: '9950',
        }),
      }),
      {
        idempotencyKey:
          'agency-plan-checkout-attempt:attempt-1:coupon:v1',
      },
    );
    expect(sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        client_reference_id: 'quote-1',
        customer_email: 'owner@example.com',
        expires_at: 1_789_641_900,
        success_url:
          'https://podadresem.test/dashboard/upgrade?checkout=success&quoteId=quote-1&session_id={CHECKOUT_SESSION_ID}',
        cancel_url:
          'https://podadresem.test/dashboard/upgrade?checkout=cancel&quoteId=quote-1',
        line_items: [
          {
            quantity: 1,
            price: 'price_professional_monthly',
          },
        ],
        discounts: [{ coupon: 'coupon_attempt_1' }],
        metadata: expect.objectContaining({
          agencyPlanCheckoutAttemptId: 'attempt-1',
          planCode: AgencyPlan.PROFESSIONAL,
          billingInterval: AgencyPlanBillingInterval.MONTHLY,
        }),
        subscription_data: {
          metadata: expect.objectContaining({
            agencyPlanCheckoutAttemptId: 'attempt-1',
          }),
        },
      }),
      {
        idempotencyKey:
          'agency-plan-checkout-attempt:attempt-1:checkout:v1',
      },
    );
  });

  it('does not create a coupon when the quote has no discount', async () => {
    const couponsCreate = jest.fn();
    const sessionsCreate = jest.fn().mockResolvedValue({
      id: 'cs_agent_2',
      url: 'https://checkout.stripe.test/no-discount',
      subscription: null,
      expires_at: null,
    });
    const adapter = new StripeAgencyPlanPaymentAdapter({
      get: jest.fn((_key: string, fallback?: string) => fallback),
    } as unknown as ConfigService);
    (adapter as unknown as { client: Stripe }).client = {
      coupons: { create: couponsCreate },
      checkout: { sessions: { create: sessionsCreate } },
    } as unknown as Stripe;

    await adapter.createSubscriptionCheckoutSession({
      quoteId: 'quote-2',
      checkoutAttemptId: 'attempt-2',
      attemptNumber: 1,
      agencyId: 'agency-1',
      agencyName: 'Example Agency',
      buyerEmail: 'owner@example.com',
      billingCustomerId: 'cus_existing',
      planCode: AgencyPlan.STARTER,
      planLabel: 'Starter',
      billingInterval: AgencyPlanBillingInterval.YEARLY,
      providerPriceReference: 'price_starter_yearly',
      currency: 'PLN',
      subtotalGrossAmount: 99_900,
      discountGrossAmount: 0,
      totalGrossAmount: 99_900,
      discountDurationBillingCycles: null,
      expiresAt: new Date('2026-09-17T10:45:00.000Z'),
    });

    expect(couponsCreate).not.toHaveBeenCalled();
    expect(sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_existing',
        discounts: undefined,
      }),
      expect.any(Object),
    );
    expect(sessionsCreate.mock.calls[0][0]).not.toHaveProperty(
      'customer_email',
    );
  });
});
