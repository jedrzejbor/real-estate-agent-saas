import {
  getListingDetailsCompleteness,
  getListingDetailsFieldConfigs,
  ListingCondition,
  ListingMarketType,
  PropertyType,
  TransactionType,
} from './listings';

describe('listing details field configuration', () => {
  it('shows sale-specific apartment quality fields', () => {
    const fields = getListingDetailsFieldConfigs({
      propertyType: PropertyType.APARTMENT,
      transactionType: TransactionType.SALE,
    });
    const keys = fields.map((field) => field.key);

    expect(keys).toEqual(
      expect.arrayContaining([
        'marketType',
        'condition',
        'hasBalcony',
        'hasElevator',
        'priceNegotiable',
      ]),
    );
    expect(keys).not.toContain('deposit');
    expect(keys).not.toContain('plotType');
  });

  it('shows rent-specific apartment fields without sale-only fields', () => {
    const fields = getListingDetailsFieldConfigs({
      propertyType: PropertyType.APARTMENT,
      transactionType: TransactionType.RENT,
    });
    const keys = fields.map((field) => field.key);

    expect(keys).toContain('deposit');
    expect(keys).not.toContain('priceNegotiable');
  });

  it('shows land planning fields without apartment amenities', () => {
    const fields = getListingDetailsFieldConfigs({
      propertyType: PropertyType.LAND,
      transactionType: TransactionType.SALE,
    });
    const keys = fields.map((field) => field.key);

    expect(keys).toEqual(
      expect.arrayContaining([
        'plotType',
        'plotShape',
        'localPlanStatus',
        'developmentConditionsStatus',
      ]),
    );
    expect(keys).not.toContain('hasBalcony');
    expect(keys).not.toContain('marketType');
  });

  it('calculates empty completeness for visible apartment sale fields', () => {
    const completeness = getListingDetailsCompleteness({
      propertyType: PropertyType.APARTMENT,
      transactionType: TransactionType.SALE,
      details: null,
    });

    expect(completeness.total).toBeGreaterThan(0);
    expect(completeness.completed).toBe(0);
    expect(completeness.percent).toBe(0);
    expect(completeness.missingFields.map((field) => field.key)).toContain(
      'marketType',
    );
  });

  it('counts filled values only for the current visible details fields', () => {
    const completeness = getListingDetailsCompleteness({
      propertyType: PropertyType.APARTMENT,
      transactionType: TransactionType.SALE,
      details: {
        marketType: ListingMarketType.SECONDARY,
        condition: ListingCondition.VERY_GOOD,
        hasBalcony: true,
        parkingSpaces: 1,
        plotType: 'building',
      },
    });

    expect(completeness.completed).toBe(4);
    expect(completeness.percent).toBe(
      Math.round((completeness.completed / completeness.total) * 100),
    );
    expect(completeness.missingFields.map((field) => field.key)).not.toContain(
      'plotType',
    );
  });

  it('uses rent-specific fields when calculating completeness', () => {
    const completeness = getListingDetailsCompleteness({
      propertyType: PropertyType.APARTMENT,
      transactionType: TransactionType.RENT,
      details: {
        deposit: 4000,
        priceNegotiable: true,
      },
    });

    expect(completeness.completed).toBe(1);
    expect(completeness.missingFields.map((field) => field.key)).toContain(
      'marketType',
    );
    expect(completeness.missingFields.map((field) => field.key)).not.toContain(
      'priceNegotiable',
    );
  });
});
