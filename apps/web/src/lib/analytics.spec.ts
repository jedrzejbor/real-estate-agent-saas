jest.mock('./api-client', () => ({ apiFetch: jest.fn() }));
jest.mock('./cookie-consent', () => ({
  hasCookieConsent: jest.fn(() => true),
  readStoredCookieConsent: jest.fn(() => ({ analytics: true })),
}));

import { apiFetch } from './api-client';
import { AnalyticsEventName, trackAnalyticsEvent } from './analytics';

const apiFetchMock = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('analytics privacy guard', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({});
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: { location: { pathname: '/seller', search: '?tab=checkout' } },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(global, 'window');
  });

  it('drops promotion code fields before sending analytics properties', () => {
    trackAnalyticsEvent({
      name: AnalyticsEventName.LISTING_PRODUCT_SELECTED,
      properties: {
        listingId: 'listing-1',
        promotionCode: 'START10',
        promoCode: 'SECRET20',
        couponCode: 'COUPON30',
      },
    });

    expect(apiFetchMock).toHaveBeenCalledWith('/analytics/events', {
      method: 'POST',
      body: {
        name: AnalyticsEventName.LISTING_PRODUCT_SELECTED,
        path: '/seller?tab=checkout',
        properties: { listingId: 'listing-1' },
      },
    });
  });
});
