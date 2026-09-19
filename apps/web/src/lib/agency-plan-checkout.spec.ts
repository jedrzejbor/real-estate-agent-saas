import { apiFetch } from './api-client';
import { createAgencyPlanQuote } from './agency-plan-checkout';

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
});
