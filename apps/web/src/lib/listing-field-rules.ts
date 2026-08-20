export const PropertyType = {
  APARTMENT: 'apartment',
  HOUSE: 'house',
  LAND: 'land',
  COMMERCIAL: 'commercial',
  OFFICE: 'office',
  GARAGE: 'garage',
} as const;

export type PropertyType = (typeof PropertyType)[keyof typeof PropertyType];

export const LISTING_DYNAMIC_FIELDS = {
  AREA_M2: 'areaM2',
  PLOT_AREA_M2: 'plotAreaM2',
  ROOMS: 'rooms',
  BATHROOMS: 'bathrooms',
  FLOOR: 'floor',
  TOTAL_FLOORS: 'totalFloors',
  YEAR_BUILT: 'yearBuilt',
} as const;

export type ListingDynamicField =
  (typeof LISTING_DYNAMIC_FIELDS)[keyof typeof LISTING_DYNAMIC_FIELDS];

export const LISTING_FIELD_VISIBILITY = {
  [PropertyType.APARTMENT]: [
    'areaM2',
    'rooms',
    'floor',
    'totalFloors',
    'bathrooms',
    'yearBuilt',
  ],
  [PropertyType.HOUSE]: [
    'areaM2',
    'plotAreaM2',
    'rooms',
    'bathrooms',
    'totalFloors',
    'yearBuilt',
  ],
  [PropertyType.LAND]: ['plotAreaM2'],
  [PropertyType.COMMERCIAL]: [
    'areaM2',
    'rooms',
    'floor',
    'bathrooms',
    'totalFloors',
    'yearBuilt',
  ],
  [PropertyType.OFFICE]: [
    'areaM2',
    'rooms',
    'floor',
    'bathrooms',
    'totalFloors',
    'yearBuilt',
  ],
  [PropertyType.GARAGE]: ['areaM2', 'floor'],
} as const satisfies Record<
  PropertyType,
  readonly ListingDynamicField[]
>;

export const LISTING_REQUIRED_DYNAMIC_FIELDS = {
  [PropertyType.APARTMENT]: ['areaM2', 'rooms'],
  [PropertyType.HOUSE]: ['areaM2', 'plotAreaM2', 'rooms'],
  [PropertyType.LAND]: ['plotAreaM2'],
  [PropertyType.COMMERCIAL]: ['areaM2'],
  [PropertyType.OFFICE]: ['areaM2'],
  [PropertyType.GARAGE]: ['areaM2'],
} as const satisfies Record<
  PropertyType,
  readonly ListingDynamicField[]
>;

const LISTING_DYNAMIC_FIELD_LABELS: Record<ListingDynamicField, string> = {
  areaM2: 'Powierzchnia (m²)',
  plotAreaM2: 'Powierzchnia działki (m²)',
  rooms: 'Pokoje',
  bathrooms: 'Łazienki',
  floor: 'Piętro',
  totalFloors: 'Liczba pięter',
  yearBuilt: 'Rok budowy',
};

export function getListingDynamicFields(
  propertyType: PropertyType | '' | undefined,
): readonly ListingDynamicField[] {
  return propertyType ? LISTING_FIELD_VISIBILITY[propertyType] : [];
}

export function getRequiredListingDynamicFields(
  propertyType: PropertyType | '' | undefined,
): readonly ListingDynamicField[] {
  return propertyType ? LISTING_REQUIRED_DYNAMIC_FIELDS[propertyType] : [];
}

export function isListingDynamicFieldRequired(
  propertyType: PropertyType | '' | undefined,
  field: ListingDynamicField,
): boolean {
  return getRequiredListingDynamicFields(propertyType).some(
    (requiredField) => requiredField === field,
  );
}

export function getListingDynamicFieldLabel(
  propertyType: PropertyType | '' | undefined,
  field: ListingDynamicField,
): string {
  if (propertyType === PropertyType.HOUSE && field === 'areaM2') {
    return 'Powierzchnia domu (m²)';
  }

  if (propertyType === PropertyType.HOUSE && field === 'totalFloors') {
    return 'Liczba kondygnacji';
  }

  if (
    (propertyType === PropertyType.COMMERCIAL ||
      propertyType === PropertyType.OFFICE) &&
    field === 'rooms'
  ) {
    return 'Liczba pomieszczeń';
  }

  return LISTING_DYNAMIC_FIELD_LABELS[field];
}

export function getListingDynamicFieldRequiredMessage(
  propertyType: PropertyType | '' | undefined,
  field: ListingDynamicField,
): string {
  if (field === 'rooms') {
    return propertyType === PropertyType.COMMERCIAL ||
      propertyType === PropertyType.OFFICE
      ? 'Liczba pomieszczeń jest wymagana'
      : 'Liczba pokoi jest wymagana';
  }

  return `${getListingDynamicFieldLabel(propertyType, field)} jest wymagana`;
}

export function shouldShowListingField(
  propertyType: PropertyType | '' | undefined,
  field: ListingDynamicField,
): boolean {
  return getListingDynamicFields(propertyType).some(
    (visibleField) => visibleField === field,
  );
}

export function sanitizeListingDynamicFields(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const propertyType = data.propertyType;
  if (!isPropertyType(propertyType)) {
    return { ...data };
  }

  const visibleFields = new Set(getListingDynamicFields(propertyType));
  const result = { ...data };

  for (const field of Object.values(LISTING_DYNAMIC_FIELDS)) {
    if (!visibleFields.has(field)) {
      delete result[field];
    }
  }

  return result;
}

function isPropertyType(value: unknown): value is PropertyType {
  return Object.values(PropertyType).some(
    (propertyType) => propertyType === value,
  );
}
