import {
  getListingDynamicFieldLabel,
  getListingDynamicFieldRequiredMessage,
  getListingDynamicFields,
  isListingDynamicFieldRequired,
  TransactionType,
} from './listings';
import type {
  ListingDynamicField,
  PropertyType as PropertyTypeValue,
  TransactionType as TransactionTypeValue,
} from './listings';

export type PublicListingParameterField = ListingDynamicField;

export type PublicListingTransactionField = 'rentAdministrativeFee' | 'deposit';

export interface PublicListingNumberFieldConfig {
  key: PublicListingParameterField | PublicListingTransactionField;
  label: string;
  placeholder?: string;
  min?: string;
  max?: string;
  integer?: boolean;
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
    integer: true,
  },
  bathrooms: {
    key: 'bathrooms',
    label: 'Łazienki',
    min: '0',
    max: '20',
    integer: true,
  },
  floor: {
    key: 'floor',
    label: 'Piętro',
    integer: true,
  },
  totalFloors: {
    key: 'totalFloors',
    label: 'Liczba pięter',
    min: '1',
    integer: true,
  },
  yearBuilt: {
    key: 'yearBuilt',
    label: 'Rok budowy',
    min: '1800',
    max: String(new Date().getFullYear() + 5),
    integer: true,
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

  return getListingDynamicFields(propertyType).map((key) =>
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

  return isListingDynamicFieldRequired(propertyType, field);
}

export function getPublicListingPriceLabel(
  transactionType: TransactionTypeValue | '',
): string {
  return transactionType === TransactionType.RENT ? 'Czynsz najmu' : 'Cena';
}

export function validatePublicListingParameterFieldValue(
  propertyType: PropertyTypeValue | '',
  field: PublicListingParameterFieldConfig,
  value: string,
): string | null {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return field.required
      ? getListingDynamicFieldRequiredMessage(propertyType, field.key)
      : null;
  }

  const numberValue = Number(normalizedValue);
  if (!Number.isFinite(numberValue)) {
    return `${field.label} musi być liczbą`;
  }

  if (field.integer && !Number.isInteger(numberValue)) {
    return `${field.label} musi być liczbą całkowitą`;
  }

  if (field.min !== undefined && numberValue < Number(field.min)) {
    return `${field.label} nie może być mniejsze niż ${field.min}`;
  }

  if (field.max !== undefined && numberValue > Number(field.max)) {
    return `${field.label} nie może być większe niż ${field.max}`;
  }

  return null;
}

function buildParameterFieldConfig(
  propertyType: PropertyTypeValue,
  key: PublicListingParameterField,
): PublicListingParameterFieldConfig {
  const base = PARAMETER_FIELD_CONFIG[key];
  const required = isPublicListingParameterFieldRequired(propertyType, key);
  return {
    ...base,
    label: getListingDynamicFieldLabel(propertyType, key),
    required,
  };
}
