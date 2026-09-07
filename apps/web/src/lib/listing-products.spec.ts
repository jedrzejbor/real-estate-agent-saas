import {
  createEmptyListingProductForm,
  ListingProductType,
  parsePricePreview,
  toCreateListingProductInput,
  toListingProductForm,
  toUpdateListingProductInput,
  validateListingProductForm,
  type AdminListingProduct,
} from './listing-products';

describe('listing product form boundary', () => {
  it('converts display amounts to integer minor units without floating point drift', () => {
    const form = validForm({
      priceGrossPln: '149,99',
      vatRatePercent: '23',
    });

    expect(toCreateListingProductInput(form)).toMatchObject({
      priceGrossAmount: 14_999,
      vatRateBasisPoints: 2_300,
      currency: 'PLN',
    });
    expect(parsePricePreview('0,01')).toBe(1);
  });

  it('keeps legally undecided VAT as null', () => {
    const input = toCreateListingProductInput(validForm({ vatRatePercent: '' }));

    expect(input.vatRateBasisPoints).toBeNull();
  });

  it('requires a featured tier only for a featured product', () => {
    const featuredWithoutTier = validateListingProductForm(
      validForm({ type: ListingProductType.FEATURED, featuredTier: '' }),
    );
    const publicationWithTier = validateListingProductForm(
      validForm({ type: ListingProductType.PUBLICATION, featuredTier: 'top' }),
    );

    expect(featuredWithoutTier.errors.featuredTier).toBeDefined();
    expect(publicationWithTier.errors.featuredTier).toBeDefined();
  });

  it('prevents exposing an inactive product', () => {
    const result = validateListingProductForm(
      validForm({ isActive: false, isPublic: true }),
    );

    expect(result.errors.isPublic).toBe('Produkt publiczny musi być aktywny');
  });

  it('does not send immutable code and type in update payloads', () => {
    const payload = toUpdateListingProductInput(validForm());

    expect(payload).not.toHaveProperty('code');
    expect(payload).not.toHaveProperty('type');
  });

  it('round-trips API integer values into administrator display fields', () => {
    const form = toListingProductForm(productFixture());

    expect(form.priceGrossPln).toBe('149.99');
    expect(form.vatRatePercent).toBe('23.00');
    expect(form.reason).toBe('');
  });

  it('starts new products active but explicitly non-public and without a price default', () => {
    expect(createEmptyListingProductForm()).toMatchObject({
      priceGrossPln: '',
      isActive: true,
      isPublic: false,
    });
  });
});

function validForm(
  overrides: Partial<ReturnType<typeof createEmptyListingProductForm>> = {},
) {
  return {
    ...createEmptyListingProductForm(),
    code: 'publikacja_30_dni',
    name: 'Publikacja ogłoszenia',
    description: 'Publikacja ogłoszenia dla klienta indywidualnego.',
    priceGrossPln: '149.00',
    durationDays: '30',
    ...overrides,
  };
}

function productFixture(): AdminListingProduct {
  return {
    id: 'product-id',
    code: 'publikacja_30_dni',
    name: 'Publikacja ogłoszenia',
    description: null,
    type: ListingProductType.PUBLICATION,
    priceGrossAmount: 14_999,
    currency: 'PLN',
    vatRateBasisPoints: 2_300,
    durationDays: 30,
    featuredTier: null,
    priorityWeight: 0,
    fulfillmentParameters: { durationDays: 30 },
    providerPriceReference: null,
    isPublic: true,
    isActive: true,
    sortOrder: 10,
    archivedAt: null,
    createdAt: '2026-09-07T10:00:00.000Z',
    updatedAt: '2026-09-07T10:00:00.000Z',
  };
}
