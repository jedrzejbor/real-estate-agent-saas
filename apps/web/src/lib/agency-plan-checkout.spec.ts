import { apiFetch } from './api-client';
import { canStartAgencyPlanCheckout, createAgencyPlanCheckoutAttempt, createAgencyPlanQuote } from './agency-plan-checkout';

jest.mock('./api-client', () => ({ apiFetch: jest.fn() }));

const apiFetchMock = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('agency plan checkout HTTP client', () => {
  beforeEach(() => apiFetchMock.mockReset());

  it('creates a public server-side agency plan quote', async () => {
    apiFetchMock.mockResolvedValueOnce({});

    await createAgencyPlanQuote({
      planCode: 'professional',
      billingInterval: 'monthly',
      promotionCode: ' AGENT50 ',
    });

    expect(apiFetchMock).toHaveBeenCalledWith('/agency-plan-checkout/quote', {
      method: 'POST',
      skipAuth: true,
      body: {
        planCode: 'professional',
        billingInterval: 'monthly',
        promotionCode: 'AGENT50',
      },
    });
  });

  it('omits an empty promotion code', async () => {
    apiFetchMock.mockResolvedValueOnce({});

    await createAgencyPlanQuote({
      planCode: 'starter',
      billingInterval: 'yearly',
      promotionCode: ' ',
    });

    expect(apiFetchMock).toHaveBeenCalledWith('/agency-plan-checkout/quote', {
      method: 'POST',
      skipAuth: true,
      body: {
        planCode: 'starter',
        billingInterval: 'yearly',
      },
    });
  });

  it('starts authenticated checkout for a persisted quote', async () => {
    apiFetchMock.mockResolvedValueOnce({});

    await createAgencyPlanCheckoutAttempt('quote-1');

    expect(apiFetchMock).toHaveBeenCalledWith('/agency-plan-checkout/attempts', {
      method: 'POST',
      body: { quoteId: 'quote-1' },
    });
  });

  it('requires 35 minutes of quote validity before starting checkout', () => {
    const now = new Date('2026-09-24T10:00:00.000Z');
    const quote = { expiresAt: '2026-09-24T10:35:00.000Z' } as never;
    expect(canStartAgencyPlanCheckout(quote, now)).toBe(true);
    expect(canStartAgencyPlanCheckout(quote, new Date('2026-09-24T10:00:01.000Z'))).toBe(false);
  });
});
