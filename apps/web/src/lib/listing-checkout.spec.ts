import { apiFetch } from './api-client';
import {
  canStartListingCheckout,
  createListingCheckoutSession,
  createListingOrder,
  createListingQuote,
  fetchListingOrder,
  fetchListingOrdersForListing,
  findCurrentPayableOrder,
  isListingOrderPaid,
  isStripeCheckoutUrl,
  type ListingOrder,
} from './listing-checkout';

jest.mock('./api-client', () => ({ apiFetch: jest.fn() }));

const apiFetchMock = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('listing checkout HTTP client', () => {
  beforeEach(() => apiFetchMock.mockReset());

  it('sends only product identifiers when requesting a quote', async () => {
    apiFetchMock.mockResolvedValueOnce({});
    const items = [{ productCode: 'publication_60_days', quantity: 1 as const }];

    await createListingQuote('listing-1', items);

    expect(apiFetchMock).toHaveBeenCalledWith('/listing-checkout/quote', {
      method: 'POST',
      body: { listingId: 'listing-1', items },
    });
  });

  it('uses an explicit idempotency key when creating an order', async () => {
    apiFetchMock.mockResolvedValueOnce({});
    const items = [{ productCode: 'publication_60_days', quantity: 1 as const }];

    await createListingOrder(
      'listing-1',
      items,
      { countryCode: 'PL', buyerType: 'consumer', fullName: 'Jan Kowalski' },
      'listing-checkout:request-1',
    );

    expect(apiFetchMock).toHaveBeenCalledWith('/listing-checkout/orders', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'listing-checkout:request-1' },
      body: {
        listingId: 'listing-1',
        items,
        buyer: {
          countryCode: 'PL',
          buyerType: 'consumer',
          fullName: 'Jan Kowalski',
        },
      },
    });
  });

  it('reads owner-scoped order state and starts checkout', async () => {
    apiFetchMock.mockResolvedValue({});

    await fetchListingOrder('order/1');
    await fetchListingOrdersForListing('listing/1');
    await createListingCheckoutSession('order/1');

    expect(apiFetchMock).toHaveBeenNthCalledWith(
      1,
      '/listing-orders/order%2F1',
    );
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      2,
      '/listing-orders/by-listing/listing%2F1',
    );
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      3,
      '/listing-orders/order%2F1/checkout-session',
      { method: 'POST' },
    );
  });
});

describe('listing checkout policy helpers', () => {
  it.each([
    ['https://checkout.stripe.com/c/pay/test', true],
    ['https://custom.stripe.com/pay/test', true],
    ['http://checkout.stripe.com/test', false],
    ['https://stripe.com.attacker.example/test', false],
    ['javascript:alert(1)', false],
  ])('validates provider redirect %s', (url, expected) => {
    expect(isStripeCheckoutUrl(url)).toBe(expected);
  });

  it('selects the newest payable order from an already sorted history', () => {
    const orders = [
      { id: 'paid', status: 'paid' },
      { id: 'pending', status: 'pending_payment' },
      { id: 'expired', status: 'expired' },
    ] as ListingOrder[];

    expect(findCurrentPayableOrder(orders)?.id).toBe('pending');
  });

  it.each([
    ['paid', true],
    ['partially_refunded', true],
    ['refunded', true],
    ['pending_payment', false],
    ['payment_failed', false],
  ] as const)('recognizes completed order state %s', (status, expected) => {
    expect(isListingOrderPaid({ status } as ListingOrder)).toBe(expected);
  });

  it.each([
    ['draft', false, true],
    ['pending_payment', false, true],
    ['payment_failed', true, true],
    ['payment_failed', false, false],
    ['expired', true, false],
    ['paid', true, false],
  ] as const)(
    'determines checkout availability for %s (retry: %s)',
    (status, canRetryPayment, expected) => {
      expect(
        canStartListingCheckout({ status, canRetryPayment } as ListingOrder),
      ).toBe(expected);
    },
  );
});
