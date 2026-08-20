import {
  LISTING_FIELD_VISIBILITY,
  LISTING_REQUIRED_DYNAMIC_FIELDS,
  PropertyType,
  getListingDynamicFieldLabel,
  sanitizeListingDynamicFields,
  shouldShowListingField,
} from './listing-field-rules';

describe('listing field rules', () => {
  it('defines visibility for every supported property type', () => {
    expect(LISTING_FIELD_VISIBILITY).toEqual({
      apartment: [
        'areaM2',
        'rooms',
        'floor',
        'totalFloors',
        'bathrooms',
        'yearBuilt',
      ],
      house: [
        'areaM2',
        'plotAreaM2',
        'rooms',
        'bathrooms',
        'totalFloors',
        'yearBuilt',
      ],
      land: ['plotAreaM2'],
      commercial: [
        'areaM2',
        'rooms',
        'floor',
        'bathrooms',
        'totalFloors',
        'yearBuilt',
      ],
      office: [
        'areaM2',
        'rooms',
        'floor',
        'bathrooms',
        'totalFloors',
        'yearBuilt',
      ],
      garage: ['areaM2', 'floor'],
    });
  });

  it('defines required fields for every supported property type', () => {
    expect(LISTING_REQUIRED_DYNAMIC_FIELDS).toEqual({
      apartment: ['areaM2', 'rooms'],
      house: ['areaM2', 'plotAreaM2', 'rooms'],
      land: ['plotAreaM2'],
      commercial: ['areaM2'],
      office: ['areaM2'],
      garage: ['areaM2'],
    });
  });

  it('uses property-specific labels', () => {
    expect(
      getListingDynamicFieldLabel(PropertyType.HOUSE, 'totalFloors'),
    ).toBe('Liczba kondygnacji');
    expect(
      getListingDynamicFieldLabel(PropertyType.OFFICE, 'rooms'),
    ).toBe('Liczba pomieszczeń');
  });

  it('removes fields that are hidden for the selected property type', () => {
    expect(
      sanitizeListingDynamicFields({
        propertyType: PropertyType.LAND,
        price: 350000,
        areaM2: 60,
        plotAreaM2: 1200,
        rooms: 3,
        bathrooms: 1,
      }),
    ).toEqual({
      propertyType: PropertyType.LAND,
      price: 350000,
      plotAreaM2: 1200,
    });
  });

  it('hides all dynamic fields until a property type is selected', () => {
    expect(shouldShowListingField('', 'areaM2')).toBe(false);
  });
});
