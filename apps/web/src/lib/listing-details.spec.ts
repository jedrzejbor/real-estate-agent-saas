import {
  getListingDetailsFieldConfigs,
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
});
