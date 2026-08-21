import {
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPE_VALUES,
  PropertyType,
  TransactionType,
} from './listings';
import type {
  PropertyType as PropertyTypeValue,
  TransactionType as TransactionTypeValue,
} from './listings';

export type ListingIntentSectionId = 'sale' | 'rent';

export interface ListingIntentSelection {
  transactionType: TransactionTypeValue;
  propertyType: PropertyTypeValue;
}

export interface ListingIntentOption extends ListingIntentSelection {
  id: string;
  label: string;
}

export interface ListingIntentSection {
  id: ListingIntentSectionId;
  title: string;
  transactionType: TransactionTypeValue;
  options: readonly ListingIntentOption[];
}

export const LISTING_INTENT_SECTIONS = [
  {
    id: 'sale',
    title: 'Sprzedam',
    transactionType: TransactionType.SALE,
    options: buildIntentOptions(TransactionType.SALE),
  },
  {
    id: 'rent',
    title: 'Wynajmę',
    transactionType: TransactionType.RENT,
    options: buildIntentOptions(TransactionType.RENT),
  },
] as const satisfies readonly ListingIntentSection[];

export const LISTING_INTENT_OPTIONS: readonly ListingIntentOption[] =
  LISTING_INTENT_SECTIONS.flatMap((section) => section.options);

const LISTING_INTENT_OPTION_IDS = new Set(
  LISTING_INTENT_OPTIONS.map((option) => option.id),
);

export function getListingIntentOption(
  selection: ListingIntentSelection,
): ListingIntentOption | undefined {
  return LISTING_INTENT_OPTIONS.find(
    (option) =>
      option.transactionType === selection.transactionType &&
      option.propertyType === selection.propertyType,
  );
}

export function getListingIntentSection(
  sectionId: ListingIntentSectionId,
): ListingIntentSection | undefined {
  return LISTING_INTENT_SECTIONS.find((section) => section.id === sectionId);
}

export function isAllowedListingIntentSelection(
  selection: ListingIntentSelection,
): boolean {
  return LISTING_INTENT_OPTION_IDS.has(
    buildIntentOptionId(selection.transactionType, selection.propertyType),
  );
}

export function buildIntentOptionId(
  transactionType: TransactionTypeValue,
  propertyType: PropertyTypeValue,
): string {
  return `${transactionType}:${propertyType}`;
}

function buildIntentOption(
  transactionType: TransactionTypeValue,
  propertyType: PropertyTypeValue,
): ListingIntentOption {
  return {
    id: buildIntentOptionId(transactionType, propertyType),
    transactionType,
    propertyType,
    label: getIntentPropertyTypeLabel(propertyType),
  };
}

function buildIntentOptions(
  transactionType: TransactionTypeValue,
): readonly ListingIntentOption[] {
  return PROPERTY_TYPE_VALUES.map((propertyType) =>
    buildIntentOption(transactionType, propertyType),
  );
}

function getIntentPropertyTypeLabel(propertyType: PropertyTypeValue): string {
  return propertyType === PropertyType.GARAGE
    ? 'Garaż / miejsce'
    : PROPERTY_TYPE_LABELS[propertyType];
}
