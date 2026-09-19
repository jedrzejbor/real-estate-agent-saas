import { apiFetch } from './api-client';
import {
  archiveAdminListingProduct,
  fetchAdminListingProductHistory,
  fetchPublicListingProducts,
  updateAdminListingProduct,
  type UpdateListingProductInput,
} from './listing-products';

jest.mock('./api-client', () => ({
  apiFetch: jest.fn(),
}));

const apiFetchMock = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('listing product HTTP client', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue(undefined);
  });

  it('loads the public catalog without authentication', async () => {
    await fetchPublicListingProducts();

    expect(apiFetchMock).toHaveBeenCalledWith('/listing-products', {
      skipAuth: true,
    });
  });

  it('encodes the product code in admin resource paths', async () => {
    await fetchAdminListingProductHistory('produkt/test');

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/admin/listing-products/produkt%2Ftest/history',
    );
  });

  it('sends updates through PATCH', async () => {
    const input = updateInputFixture();

    await updateAdminListingProduct('publikacja_30_dni', input);

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/admin/listing-products/publikacja_30_dni',
      { method: 'PATCH', body: input },
    );
  });

  it('trims the required archive reason', async () => {
    await archiveAdminListingProduct('publikacja_30_dni', '  zmiana oferty  ');

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/admin/listing-products/publikacja_30_dni/archive',
      { method: 'POST', body: { reason: 'zmiana oferty' } },
    );
  });
});

function updateInputFixture(): UpdateListingProductInput {
  return {
    name: 'Publikacja ogłoszenia',
    description: null,
    priceGrossAmount: 14_900,
    currency: 'PLN',
    vatRateBasisPoints: null,
    durationDays: 30,
    featuredTier: null,
    priorityWeight: 0,
    isPublic: false,
    isActive: true,
    sortOrder: 10,
    providerPriceReference: null,
  };
}
