import type {
  ListingQuoteContract,
  PublicListingProductContract,
} from './contracts';
import { ListingProductType } from './listing-commerce.types';

describe('listing commerce contracts', () => {
  it('keeps provider references out of the public product contract', () => {
    const product: PublicListingProductContract = {
      code: 'publication_60_days',
      name: 'Publikacja ogłoszenia',
      description: 'Publikacja na 60 dni',
      type: ListingProductType.PUBLICATION,
      priceGrossAmount: 4900,
      currency: 'PLN',
      vatRateBasisPoints: null,
      durationDays: 60,
      featuredTier: null,
      sortOrder: 10,
    };

    expect(product).not.toHaveProperty('id');
    expect(product).not.toHaveProperty('providerPriceReference');
    expect(product).not.toHaveProperty('priorityWeight');
    expect(product).not.toHaveProperty('fulfillmentParameters');
    expect(product.priceGrossAmount).toBe(4900);
  });

  it('defines a quote snapshot with an explicit empty discount list', () => {
    const quote: ListingQuoteContract = {
      listingId: 'listing-1',
      currency: 'PLN',
      quotedAt: '2026-09-07T10:15:00.000Z',
      expiresAt: '2026-09-07T10:45:00.000Z',
      items: [
        {
          productCode: 'publication_60_days',
          productName: 'Publikacja ogłoszenia',
          productType: ListingProductType.PUBLICATION,
          quantity: 1,
          unitGrossAmount: 4900,
          subtotalGrossAmount: 4900,
          discountGrossAmount: 0,
          totalGrossAmount: 4900,
          vatRateBasisPoints: null,
          vatGrossAmount: null,
          durationDays: 60,
          fulfillmentParameters: { durationDays: 60 },
        },
      ],
      discounts: [],
      subtotalGrossAmount: 4900,
      discountGrossAmount: 0,
      totalGrossAmount: 4900,
      vatGrossAmount: null,
    };

    expect(quote.discounts).toEqual([]);
    expect(quote.totalGrossAmount).toBe(4900);
  });
});
