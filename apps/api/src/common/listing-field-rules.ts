import { PropertyType } from './enums';

export type RequiredListingDynamicField =
  | 'areaM2'
  | 'plotAreaM2'
  | 'rooms';

export const LISTING_REQUIRED_DYNAMIC_FIELDS = {
  [PropertyType.APARTMENT]: ['areaM2', 'rooms'],
  [PropertyType.HOUSE]: ['areaM2', 'plotAreaM2', 'rooms'],
  [PropertyType.LAND]: ['plotAreaM2'],
  [PropertyType.COMMERCIAL]: ['areaM2'],
  [PropertyType.OFFICE]: ['areaM2'],
  [PropertyType.GARAGE]: ['areaM2'],
} as const satisfies Record<
  PropertyType,
  readonly RequiredListingDynamicField[]
>;

export function isListingDynamicFieldRequired(
  propertyType: PropertyType | undefined,
  field: RequiredListingDynamicField,
): boolean {
  if (!propertyType) {
    return false;
  }

  return LISTING_REQUIRED_DYNAMIC_FIELDS[propertyType].some(
    (requiredField) => requiredField === field,
  );
}

export function shouldValidateListingDynamicField(
  propertyType: PropertyType | undefined,
  field: RequiredListingDynamicField,
  value: unknown,
): boolean {
  return (
    value !== undefined ||
    isListingDynamicFieldRequired(propertyType, field)
  );
}
