import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { AgencyPlan } from '../common/enums';
import { AgencyPlanBillingInterval } from './agency-plan-commerce.types';
import { StripeAgencyPlanPaymentAdapter } from './stripe-agency-plan-payment.adapter';

describe('StripeAgencyPlanPaymentAdapter checkout creation', () => {
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
          'https://podadresem.test/dashboard/billing/success?quoteId=quote-1&session_id={CHECKOUT_SESSION_ID}',
        cancel_url:
          'https://podadresem.test/dashboard/billing/cancel?quoteId=quote-1',
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
