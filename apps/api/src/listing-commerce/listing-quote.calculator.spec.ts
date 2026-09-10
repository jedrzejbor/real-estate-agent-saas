import { ListingProductCatalog } from './entities';
import {
  buildListingQuote,
  calculateVatIncludedInGross,
} from './listing-quote.calculator';
import { ListingProductType } from './listing-commerce.types';

function buildProduct(
  overrides: Partial<ListingProductCatalog> = {},
): ListingProductCatalog {
  return Object.assign(new ListingProductCatalog(), {
    id: 'product-1',
    code: 'publication_60_days',
    name: 'Publikacja ogłoszenia',
    description: null,
    type: ListingProductType.PUBLICATION,
    priceGrossAmount: 4_900,
    currency: 'PLN',
    vatRateBasisPoints: 2_300,
    durationDays: 60,
    featuredTier: null,
    priorityWeight: 0,
    fulfillmentParameters: { durationDays: 60 },
    isPublic: true,
    isActive: true,
    sortOrder: 0,
    providerPriceReference: null,
    archivedAt: null,
    ...overrides,
  });
}

describe('listing quote calculator', () => {
  it('snapshots current server price, VAT and expiration', () => {
    const product = buildProduct();
    const quote = buildListingQuote({
      listingId: 'listing-1',
      requestedItems: [{ productCode: product.code, quantity: 1 }],
      productsByCode: new Map([[product.code, product]]),
      quotedAt: new Date('2026-09-07T10:00:00.000Z'),
    });

    expect(quote).toMatchObject({
      listingId: 'listing-1',
      currency: 'PLN',
      quotedAt: '2026-09-07T10:00:00.000Z',
      expiresAt: '2026-09-07T10:30:00.000Z',
      subtotalGrossAmount: 4_900,
      discountGrossAmount: 0,
      totalGrossAmount: 4_900,
      vatGrossAmount: 916,
      discounts: [],
    });
    expect(quote.items[0]).toMatchObject({
      productCode: 'publication_60_days',
      unitGrossAmount: 4_900,
      totalGrossAmount: 4_900,
      vatGrossAmount: 916,
      durationDays: 60,
      fulfillmentParameters: { durationDays: 60 },
    });
  });

  it('returns null aggregate VAT if tax treatment is not configured', () => {
    const product = buildProduct({ vatRateBasisPoints: null });
    const quote = buildListingQuote({
      listingId: 'listing-1',
      requestedItems: [{ productCode: product.code, quantity: 1 }],
      productsByCode: new Map([[product.code, product]]),
      quotedAt: new Date('2026-09-07T10:00:00.000Z'),
    });

    expect(quote.items[0].vatGrossAmount).toBeNull();
    expect(quote.vatGrossAmount).toBeNull();
  });

  it('applies server-side discounts to eligible quote items and totals', () => {
    const publication = buildProduct();
    const featured = buildProduct({
      id: 'product-2',
      code: 'featured_7_days',
      name: 'Wyróżnienie ogłoszenia',
      type: ListingProductType.FEATURED,
      priceGrossAmount: 1_900,
      vatRateBasisPoints: 2_300,
      durationDays: 7,
      featuredTier: 'standard',
      priorityWeight: 100,
    });

    const quote = buildListingQuote({
      listingId: 'listing-1',
      requestedItems: [
        { productCode: publication.code, quantity: 1 },
        { productCode: featured.code, quantity: 1 },
      ],
      productsByCode: new Map([
        [publication.code, publication],
        [featured.code, featured],
      ]),
      quotedAt: new Date('2026-09-07T10:00:00.000Z'),
      discounts: [
        {
          sourceType: 'promotion_code',
          sourceReference: 'promotion-code-id',
          label: 'Kod promocyjny',
          grossAmount: 1_000,
          productCodes: [featured.code],
        },
      ],
    });

    expect(quote).toMatchObject({
      subtotalGrossAmount: 6_800,
      discountGrossAmount: 1_000,
      totalGrossAmount: 5_800,
      discounts: [
        {
          sourceType: 'promotion_code',
          sourceReference: 'promotion-code-id',
          label: 'Kod promocyjny',
          grossAmount: 1_000,
        },
      ],
    });
    expect(quote.items).toEqual([
      expect.objectContaining({
        productCode: publication.code,
        discountGrossAmount: 0,
        totalGrossAmount: 4_900,
      }),
      expect.objectContaining({
        productCode: featured.code,
        discountGrossAmount: 1_000,
        totalGrossAmount: 900,
      }),
    ]);
  });

  it.each([
    [4_900, 2_300, 916],
    [1, 10_000, 1],
    [1, 2_300, 0],
    [0, 2_300, 0],
  ])(
    'calculates VAT included in %i at %i bps as %i with half-up rounding',
    (gross, rate, expected) => {
      expect(calculateVatIncludedInGross(gross, rate)).toBe(expected);
    },
  );

  it('does not retroactively change an already built quote snapshot', () => {
    const product = buildProduct();
    const input = {
      listingId: 'listing-1',
      requestedItems: [{ productCode: product.code, quantity: 1 }],
      productsByCode: new Map([[product.code, product]]),
      quotedAt: new Date('2026-09-07T10:00:00.000Z'),
    } as const;
    const firstQuote = buildListingQuote(input);

    product.priceGrossAmount = 5_900;
    const nextQuote = buildListingQuote(input);

    expect(firstQuote.totalGrossAmount).toBe(4_900);
    expect(nextQuote.totalGrossAmount).toBe(5_900);
  });

  it('rejects totals which cannot be persisted in integer amount columns', () => {
    const first = buildProduct({
      code: 'publication_60_days',
      priceGrossAmount: 2_147_483_647,
    });
    const second = buildProduct({
      id: 'product-2',
      code: 'featured_7_days',
      type: ListingProductType.FEATURED,
      priceGrossAmount: 1,
      durationDays: 7,
      featuredTier: 'standard',
      priorityWeight: 100,
    });

    expect(() =>
      buildListingQuote({
        listingId: 'listing-1',
        requestedItems: [
          { productCode: first.code, quantity: 1 },
          { productCode: second.code, quantity: 1 },
        ],
        productsByCode: new Map([
          [first.code, first],
          [second.code, second],
        ]),
        quotedAt: new Date('2026-09-07T10:00:00.000Z'),
      }),
    ).toThrow('persistence range');
  });
});
