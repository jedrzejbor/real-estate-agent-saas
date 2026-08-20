import { PropertyType, TransactionType } from './listings';
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

const SALE_OPTIONS = [
  buildIntentOption(TransactionType.SALE, PropertyType.APARTMENT, 'Mieszkanie'),
  buildIntentOption(TransactionType.SALE, PropertyType.HOUSE, 'Dom'),
  buildIntentOption(TransactionType.SALE, PropertyType.LAND, 'Działka'),
  buildIntentOption(
    TransactionType.SALE,
    PropertyType.COMMERCIAL,
    'Lokal użytkowy',
  ),
  buildIntentOption(TransactionType.SALE, PropertyType.OFFICE, 'Biuro'),
  buildIntentOption(
    TransactionType.SALE,
    PropertyType.GARAGE,
    'Garaż / miejsce',
  ),
] as const satisfies readonly ListingIntentOption[];

const RENT_OPTIONS = [
  buildIntentOption(TransactionType.RENT, PropertyType.APARTMENT, 'Mieszkanie'),
  buildIntentOption(TransactionType.RENT, PropertyType.HOUSE, 'Dom'),
  buildIntentOption(TransactionType.RENT, PropertyType.LAND, 'Działka'),
  buildIntentOption(
    TransactionType.RENT,
    PropertyType.COMMERCIAL,
    'Lokal użytkowy',
  ),
  buildIntentOption(TransactionType.RENT, PropertyType.OFFICE, 'Biuro'),
  buildIntentOption(
    TransactionType.RENT,
    PropertyType.GARAGE,
    'Garaż / miejsce',
  ),
] as const satisfies readonly ListingIntentOption[];

export const LISTING_INTENT_SECTIONS = [
  {
    id: 'sale',
    title: 'Sprzedam',
    transactionType: TransactionType.SALE,
    options: SALE_OPTIONS,
  },
  {
    id: 'rent',
    title: 'Wynajmę',
    transactionType: TransactionType.RENT,
    options: RENT_OPTIONS,
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
  label: string,
): ListingIntentOption {
  return {
    id: buildIntentOptionId(transactionType, propertyType),
    transactionType,
    propertyType,
    label,
  };
}
