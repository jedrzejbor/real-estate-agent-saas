import { PropertyType } from './enums';
import {
  LISTING_REQUIRED_DYNAMIC_FIELDS,
  isListingDynamicFieldRequired,
  shouldValidateListingDynamicField,
} from './listing-field-rules';

describe('listing field rules', () => {
  it('defines required dynamic fields for every property type', () => {
    expect(LISTING_REQUIRED_DYNAMIC_FIELDS).toEqual({
      apartment: ['areaM2', 'rooms'],
      house: ['areaM2', 'plotAreaM2', 'rooms'],
      land: ['plotAreaM2'],
      commercial: ['areaM2'],
      office: ['areaM2'],
      garage: ['areaM2'],
    });
  });

  it('distinguishes required, optional, and explicitly provided fields', () => {
    expect(
      isListingDynamicFieldRequired(PropertyType.HOUSE, 'plotAreaM2'),
    ).toBe(true);
    expect(
      isListingDynamicFieldRequired(PropertyType.LAND, 'areaM2'),
    ).toBe(false);
    expect(
      shouldValidateListingDynamicField(
        PropertyType.LAND,
        'areaM2',
        undefined,
      ),
    ).toBe(false);
    expect(
      shouldValidateListingDynamicField(PropertyType.LAND, 'areaM2', 50),
    ).toBe(true);
  });
});
