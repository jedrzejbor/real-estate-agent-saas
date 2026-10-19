import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AgencyPlanCheckoutController } from '../agency-plan-commerce/agency-plan-checkout.controller';
import { AgencyPlanCheckoutAttemptsService } from '../agency-plan-commerce/agency-plan-checkout-attempts.service';
import { AgencyPlanPromotionsService } from '../agency-plan-commerce/agency-plan-promotions.service';
import { AgencyPlanQuotesService } from '../agency-plan-commerce/agency-plan-quotes.service';
import { ListingCheckoutController } from '../listing-commerce/listing-checkout.controller';
import { ListingOrdersController } from '../listing-commerce/listing-orders.controller';
import { ListingCheckoutSessionsService } from '../listing-commerce/listing-checkout-sessions.service';
import { ListingOrdersService } from '../listing-commerce/listing-orders.service';
import { ListingQuotesService } from '../listing-commerce/listing-quotes.service';

describe('PAY-011 checkout API during payment migration', () => {
  let app: INestApplication;
  let baseUrl: string;
  const listingOrders = {
    createOrder: jest.fn(),
    findOwnedOrder: jest.fn().mockResolvedValue({ id: 'existing-order' }),
    findOwnedOrdersForListing: jest.fn().mockResolvedValue([]),
  };
  const planQuotes = {
    prepareQuoteInput: jest.fn().mockResolvedValue({
      plan: { code: 'professional' },
      quoteInput: { planCode: 'professional' },
    }),
    createQuote: jest.fn().mockReturnValue({ quoteId: 'new-quote' }),
  };
  const promotions = {
    resolveQuoteDiscounts: jest.fn().mockResolvedValue([]),
  };
  const listingQuotes = { createQuote: jest.fn().mockResolvedValue({ quoteId: 'listing-quote' }) };
  const listingSessions = { createOwnedCheckoutSession: jest.fn() };
  const planAttempts = { createCheckoutAttempt: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ListingCheckoutController, ListingOrdersController, AgencyPlanCheckoutController],
      providers: [
        { provide: ListingOrdersService, useValue: listingOrders },
        { provide: ListingQuotesService, useValue: listingQuotes },
        { provide: AgencyPlanQuotesService, useValue: planQuotes },
        { provide: AgencyPlanPromotionsService, useValue: promotions },
        { provide: ListingCheckoutSessionsService, useValue: listingSessions },
        { provide: AgencyPlanCheckoutAttemptsService, useValue: planAttempts },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('returns predictable 503 for order creation and both checkout starts without calling payment services', async () => {
    const orderId = '2b93eae0-d282-4faa-833d-aabb83f73a44';
    for (const [path, body] of [
      ['/api/listing-checkout/orders', JSON.stringify({ listingId: orderId })],
      [`/api/listing-orders/${orderId}/checkout-session`, undefined],
      ['/api/agency-plan-checkout/attempts', JSON.stringify({ quoteId: orderId })],
    ] as const) {
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body,
      });
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({
        code: 'PAYMENTS_UNAVAILABLE',
        message: 'Płatności są tymczasowo niedostępne. Spróbuj ponownie później.',
      });
    }
    expect(listingOrders.findOwnedOrder).not.toHaveBeenCalled();
    expect(listingOrders.createOrder).not.toHaveBeenCalled();
    expect(planQuotes.createQuote).not.toHaveBeenCalled();
    expect(listingSessions.createOwnedCheckoutSession).not.toHaveBeenCalled();
    expect(planAttempts.createCheckoutAttempt).not.toHaveBeenCalled();
  });

  it('keeps existing order reads and plan quotes available', async () => {
    const orderId = '2b93eae0-d282-4faa-833d-aabb83f73a44';
    const order = await fetch(`${baseUrl}/api/listing-orders/${orderId}`);
    expect(order.status).toBe(200);
    expect(await order.json()).toEqual({ id: 'existing-order' });

    const history = await fetch(`${baseUrl}/api/listing-orders/by-listing/${orderId}`);
    expect(history.status).toBe(200);
    expect(await history.json()).toEqual([]);

    const listingQuote = await fetch(`${baseUrl}/api/listing-checkout/quote`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ listingId: orderId }),
    });
    expect(listingQuote.status).toBe(200);
    expect(await listingQuote.json()).toEqual({ quoteId: 'listing-quote' });

    const quote = await fetch(`${baseUrl}/api/agency-plan-checkout/quote`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ planCode: 'professional', billingInterval: 'monthly' }),
    });
    expect(quote.status).toBe(200);
    expect(await quote.json()).toEqual({ quoteId: 'new-quote' });
  });
});
