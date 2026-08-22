import { z } from 'zod';

export const ListingMarketType = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
} as const;

export type ListingMarketType =
  (typeof ListingMarketType)[keyof typeof ListingMarketType];

export const ListingCondition = {
  DEVELOPER_STANDARD: 'developer_standard',
  SHELL: 'shell',
  TO_RENOVATE: 'to_renovate',
  TO_REFRESH: 'to_refresh',
  GOOD: 'good',
  VERY_GOOD: 'very_good',
} as const;

export type ListingCondition =
  (typeof ListingCondition)[keyof typeof ListingCondition];

export const ListingOwnershipType = {
  FULL_OWNERSHIP: 'full_ownership',
  COOPERATIVE_OWNERSHIP: 'cooperative_ownership',
  SHARE: 'share',
} as const;

export type ListingOwnershipType =
  (typeof ListingOwnershipType)[keyof typeof ListingOwnershipType];

export const ListingBuildingType = {
  LOW_BLOCK: 'low_block',
  HIGH_BLOCK: 'high_block',
  APARTMENT_BUILDING: 'apartment_building',
  TENEMENT: 'tenement',
  DETACHED: 'detached',
  OFFICE_BUILDING: 'office_building',
  WAREHOUSE: 'warehouse',
  MIXED_USE: 'mixed_use',
} as const;

export type ListingBuildingType =
  (typeof ListingBuildingType)[keyof typeof ListingBuildingType];

export const ListingHouseType = {
  DETACHED: 'detached',
  SEMI_DETACHED: 'semi_detached',
  TERRACED: 'terraced',
  RESIDENCE: 'residence',
  RECREATIONAL: 'recreational',
} as const;

export type ListingHouseType =
  (typeof ListingHouseType)[keyof typeof ListingHouseType];

export const ListingPlotType = {
  BUILDING: 'building',
  AGRICULTURAL: 'agricultural',
  RECREATIONAL: 'recreational',
  INVESTMENT: 'investment',
  FOREST: 'forest',
  COMMERCIAL: 'commercial',
} as const;

export type ListingPlotType =
  (typeof ListingPlotType)[keyof typeof ListingPlotType];

export const ListingPlotShape = {
  RECTANGLE: 'rectangle',
  SQUARE: 'square',
  TRAPEZOID: 'trapezoid',
  IRREGULAR: 'irregular',
} as const;

export type ListingPlotShape =
  (typeof ListingPlotShape)[keyof typeof ListingPlotShape];

export const ListingAccessRoadType = {
  ASPHALT: 'asphalt',
  PAVED: 'paved',
  GRAVEL: 'gravel',
  DIRT: 'dirt',
  EASEMENT: 'easement',
  NONE: 'none',
} as const;

export type ListingAccessRoadType =
  (typeof ListingAccessRoadType)[keyof typeof ListingAccessRoadType];

export const ListingLocalPlanStatus = {
  YES: 'yes',
  NO: 'no',
  IN_PROGRESS: 'in_progress',
  UNKNOWN: 'unknown',
} as const;

export type ListingLocalPlanStatus =
  (typeof ListingLocalPlanStatus)[keyof typeof ListingLocalPlanStatus];

export const ListingDevelopmentConditionsStatus = {
  ISSUED: 'issued',
  NOT_ISSUED: 'not_issued',
  IN_PROGRESS: 'in_progress',
  NOT_REQUIRED: 'not_required',
  UNKNOWN: 'unknown',
} as const;

export type ListingDevelopmentConditionsStatus =
  (typeof ListingDevelopmentConditionsStatus)[keyof typeof ListingDevelopmentConditionsStatus];

export const ListingHeatingType = {
  DISTRICT: 'district',
  GAS: 'gas',
  ELECTRIC: 'electric',
  HEAT_PUMP: 'heat_pump',
  SOLID_FUEL: 'solid_fuel',
  OIL: 'oil',
  OTHER: 'other',
} as const;

export type ListingHeatingType =
  (typeof ListingHeatingType)[keyof typeof ListingHeatingType];

export const ListingGarageType = {
  UNDERGROUND: 'underground',
  GARAGE_HALL: 'garage_hall',
  DETACHED: 'detached',
  PARKING_SPACE: 'parking_space',
  CARPORT: 'carport',
  NONE: 'none',
} as const;

export type ListingGarageType =
  (typeof ListingGarageType)[keyof typeof ListingGarageType];

export const ListingCommercialPurpose = {
  RETAIL: 'retail',
  OFFICE: 'office',
  SERVICE: 'service',
  GASTRONOMY: 'gastronomy',
  MEDICAL: 'medical',
  WAREHOUSE: 'warehouse',
  PRODUCTION: 'production',
  MIXED: 'mixed',
  OTHER: 'other',
} as const;

export type ListingCommercialPurpose =
  (typeof ListingCommercialPurpose)[keyof typeof ListingCommercialPurpose];

export interface ListingDetails {
  marketType?: ListingMarketType;
  condition?: ListingCondition;
  ownershipType?: ListingOwnershipType;
  buildingType?: ListingBuildingType;
  houseType?: ListingHouseType;
  plotType?: ListingPlotType;
  plotShape?: ListingPlotShape;
  accessRoadType?: ListingAccessRoadType;
  localPlanStatus?: ListingLocalPlanStatus;
  developmentConditionsStatus?: ListingDevelopmentConditionsStatus;
  heatingType?: ListingHeatingType;
  garageType?: ListingGarageType;
  commercialPurpose?: ListingCommercialPurpose;
  hasBalcony?: boolean;
  hasElevator?: boolean;
  hasParking?: boolean;
  parkingSpaces?: number;
  rentAdministrativeFee?: number;
  deposit?: number;
  availableFrom?: string;
  priceNegotiable?: boolean;
}

export type ListingDetailsField = keyof ListingDetails;

export type ListingDetailsInputKind = 'select' | 'checkbox' | 'number' | 'date';

export interface ListingDetailsFieldConfig {
  key: ListingDetailsField;
  label: string;
  kind: ListingDetailsInputKind;
  propertyTypes: readonly string[];
  transactionTypes?: readonly string[];
  options?: readonly { value: string; label: string }[];
  placeholder?: string;
  min?: string;
  max?: string;
  step?: string;
}

export interface ListingDetailsCompleteness {
  total: number;
  completed: number;
  percent: number;
  missingFields: readonly ListingDetailsFieldConfig[];
}

const booleanFromFormSchema = z
  .boolean()
  .or(z.enum(['true', 'false']).transform((value) => value === 'true'))
  .optional();

const optionalNumberSchema = z.literal('').or(z.coerce.number().min(0)).optional();

export const listingDetailsSchema = z
  .object({
    marketType: z.enum(['primary', 'secondary']).optional().or(z.literal('')),
    condition: z
      .enum([
        'developer_standard',
        'shell',
        'to_renovate',
        'to_refresh',
        'good',
        'very_good',
      ])
      .optional()
      .or(z.literal('')),
    ownershipType: z
      .enum(['full_ownership', 'cooperative_ownership', 'share'])
      .optional()
      .or(z.literal('')),
    buildingType: z
      .enum([
        'low_block',
        'high_block',
        'apartment_building',
        'tenement',
        'detached',
        'office_building',
        'warehouse',
        'mixed_use',
      ])
      .optional()
      .or(z.literal('')),
    houseType: z
      .enum(['detached', 'semi_detached', 'terraced', 'residence', 'recreational'])
      .optional()
      .or(z.literal('')),
    plotType: z
      .enum(['building', 'agricultural', 'recreational', 'investment', 'forest', 'commercial'])
      .optional()
      .or(z.literal('')),
    plotShape: z
      .enum(['rectangle', 'square', 'trapezoid', 'irregular'])
      .optional()
      .or(z.literal('')),
    accessRoadType: z
      .enum(['asphalt', 'paved', 'gravel', 'dirt', 'easement', 'none'])
      .optional()
      .or(z.literal('')),
    localPlanStatus: z
      .enum(['yes', 'no', 'in_progress', 'unknown'])
      .optional()
      .or(z.literal('')),
    developmentConditionsStatus: z
      .enum(['issued', 'not_issued', 'in_progress', 'not_required', 'unknown'])
      .optional()
      .or(z.literal('')),
    heatingType: z
      .enum(['district', 'gas', 'electric', 'heat_pump', 'solid_fuel', 'oil', 'other'])
      .optional()
      .or(z.literal('')),
    garageType: z
      .enum(['underground', 'garage_hall', 'detached', 'parking_space', 'carport', 'none'])
      .optional()
      .or(z.literal('')),
    commercialPurpose: z
      .enum([
        'retail',
        'office',
        'service',
        'gastronomy',
        'medical',
        'warehouse',
        'production',
        'mixed',
        'other',
      ])
      .optional()
      .or(z.literal('')),
    hasBalcony: booleanFromFormSchema,
    hasElevator: booleanFromFormSchema,
    hasParking: booleanFromFormSchema,
    parkingSpaces: optionalNumberSchema,
    rentAdministrativeFee: optionalNumberSchema,
    deposit: optionalNumberSchema,
    availableFrom: z.string().optional().or(z.literal('')),
    priceNegotiable: booleanFromFormSchema,
  })
  .partial()
  .strict()
  .optional();

export const LISTING_DETAILS_FIELD_CONFIGS: readonly ListingDetailsFieldConfig[] =
  [
    {
      key: 'marketType',
      label: 'Rynek',
      kind: 'select',
      propertyTypes: ['apartment', 'house', 'commercial', 'office'],
      options: [
        { value: 'primary', label: 'Pierwotny' },
        { value: 'secondary', label: 'Wtórny' },
      ],
    },
    {
      key: 'condition',
      label: 'Stan',
      kind: 'select',
      propertyTypes: ['apartment', 'house', 'commercial', 'office', 'garage'],
      options: [
        { value: 'developer_standard', label: 'Deweloperski' },
        { value: 'shell', label: 'Do wykończenia' },
        { value: 'to_renovate', label: 'Do remontu' },
        { value: 'to_refresh', label: 'Do odświeżenia' },
        { value: 'good', label: 'Dobry' },
        { value: 'very_good', label: 'Bardzo dobry' },
      ],
    },
    {
      key: 'ownershipType',
      label: 'Forma własności',
      kind: 'select',
      propertyTypes: ['apartment', 'house', 'land', 'commercial', 'office', 'garage'],
      transactionTypes: ['sale'],
      options: [
        { value: 'full_ownership', label: 'Pełna własność' },
        { value: 'cooperative_ownership', label: 'Spółdzielcze własnościowe' },
        { value: 'share', label: 'Udział' },
      ],
    },
    {
      key: 'buildingType',
      label: 'Typ budynku',
      kind: 'select',
      propertyTypes: ['apartment', 'commercial', 'office'],
      options: [
        { value: 'low_block', label: 'Niski blok' },
        { value: 'high_block', label: 'Wysoki blok' },
        { value: 'apartment_building', label: 'Apartamentowiec' },
        { value: 'tenement', label: 'Kamienica' },
        { value: 'office_building', label: 'Biurowiec' },
        { value: 'warehouse', label: 'Magazyn' },
        { value: 'mixed_use', label: 'Mieszany' },
      ],
    },
    {
      key: 'houseType',
      label: 'Rodzaj domu',
      kind: 'select',
      propertyTypes: ['house'],
      options: [
        { value: 'detached', label: 'Wolnostojący' },
        { value: 'semi_detached', label: 'Bliźniak' },
        { value: 'terraced', label: 'Szeregowiec' },
        { value: 'residence', label: 'Rezydencja' },
        { value: 'recreational', label: 'Rekreacyjny' },
      ],
    },
    {
      key: 'plotType',
      label: 'Rodzaj działki',
      kind: 'select',
      propertyTypes: ['land'],
      options: [
        { value: 'building', label: 'Budowlana' },
        { value: 'agricultural', label: 'Rolna' },
        { value: 'recreational', label: 'Rekreacyjna' },
        { value: 'investment', label: 'Inwestycyjna' },
        { value: 'forest', label: 'Leśna' },
        { value: 'commercial', label: 'Usługowa' },
      ],
    },
    {
      key: 'plotShape',
      label: 'Kształt działki',
      kind: 'select',
      propertyTypes: ['house', 'land'],
      options: [
        { value: 'rectangle', label: 'Prostokąt' },
        { value: 'square', label: 'Kwadrat' },
        { value: 'trapezoid', label: 'Trapez' },
        { value: 'irregular', label: 'Nieregularny' },
      ],
    },
    {
      key: 'accessRoadType',
      label: 'Dojazd',
      kind: 'select',
      propertyTypes: ['house', 'land', 'commercial', 'office', 'garage'],
      options: [
        { value: 'asphalt', label: 'Asfaltowy' },
        { value: 'paved', label: 'Utwardzony' },
        { value: 'gravel', label: 'Szutrowy' },
        { value: 'dirt', label: 'Gruntowy' },
        { value: 'easement', label: 'Służebność' },
        { value: 'none', label: 'Brak' },
      ],
    },
    {
      key: 'localPlanStatus',
      label: 'MPZP',
      kind: 'select',
      propertyTypes: ['land'],
      options: [
        { value: 'yes', label: 'Jest' },
        { value: 'no', label: 'Brak' },
        { value: 'in_progress', label: 'W trakcie' },
        { value: 'unknown', label: 'Nie wiem' },
      ],
    },
    {
      key: 'developmentConditionsStatus',
      label: 'Warunki zabudowy',
      kind: 'select',
      propertyTypes: ['land'],
      options: [
        { value: 'issued', label: 'Wydane' },
        { value: 'not_issued', label: 'Brak' },
        { value: 'in_progress', label: 'W trakcie' },
        { value: 'not_required', label: 'Nie wymagane' },
        { value: 'unknown', label: 'Nie wiem' },
      ],
    },
    {
      key: 'heatingType',
      label: 'Ogrzewanie',
      kind: 'select',
      propertyTypes: ['apartment', 'house', 'commercial', 'office'],
      options: [
        { value: 'district', label: 'Miejskie' },
        { value: 'gas', label: 'Gazowe' },
        { value: 'electric', label: 'Elektryczne' },
        { value: 'heat_pump', label: 'Pompa ciepła' },
        { value: 'solid_fuel', label: 'Paliwo stałe' },
        { value: 'oil', label: 'Olejowe' },
        { value: 'other', label: 'Inne' },
      ],
    },
    {
      key: 'garageType',
      label: 'Typ garażu / miejsca',
      kind: 'select',
      propertyTypes: ['house', 'garage'],
      options: [
        { value: 'underground', label: 'Podziemny' },
        { value: 'garage_hall', label: 'Hala garażowa' },
        { value: 'detached', label: 'Wolnostojący' },
        { value: 'parking_space', label: 'Miejsce postojowe' },
        { value: 'carport', label: 'Wiata' },
        { value: 'none', label: 'Brak' },
      ],
    },
    {
      key: 'commercialPurpose',
      label: 'Przeznaczenie lokalu',
      kind: 'select',
      propertyTypes: ['commercial', 'office'],
      options: [
        { value: 'retail', label: 'Handel' },
        { value: 'office', label: 'Biuro' },
        { value: 'service', label: 'Usługi' },
        { value: 'gastronomy', label: 'Gastronomia' },
        { value: 'medical', label: 'Medyczne' },
        { value: 'warehouse', label: 'Magazyn' },
        { value: 'production', label: 'Produkcja' },
        { value: 'mixed', label: 'Mieszane' },
        { value: 'other', label: 'Inne' },
      ],
    },
    {
      key: 'parkingSpaces',
      label: 'Liczba miejsc parkingowych',
      kind: 'number',
      propertyTypes: ['apartment', 'house', 'commercial', 'office', 'garage'],
      min: '0',
      max: '100',
      placeholder: 'np. 1',
    },
    {
      key: 'rentAdministrativeFee',
      label: 'Czynsz administracyjny',
      kind: 'number',
      propertyTypes: ['apartment', 'house', 'commercial', 'office'],
      min: '0',
      step: '0.01',
      placeholder: 'np. 750',
    },
    {
      key: 'deposit',
      label: 'Kaucja',
      kind: 'number',
      propertyTypes: ['apartment', 'house', 'commercial', 'office', 'garage'],
      transactionTypes: ['rent'],
      min: '0',
      step: '0.01',
      placeholder: 'np. 4000',
    },
    {
      key: 'availableFrom',
      label: 'Dostępne od',
      kind: 'date',
      propertyTypes: ['apartment', 'house', 'land', 'commercial', 'office', 'garage'],
    },
    {
      key: 'hasBalcony',
      label: 'Balkon',
      kind: 'checkbox',
      propertyTypes: ['apartment'],
    },
    {
      key: 'hasElevator',
      label: 'Winda',
      kind: 'checkbox',
      propertyTypes: ['apartment', 'commercial', 'office'],
    },
    {
      key: 'hasParking',
      label: 'Parking',
      kind: 'checkbox',
      propertyTypes: ['apartment', 'house', 'commercial', 'office', 'garage'],
    },
    {
      key: 'priceNegotiable',
      label: 'Cena do negocjacji',
      kind: 'checkbox',
      propertyTypes: ['apartment', 'house', 'land', 'commercial', 'office', 'garage'],
      transactionTypes: ['sale'],
    },
  ] as const;

export function getListingDetailsFieldConfigs(input: {
  propertyType: string | '';
  transactionType: string | '';
}): readonly ListingDetailsFieldConfig[] {
  if (!input.propertyType) return [];

  return LISTING_DETAILS_FIELD_CONFIGS.filter((field) => {
    const matchesProperty = field.propertyTypes.includes(input.propertyType);
    const matchesTransaction =
      !field.transactionTypes ||
      !input.transactionType ||
      field.transactionTypes.includes(input.transactionType);

    return matchesProperty && matchesTransaction;
  });
}

export function getListingDetailsCompleteness(input: {
  propertyType: string | '';
  transactionType: string | '';
  details?: Partial<ListingDetails> | null;
}): ListingDetailsCompleteness {
  const fields = getListingDetailsFieldConfigs(input);
  const completedFields = fields.filter((field) =>
    isListingDetailsValueFilled(input.details?.[field.key], field.kind),
  );

  return {
    total: fields.length,
    completed: completedFields.length,
    percent:
      fields.length === 0
        ? 0
        : Math.round((completedFields.length / fields.length) * 100),
    missingFields: fields.filter(
      (field) => !completedFields.some((completed) => completed.key === field.key),
    ),
  };
}

function isListingDetailsValueFilled(
  value: ListingDetails[ListingDetailsField] | string | undefined,
  kind: ListingDetailsInputKind,
): boolean {
  if (kind === 'checkbox') {
    return value === true;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  return typeof value === 'string' && value.trim().length > 0;
}
