import { z } from 'zod';
import { apiFetch } from './api-client';

export const ListingProductType = {
  PUBLICATION: 'publication',
  RENEWAL: 'renewal',
  FEATURED: 'featured',
} as const;

export type ListingProductType =
  (typeof ListingProductType)[keyof typeof ListingProductType];

export const LISTING_PRODUCT_TYPE_LABELS: Record<ListingProductType, string> = {
  publication: 'Publikacja ogłoszenia',
  renewal: 'Przedłużenie publikacji',
  featured: 'Wyróżnienie ogłoszenia',
};

export interface PublicListingProduct {
  code: string;
  name: string;
  description: string | null;
  type: ListingProductType;
  priceGrossAmount: number;
  currency: string;
  vatRateBasisPoints: number | null;
  durationDays: number;
  featuredTier: string | null;
  sortOrder: number;
}

export interface AdminListingProduct extends PublicListingProduct {
  id: string;
  isPublic: boolean;
  isActive: boolean;
  priorityWeight: number;
  fulfillmentParameters: Record<string, unknown>;
  providerPriceReference: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ListingProductChangeAction =
  | 'created'
  | 'updated'
  | 'archived'
  | 'restored';

export interface ListingProductChangeValue {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface AdminListingProductChange {
  id: string;
  productId: string;
  actorUserId: string | null;
  action: ListingProductChangeAction;
  changes: ListingProductChangeValue[];
  reason: string | null;
  createdAt: string;
}

export interface CreateListingProductInput {
  code: string;
  name: string;
  description: string | null;
  type: ListingProductType;
  priceGrossAmount: number;
  currency: 'PLN';
  vatRateBasisPoints: number | null;
  durationDays: number;
  featuredTier: string | null;
  priorityWeight: number;
  isPublic: boolean;
  isActive: boolean;
  sortOrder: number;
  providerPriceReference: string | null;
  reason?: string;
}

export type UpdateListingProductInput = Omit<
  CreateListingProductInput,
  'code' | 'type'
>;

export interface ListingProductFormValues {
  code: string;
  name: string;
  description: string;
  type: ListingProductType;
  priceGrossPln: string;
  vatRatePercent: string;
  durationDays: string;
  featuredTier: string;
  priorityWeight: string;
  isPublic: boolean;
  isActive: boolean;
  sortOrder: string;
  providerPriceReference: string;
  reason: string;
}

const moneyInputSchema = z
  .string()
  .trim()
  .min(1, 'Podaj cenę brutto')
  .regex(/^\d+(?:[.,]\d{1,2})?$/, 'Podaj kwotę z maksymalnie 2 miejscami po przecinku')
  .refine(
    (value) => decimalToInteger(value, 2) <= 2_147_483_647,
    'Kwota jest zbyt wysoka',
  );

const optionalPercentSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || /^\d+(?:[.,]\d{1,2})?$/.test(value),
    'Podaj procent z maksymalnie 2 miejscami po przecinku',
  )
  .refine(
    (value) => value === '' || decimalToInteger(value, 2) <= 10_000,
    'Stawka VAT nie może przekraczać 100%',
  );

function integerInputSchema(min: number, max: number, message: string) {
  return z
    .string()
    .trim()
    .regex(/^\d+$/, message)
    .refine((value) => {
      const parsed = Number(value);
      return parsed >= min && parsed <= max;
    }, message);
}

export const listingProductFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'Kod musi mieć co najmniej 3 znaki')
      .max(80, 'Kod może mieć maksymalnie 80 znaków')
      .regex(
        /^[a-z0-9]+(?:_[a-z0-9]+)*$/,
        'Użyj małych liter, cyfr i pojedynczych podkreśleń',
      ),
    name: z
      .string()
      .trim()
      .min(1, 'Nazwa jest wymagana')
      .max(160, 'Nazwa może mieć maksymalnie 160 znaków'),
    description: z.string().trim().max(2_000, 'Opis może mieć maksymalnie 2000 znaków'),
    type: z.enum([
      ListingProductType.PUBLICATION,
      ListingProductType.RENEWAL,
      ListingProductType.FEATURED,
    ]),
    priceGrossPln: moneyInputSchema,
    vatRatePercent: optionalPercentSchema,
    durationDays: integerInputSchema(1, 3_650, 'Podaj liczbę dni od 1 do 3650'),
    featuredTier: z.string().trim().max(50, 'Tier może mieć maksymalnie 50 znaków'),
    priorityWeight: integerInputSchema(0, 1_000_000, 'Podaj liczbę od 0 do 1000000'),
    isPublic: z.boolean(),
    isActive: z.boolean(),
    sortOrder: integerInputSchema(0, 1_000_000, 'Podaj liczbę od 0 do 1000000'),
    providerPriceReference: z
      .string()
      .trim()
      .max(255, 'Referencja może mieć maksymalnie 255 znaków'),
    reason: z.string().trim().max(1_000, 'Powód może mieć maksymalnie 1000 znaków'),
  })
  .superRefine((value, context) => {
    if (value.type === ListingProductType.FEATURED && !value.featuredTier) {
      context.addIssue({
        code: 'custom',
        path: ['featuredTier'],
        message: 'Tier jest wymagany dla wyróżnienia',
      });
    }

    if (value.type !== ListingProductType.FEATURED && value.featuredTier) {
      context.addIssue({
        code: 'custom',
        path: ['featuredTier'],
        message: 'Tier jest dostępny tylko dla wyróżnienia',
      });
    }

    if (value.isPublic && !value.isActive) {
      context.addIssue({
        code: 'custom',
        path: ['isPublic'],
        message: 'Produkt publiczny musi być aktywny',
      });
    }
  });

export type ListingProductFormField = keyof ListingProductFormValues;
export type ListingProductFormErrors = Partial<
  Record<ListingProductFormField, string>
>;

export function validateListingProductForm(values: ListingProductFormValues): {
  data?: ListingProductFormValues;
  errors: ListingProductFormErrors;
} {
  const parsed = listingProductFormSchema.safeParse(values);
  if (parsed.success) return { data: parsed.data, errors: {} };

  const errors: ListingProductFormErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && !(field in errors)) {
      errors[field as ListingProductFormField] = issue.message;
    }
  }
  return { errors };
}

export function createEmptyListingProductForm(): ListingProductFormValues {
  return {
    code: '',
    name: '',
    description: '',
    type: ListingProductType.PUBLICATION,
    priceGrossPln: '',
    vatRatePercent: '',
    durationDays: '',
    featuredTier: '',
    priorityWeight: '0',
    isPublic: false,
    isActive: true,
    sortOrder: '0',
    providerPriceReference: '',
    reason: '',
  };
}

export function toListingProductForm(
  product: AdminListingProduct,
): ListingProductFormValues {
  return {
    code: product.code,
    name: product.name,
    description: product.description ?? '',
    type: product.type,
    priceGrossPln: integerToDecimal(product.priceGrossAmount, 2),
    vatRatePercent:
      product.vatRateBasisPoints === null
        ? ''
        : integerToDecimal(product.vatRateBasisPoints, 2),
    durationDays: String(product.durationDays),
    featuredTier: product.featuredTier ?? '',
    priorityWeight: String(product.priorityWeight),
    isPublic: product.isPublic,
    isActive: product.isActive,
    sortOrder: String(product.sortOrder),
    providerPriceReference: product.providerPriceReference ?? '',
    reason: '',
  };
}

export function toCreateListingProductInput(
  values: ListingProductFormValues,
): CreateListingProductInput {
  const parsed = listingProductFormSchema.parse(values);
  return {
    code: parsed.code,
    name: parsed.name,
    description: emptyToNull(parsed.description),
    type: parsed.type,
    priceGrossAmount: decimalToInteger(parsed.priceGrossPln, 2),
    currency: 'PLN',
    vatRateBasisPoints:
      parsed.vatRatePercent === ''
        ? null
        : decimalToInteger(parsed.vatRatePercent, 2),
    durationDays: Number(parsed.durationDays),
    featuredTier: emptyToNull(parsed.featuredTier),
    priorityWeight: Number(parsed.priorityWeight),
    isPublic: parsed.isPublic,
    isActive: parsed.isActive,
    sortOrder: Number(parsed.sortOrder),
    providerPriceReference: emptyToNull(parsed.providerPriceReference),
    ...(parsed.reason ? { reason: parsed.reason } : {}),
  };
}

export function toUpdateListingProductInput(
  values: ListingProductFormValues,
): UpdateListingProductInput {
  const input = toCreateListingProductInput(values);
  return {
    name: input.name,
    description: input.description,
    priceGrossAmount: input.priceGrossAmount,
    currency: input.currency,
    vatRateBasisPoints: input.vatRateBasisPoints,
    durationDays: input.durationDays,
    featuredTier: input.featuredTier,
    priorityWeight: input.priorityWeight,
    isPublic: input.isPublic,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
    providerPriceReference: input.providerPriceReference,
    ...(input.reason ? { reason: input.reason } : {}),
  };
}

export function formatListingProductPrice(
  amount: number,
  currency = 'PLN',
): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

export function parsePricePreview(value: string): number | null {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim())) return null;
  const amount = decimalToInteger(value, 2);
  return amount <= 2_147_483_647 ? amount : null;
}

export function fetchPublicListingProducts(): Promise<PublicListingProduct[]> {
  return apiFetch<PublicListingProduct[]>('/listing-products', {
    skipAuth: true,
  });
}

export function fetchAdminListingProducts(): Promise<AdminListingProduct[]> {
  return apiFetch<AdminListingProduct[]>('/admin/listing-products');
}

export function fetchAdminListingProduct(
  code: string,
): Promise<AdminListingProduct> {
  return apiFetch<AdminListingProduct>(
    `/admin/listing-products/${encodeURIComponent(code)}`,
  );
}

export function createAdminListingProduct(
  input: CreateListingProductInput,
): Promise<AdminListingProduct> {
  return apiFetch<AdminListingProduct>('/admin/listing-products', {
    method: 'POST',
    body: input,
  });
}

export function updateAdminListingProduct(
  code: string,
  input: UpdateListingProductInput,
): Promise<AdminListingProduct> {
  return apiFetch<AdminListingProduct>(
    `/admin/listing-products/${encodeURIComponent(code)}`,
    { method: 'PATCH', body: input },
  );
}

export function fetchAdminListingProductHistory(
  code: string,
): Promise<AdminListingProductChange[]> {
  return apiFetch<AdminListingProductChange[]>(
    `/admin/listing-products/${encodeURIComponent(code)}/history`,
  );
}

export function archiveAdminListingProduct(
  code: string,
  reason: string,
): Promise<AdminListingProduct> {
  return apiFetch<AdminListingProduct>(
    `/admin/listing-products/${encodeURIComponent(code)}/archive`,
    { method: 'POST', body: { reason: reason.trim() } },
  );
}

export function restoreAdminListingProduct(
  code: string,
  reason: string,
): Promise<AdminListingProduct> {
  return apiFetch<AdminListingProduct>(
    `/admin/listing-products/${encodeURIComponent(code)}/restore`,
    { method: 'POST', body: { reason: reason.trim() } },
  );
}

function emptyToNull(value: string): string | null {
  return value === '' ? null : value;
}

function decimalToInteger(value: string, precision: number): number {
  const normalized = value.trim().replace(',', '.');
  const [whole = '0', fraction = ''] = normalized.split('.');
  return Number(whole) * 10 ** precision +
    Number(fraction.padEnd(precision, '0').slice(0, precision));
}

function integerToDecimal(value: number, precision: number): string {
  return (value / 10 ** precision).toFixed(precision);
}
