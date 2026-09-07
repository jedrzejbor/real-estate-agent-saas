import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { ListingPaymentEventType } from './listing-commerce.types';
import {
  mapStripeListingPaymentEvent,
  StripeListingPaymentAdapter,
} from './stripe-listing-payment.adapter';

function checkoutEvent(
  type: string,
  sessionOverrides: Record<string, unknown> = {},
): Stripe.Event {
  return {
    id: 'evt_1',
    object: 'event',
    api_version: '2025-12-15.clover',
    created: 1_788_775_200,
    data: {
      object: {
        id: 'cs_test_1',
        object: 'checkout.session',
        amount_total: 4_900,
        currency: 'pln',
        metadata: { listingOrderId: 'order-1' },
        payment_intent: 'pi_1',
        payment_status: 'paid',
        status: 'complete',
        ...sessionOverrides,
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type,
  } as unknown as Stripe.Event;
}

describe('StripeListingPaymentAdapter mapping', () => {
  it.each([
    ['checkout.session.completed', ListingPaymentEventType.PAYMENT_SUCCEEDED],
    [
      'checkout.session.async_payment_succeeded',
      ListingPaymentEventType.PAYMENT_SUCCEEDED,
    ],
    [
      'checkout.session.async_payment_failed',
      ListingPaymentEventType.PAYMENT_FAILED,
    ],
    ['checkout.session.expired', ListingPaymentEventType.CHECKOUT_EXPIRED],
  ])('maps %s into a verified domain event', (stripeType, domainType) => {
    expect(mapStripeListingPaymentEvent(checkoutEvent(stripeType))).toEqual({
      provider: 'stripe',
      eventId: 'evt_1',
      eventType: domainType,
      orderId: 'order-1',
      checkoutSessionId: 'cs_test_1',
      paymentId: 'pi_1',
      amountGross: 4_900,
      currency: 'PLN',
      occurredAt: new Date('2026-09-07T10:00:00.000Z'),
      payload: {
        stripeEventType: stripeType,
        livemode: false,
        paymentStatus: 'paid',
        status: 'complete',
      },
    });
  });

  it('ignores unsupported events and completed sessions awaiting payment', () => {
    expect(mapStripeListingPaymentEvent(checkoutEvent('customer.created'))).toBeNull();
    expect(
      mapStripeListingPaymentEvent(
        checkoutEvent('checkout.session.completed', {
          payment_status: 'unpaid',
        }),
      ),
    ).toBeNull();
  });

  it('rejects checkout events without the trusted order metadata', () => {
    expect(() =>
      mapStripeListingPaymentEvent(
        checkoutEvent('checkout.session.completed', { metadata: {} }),
      ),
    ).toThrow(BadRequestException);
  });
});

describe('StripeListingPaymentAdapter signature verification', () => {
  const signingSecret = 'whsec_listing_test';
  const stripe = new Stripe('sk_test_placeholder');
  const configService = {
    get: jest.fn((key: string, fallback?: string) => {
      const values: Record<string, string> = {
        STRIPE_SECRET_KEY: 'sk_test_placeholder',
        STRIPE_LISTING_WEBHOOK_SECRET: signingSecret,
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
    const adapter = new StripeListingPaymentAdapter(
      configService as unknown as ConfigService,
    );

    expect(
      adapter.verifyAndMapWebhook(Buffer.from(payload), signature),
    ).toMatchObject({
      eventId: 'evt_1',
      eventType: ListingPaymentEventType.PAYMENT_SUCCEEDED,
      orderId: 'order-1',
    });
    expect(() =>
      adapter.verifyAndMapWebhook(Buffer.from(payload), 'invalid'),
    ).toThrow(BadRequestException);
  });

  it('fails closed when the webhook secret is missing', () => {
    const adapter = new StripeListingPaymentAdapter({
      get: jest.fn((key: string) =>
        key === 'STRIPE_SECRET_KEY' ? 'sk_test_placeholder' : undefined,
      ),
    } as unknown as ConfigService);

    expect(() =>
      adapter.verifyAndMapWebhook(Buffer.from('{}'), 'signature'),
    ).toThrow(ServiceUnavailableException);
  });
});

describe('StripeListingPaymentAdapter checkout creation', () => {
  it('uses an exact server-side amount and a stable provider idempotency key', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'cs_test_1',
      url: 'https://checkout.stripe.test/session',
      expires_at: 1_788_777_005,
    });
    const configService = {
      get: jest.fn((key: string, fallback?: string) => {
        const values: Record<string, string> = {
          FRONTEND_URL: 'https://podadresem.test',
        };
        return values[key] ?? fallback;
      }),
    };
    const adapter = new StripeListingPaymentAdapter(
      configService as unknown as ConfigService,
    );
    (adapter as unknown as { client: Stripe }).client = {
      checkout: { sessions: { create } },
    } as unknown as Stripe;

    await expect(
      adapter.createCheckoutSession({
        orderId: 'order-1',
        orderNumber: 'LO-1',
        buyerEmail: 'owner@example.com',
        currency: 'PLN',
        totalGrossAmount: 4_900,
        itemNames: ['Publikacja', 'Wyróżnienie'],
        expiresAt: new Date('2026-09-07T10:30:05.000Z'),
      }),
    ).resolves.toEqual({
      provider: 'stripe',
      sessionId: 'cs_test_1',
      checkoutUrl: 'https://checkout.stripe.test/session',
      expiresAt: new Date('2026-09-07T10:30:05.000Z'),
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        client_reference_id: 'order-1',
        customer_email: 'owner@example.com',
        expires_at: 1_788_777_005,
        success_url:
          'https://podadresem.test/seller/payments/success?orderId=order-1&session_id={CHECKOUT_SESSION_ID}',
        cancel_url:
          'https://podadresem.test/seller/payments/cancel?orderId=order-1',
        line_items: [
          expect.objectContaining({
            quantity: 1,
            price_data: expect.objectContaining({
              currency: 'pln',
              unit_amount: 4_900,
            }),
          }),
        ],
        metadata: {
          listingOrderId: 'order-1',
          listingOrderNumber: 'LO-1',
        },
      }),
      { idempotencyKey: 'listing-order:order-1:checkout:v1' },
    );
  });
});
