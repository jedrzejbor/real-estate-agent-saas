import {
  ListingCondition,
  ListingMarketType,
  createListingSchema,
  PropertyType,
  TransactionType,
  type CreateListingFormData,
  type PropertyType as PropertyTypeValue,
} from './listings';

const requiredFieldsByType: Record<
  PropertyTypeValue,
  Partial<CreateListingFormData>
> = {
  apartment: { areaM2: 55, rooms: 3 },
  house: { areaM2: 140, plotAreaM2: 850, rooms: 5 },
  land: { plotAreaM2: 1200 },
  commercial: { areaM2: 90 },
  office: { areaM2: 75 },
  garage: { areaM2: 18 },
};

describe('dashboard create listing schema regression', () => {
  it.each(
    Object.values(PropertyType).flatMap((propertyType) =>
      Object.values(TransactionType).map(
        (transactionType) => [propertyType, transactionType] as const,
      ),
    ),
  )('accepts %s for %s', (propertyType, transactionType) => {
    const result = createListingSchema.safeParse(
      buildPayload(propertyType, transactionType),
    );

    expect(result.success).toBe(true);
  });

  it('rejects a house without plotAreaM2', () => {
    const payload = buildPayload(PropertyType.HOUSE, TransactionType.SALE);
    delete payload.plotAreaM2;

    const result = createListingSchema.safeParse(payload);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ['plotAreaM2'] }),
        ]),
      );
    }
  });

  it('accepts validated listingDetails fields', () => {
    const result = createListingSchema.safeParse({
      ...buildPayload(PropertyType.APARTMENT, TransactionType.SALE),
      listingDetails: {
        marketType: ListingMarketType.SECONDARY,
        condition: ListingCondition.VERY_GOOD,
        hasBalcony: 'true',
        parkingSpaces: '1',
        priceNegotiable: true,
        availableFrom: '2026-09-01',
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.listingDetails).toEqual({
        marketType: ListingMarketType.SECONDARY,
        condition: ListingCondition.VERY_GOOD,
        hasBalcony: true,
        parkingSpaces: 1,
        priceNegotiable: true,
        availableFrom: '2026-09-01',
      });
    }
  });

  it('rejects unknown listingDetails fields', () => {
    const result = createListingSchema.safeParse({
      ...buildPayload(PropertyType.APARTMENT, TransactionType.SALE),
      listingDetails: {
        unsupported: 'value',
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ['listingDetails'] }),
        ]),
      );
    }
  });
});

function buildPayload(
  propertyType: PropertyTypeValue,
  transactionType: CreateListingFormData['transactionType'],
): Record<string, unknown> {
  return {
    title: 'Przykładowa oferta nieruchomości',
    description: 'Kompletny opis przykładowej nieruchomości.',
    propertyType,
    transactionType,
    price: 500000,
    address: { city: 'Warszawa' },
    ...requiredFieldsByType[propertyType],
  };
}
