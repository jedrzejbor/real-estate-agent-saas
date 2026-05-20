import { PropertyType, TransactionType } from './listings';
import type {
  PropertyType as PropertyTypeValue,
  TransactionType as TransactionTypeValue,
} from './listings';

export type PublicListingParameterField =
  | 'areaM2'
  | 'plotAreaM2'
  | 'rooms'
  | 'bathrooms'
  | 'floor'
  | 'totalFloors'
  | 'yearBuilt';

export type PublicListingTransactionField = 'rentAdministrativeFee' | 'deposit';

export interface PublicListingNumberFieldConfig {
  key: PublicListingParameterField | PublicListingTransactionField;
  label: string;
  placeholder?: string;
  min?: string;
  max?: string;
  required?: boolean;
}

export type PublicListingParameterFieldConfig =
  PublicListingNumberFieldConfig & {
    key: PublicListingParameterField;
  };

export type PublicListingTransactionFieldConfig =
  PublicListingNumberFieldConfig & {
    key: PublicListingTransactionField;
  };

const PARAMETER_FIELD_CONFIG: Record<
  PublicListingParameterField,
  PublicListingParameterFieldConfig
> = {
  areaM2: {
    key: 'areaM2',
    label: 'Powierzchnia (m²)',
    min: '1',
  },
  plotAreaM2: {
    key: 'plotAreaM2',
    label: 'Powierzchnia działki (m²)',
    min: '1',
  },
  rooms: {
    key: 'rooms',
    label: 'Pokoje',
    min: '1',
    max: '99',
  },
  bathrooms: {
    key: 'bathrooms',
    label: 'Łazienki',
    min: '0',
    max: '20',
  },
  floor: {
    key: 'floor',
    label: 'Piętro',
  },
  totalFloors: {
    key: 'totalFloors',
    label: 'Liczba pięter',
    min: '1',
  },
  yearBuilt: {
    key: 'yearBuilt',
    label: 'Rok budowy',
    min: '1800',
  },
};

const TRANSACTION_FIELD_CONFIG: Record<
  PublicListingTransactionField,
  PublicListingTransactionFieldConfig
> = {
  rentAdministrativeFee: {
    key: 'rentAdministrativeFee',
    label: 'Czynsz administracyjny',
    placeholder: 'np. 850',
    min: '0',
  },
  deposit: {
    key: 'deposit',
    label: 'Kaucja',
    placeholder: 'np. 4000',
    min: '0',
  },
};

const PARAMETER_FIELDS_BY_PROPERTY_TYPE: Record<
  PropertyTypeValue,
  PublicListingParameterField[]
> = {
  apartment: [
    'areaM2',
    'rooms',
    'bathrooms',
    'floor',
    'totalFloors',
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
    'bathrooms',
    'floor',
    'totalFloors',
    'yearBuilt',
  ],
  office: ['areaM2', 'rooms', 'bathrooms', 'floor', 'totalFloors', 'yearBuilt'],
  garage: ['areaM2'],
};

const REQUIRED_PARAMETER_FIELDS_BY_PROPERTY_TYPE: Record<
  PropertyTypeValue,
  PublicListingParameterField[]
> = {
  apartment: ['areaM2', 'rooms'],
  house: ['areaM2', 'plotAreaM2', 'rooms'],
  land: ['plotAreaM2'],
  commercial: ['areaM2'],
  office: ['areaM2'],
  garage: ['areaM2'],
};

const TRANSACTION_FIELDS_BY_TRANSACTION_TYPE: Partial<
  Record<TransactionTypeValue, PublicListingTransactionField[]>
> = {
  rent: ['rentAdministrativeFee', 'deposit'],
};

export function getPublicListingParameterFields(
  propertyType: PropertyTypeValue | '',
): PublicListingParameterFieldConfig[] {
  if (!propertyType) {
    return [];
  }

  return PARAMETER_FIELDS_BY_PROPERTY_TYPE[propertyType].map((key) =>
    buildParameterFieldConfig(propertyType, key),
  );
}

export function getPublicListingTransactionFields(
  transactionType: TransactionTypeValue | '',
): PublicListingTransactionFieldConfig[] {
  if (!transactionType) {
    return [];
  }

  return (TRANSACTION_FIELDS_BY_TRANSACTION_TYPE[transactionType] ?? []).map(
    (key) => TRANSACTION_FIELD_CONFIG[key],
  );
}

export function isPublicListingParameterFieldRequired(
  propertyType: PropertyTypeValue | '',
  field: PublicListingParameterField,
): boolean {
  if (!propertyType) {
    return false;
  }

  return REQUIRED_PARAMETER_FIELDS_BY_PROPERTY_TYPE[propertyType].includes(
    field,
  );
}

export function getPublicListingPriceLabel(
  transactionType: TransactionTypeValue | '',
): string {
  return transactionType === TransactionType.RENT ? 'Czynsz najmu' : 'Cena';
}

function buildParameterFieldConfig(
  propertyType: PropertyTypeValue,
  key: PublicListingParameterField,
): PublicListingParameterFieldConfig {
  const base = PARAMETER_FIELD_CONFIG[key];
  const required = isPublicListingParameterFieldRequired(propertyType, key);

  if (propertyType === PropertyType.HOUSE && key === 'areaM2') {
    return { ...base, label: 'Powierzchnia domu (m²)', required };
  }

  if (propertyType === PropertyType.HOUSE && key === 'totalFloors') {
    return { ...base, label: 'Liczba kondygnacji', required };
  }

  return { ...base, required };
}
