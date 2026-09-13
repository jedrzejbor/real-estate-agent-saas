import { z } from 'zod';
import { apiFetch } from './api-client';
import type { ListingPublicationStatus, ListingStatus } from './listings';
import {
  ListingProductType,
  type ListingProductType as ListingProductTypeValue,
} from './listing-products';

export { ListingProductType } from './listing-products';

export const ListingEntitlementStatus = {
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
  CANCELLED: 'cancelled',
} as const;

export type ListingEntitlementStatus =
  (typeof ListingEntitlementStatus)[keyof typeof ListingEntitlementStatus];

export const ListingEntitlementType = {
  PUBLICATION: 'publication',
  FEATURED: 'featured',
} as const;

export type ListingEntitlementType =
  (typeof ListingEntitlementType)[keyof typeof ListingEntitlementType];

export const ListingEntitlementSource = {
  ORDER_ITEM: 'order_item',
  ADMIN_GRANT: 'admin_grant',
  MIGRATION: 'migration',
} as const;

export type ListingEntitlementSource =
  (typeof ListingEntitlementSource)[keyof typeof ListingEntitlementSource];

export const ListingPromotionDiscountType = {
  PERCENTAGE: 'percentage',
  FIXED_GROSS: 'fixed_gross',
} as const;

export type ListingPromotionDiscountType =
  (typeof ListingPromotionDiscountType)[keyof typeof ListingPromotionDiscountType];

export const ListingPromotionTargetScope = {
  ALL_PRODUCTS: 'all_products',
  PRODUCT_TYPES: 'product_types',
  PRODUCT_CODES: 'product_codes',
} as const;

export type ListingPromotionTargetScope =
  (typeof ListingPromotionTargetScope)[keyof typeof ListingPromotionTargetScope];

export interface ListingPromotionTargetRules {
  productTypes?: ListingProductTypeValue[];
  productCodes?: string[];
  minimumSubtotalGrossAmount?: number;
  [key: string]: unknown;
}

export interface AdminListingEntitlementAudit {
  grantedByUserId: string | null;
  grantedAt: string | null;
  reason: string | null;
  productType: ListingProductTypeValue | null;
  revokedByUserId: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
}

export interface AdminListingEntitlement {
  id: string;
  type: ListingEntitlementType;
  status: ListingEntitlementStatus;
  tier: string | null;
  sourceType: ListingEntitlementSource;
  orderItemId: string | null;
  startsAt: string;
  endsAt: string;
  createdAt: string | null;
  audit: AdminListingEntitlementAudit;
}

export interface AdminListingManualAdjustment {
  id: string;
  listingId: string;
  label: string;
  reason: string;
  discountType: ListingPromotionDiscountType;
  discountValue: number;
  maxDiscountGrossAmount: number | null;
  targetScope: ListingPromotionTargetScope;
  targetRules: ListingPromotionTargetRules;
  startsAt: string;
  endsAt: string;
  createdByUserId: string;
  archivedByUserId: string | null;
  archivedReason: string | null;
  archivedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminListingCommerceSummary {
  listing: {
    id: string;
    title: string;
    publicSlug: string | null;
    status: ListingStatus;
    publicationStatus: ListingPublicationStatus;
    publishedAt: string | null;
    unpublishedAt: string | null;
    expiresAt: string | null;
    isPremium: boolean;
  };
  entitlements: AdminListingEntitlement[];
  manualAdjustments: AdminListingManualAdjustment[];
}

export interface AdminEntitlementGrantFormValues {
  productType: ListingProductTypeValue;
  durationDays: string;
  reason: string;
  featuredTier: string;
  priorityWeight: string;
}

export interface GrantListingEntitlementInput {
  productType: ListingProductTypeValue;
  durationDays: number;
  reason: string;
  featuredTier?: string | null;
  priorityWeight?: number;
}

export interface RevokeListingEntitlementInput {
  reason: string;
}

export interface CreateListingManualAdjustmentInput {
  label: string;
  reason: string;
  discountType: ListingPromotionDiscountType;
  discountValue: number;
  maxDiscountGrossAmount?: number | null;
  targetScope?: ListingPromotionTargetScope;
  targetRules?: ListingPromotionTargetRules;
  startsAt?: string | null;
  endsAt: string;
}

export interface ArchiveListingManualAdjustmentInput {
  reason: string;
}

export interface AdminManualAdjustmentFormValues {
  label: string;
  reason: string;
  discountType: ListingPromotionDiscountType;
  discountPercent: string;
  discountGrossPln: string;
  maxDiscountGrossPln: string;
  startsAt: string;
  endsAt: string;
}

export type AdminEntitlementGrantFormField =
  keyof AdminEntitlementGrantFormValues;
export type AdminEntitlementGrantFormErrors = Partial<
  Record<AdminEntitlementGrantFormField, string>
>;
export type AdminManualAdjustmentFormField =
  keyof AdminManualAdjustmentFormValues;
export type AdminManualAdjustmentFormErrors = Partial<
  Record<AdminManualAdjustmentFormField, string>
>;

const integerInputSchema = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, message)
    .refine((value) => {
      const parsed = Number(value);
      return parsed >= min && parsed <= max;
    }, message);

const optionalMoneyInputSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || /^\d+(?:[.,]\d{1,2})?$/.test(value),
    'Podaj kwotę z maksymalnie 2 miejscami po przecinku',
  )
  .refine(
    (value) => value === '' || decimalToInteger(value, 2) <= 2_147_483_647,
    'Kwota jest zbyt wysoka',
  );

const optionalDateTimeSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || !Number.isNaN(new Date(value).getTime()),
    'Podaj poprawną datę',
  );

const requiredDateTimeSchema = z
  .string()
  .trim()
  .min(1, 'Data końca jest wymagana')
  .refine(
    (value) => !Number.isNaN(new Date(value).getTime()),
    'Podaj poprawną datę',
  );

const percentageSchema = z
  .string()
  .trim()
  .refine(
    (value) => /^\d+(?:[.,]\d{1,2})?$/.test(value),
    'Podaj procent z maksymalnie 2 miejscami po przecinku',
  )
  .refine(
    (value) => decimalToInteger(value, 2) >= 1,
    'Rabat musi być większy od 0',
  )
  .refine(
    (value) => decimalToInteger(value, 2) <= 10_000,
    'Rabat procentowy nie może przekraczać 100%',
  );

export const adminEntitlementGrantFormSchema = z
  .object({
    productType: z.enum([
      ListingProductType.PUBLICATION,
      ListingProductType.RENEWAL,
      ListingProductType.FEATURED,
    ]),
    durationDays: integerInputSchema(1, 3_650, 'Podaj liczbę dni od 1 do 3650'),
    reason: z
      .string()
      .trim()
      .min(3, 'Podaj powód grantu')
      .max(1_000, 'Powód może mieć maksymalnie 1000 znaków'),
    featuredTier: z
      .string()
      .trim()
      .max(50, 'Tier może mieć maksymalnie 50 znaków'),
    priorityWeight: integerInputSchema(
      0,
      1_000_000,
      'Podaj liczbę od 0 do 1000000',
    ),
  })
  .superRefine((value, context) => {
    if (value.productType === ListingProductType.FEATURED && !value.featuredTier) {
      context.addIssue({
        code: 'custom',
        path: ['featuredTier'],
        message: 'Tier jest wymagany dla wyróżnienia',
      });
    }

    if (value.productType !== ListingProductType.FEATURED && value.featuredTier) {
      context.addIssue({
        code: 'custom',
        path: ['featuredTier'],
        message: 'Tier jest dostępny tylko dla wyróżnienia',
      });
    }
  });

const adminManualAdjustmentFormSchema = z
  .object({
    label: z.string().trim().min(1, 'Etykieta jest wymagana').max(160),
    reason: z
      .string()
      .trim()
      .min(3, 'Podaj powód korekty')
      .max(1_000, 'Powód może mieć maksymalnie 1000 znaków'),
    discountType: z.enum([
      ListingPromotionDiscountType.PERCENTAGE,
      ListingPromotionDiscountType.FIXED_GROSS,
    ]),
    discountPercent: z.string(),
    discountGrossPln: z.string(),
    maxDiscountGrossPln: optionalMoneyInputSchema,
    startsAt: optionalDateTimeSchema,
    endsAt: requiredDateTimeSchema,
  })
  .superRefine((value, context) => {
    validateManualAdjustmentDiscountValue(value, context);
    if (
      value.startsAt &&
      value.endsAt &&
      new Date(value.endsAt).getTime() <= new Date(value.startsAt).getTime()
    ) {
      context.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'Data końca musi być późniejsza niż start',
      });
    }
  });

export function createEmptyAdminEntitlementGrantForm(): AdminEntitlementGrantFormValues {
  return {
    productType: ListingProductType.PUBLICATION,
    durationDays: '',
    reason: '',
    featuredTier: '',
    priorityWeight: '0',
  };
}

export function createEmptyAdminManualAdjustmentForm(): AdminManualAdjustmentFormValues {
  return {
    label: '',
    reason: '',
    discountType: ListingPromotionDiscountType.FIXED_GROSS,
    discountPercent: '',
    discountGrossPln: '',
    maxDiscountGrossPln: '',
    startsAt: '',
    endsAt: '',
  };
}

export function validateAdminEntitlementGrantForm(
  values: AdminEntitlementGrantFormValues,
): {
  data?: AdminEntitlementGrantFormValues;
  errors: AdminEntitlementGrantFormErrors;
} {
  const parsed = adminEntitlementGrantFormSchema.safeParse(values);
  if (parsed.success) return { data: parsed.data, errors: {} };

  const errors: AdminEntitlementGrantFormErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && !(field in errors)) {
      errors[field as AdminEntitlementGrantFormField] = issue.message;
    }
  }
  return { errors };
}

export function validateAdminManualAdjustmentForm(
  values: AdminManualAdjustmentFormValues,
): {
  data?: AdminManualAdjustmentFormValues;
  errors: AdminManualAdjustmentFormErrors;
} {
  const parsed = adminManualAdjustmentFormSchema.safeParse(values);
  if (parsed.success) return { data: parsed.data, errors: {} };
  return { errors: collectFormErrors(parsed.error.issues) };
}

export function toGrantListingEntitlementInput(
  values: AdminEntitlementGrantFormValues,
): GrantListingEntitlementInput {
  const parsed = adminEntitlementGrantFormSchema.parse(values);
  const isFeatured = parsed.productType === ListingProductType.FEATURED;
  return {
    productType: parsed.productType,
    durationDays: Number(parsed.durationDays),
    reason: parsed.reason,
    featuredTier: isFeatured ? parsed.featuredTier : null,
    ...(isFeatured ? { priorityWeight: Number(parsed.priorityWeight) } : {}),
  };
}

export function toCreateListingManualAdjustmentInput(
  values: AdminManualAdjustmentFormValues,
): CreateListingManualAdjustmentInput {
  const parsed = adminManualAdjustmentFormSchema.parse(values);
  return {
    label: parsed.label.trim(),
    reason: parsed.reason.trim(),
    discountType: parsed.discountType,
    discountValue:
      parsed.discountType === ListingPromotionDiscountType.PERCENTAGE
        ? decimalToInteger(parsed.discountPercent, 2)
        : decimalToInteger(parsed.discountGrossPln, 2),
    maxDiscountGrossAmount: nullableMoneyValue(parsed.maxDiscountGrossPln),
    targetScope: ListingPromotionTargetScope.ALL_PRODUCTS,
    targetRules: {},
    startsAt: nullableDateValue(parsed.startsAt),
    endsAt: new Date(parsed.endsAt).toISOString(),
  };
}

export function validateRevokeListingEntitlementReason(
  reason: string,
): string | null {
  const trimmed = reason.trim();
  if (trimmed.length < 3) return 'Podaj powód cofnięcia grantu';
  if (trimmed.length > 1_000) {
    return 'Powód może mieć maksymalnie 1000 znaków';
  }
  return null;
}

export function validateArchiveListingManualAdjustmentReason(
  reason: string,
): string | null {
  const trimmed = reason.trim();
  if (trimmed.length < 3) return 'Podaj powód archiwizacji korekty';
  if (trimmed.length > 1_000) {
    return 'Powód może mieć maksymalnie 1000 znaków';
  }
  return null;
}

export function fetchAdminListingCommerceSummary(
  listingId: string,
): Promise<AdminListingCommerceSummary> {
  return apiFetch<AdminListingCommerceSummary>(
    `/admin/listings/${encodeURIComponent(listingId)}/commerce-summary`,
  );
}

export function grantAdminListingEntitlement(
  listingId: string,
  input: GrantListingEntitlementInput,
): Promise<AdminListingEntitlement> {
  return apiFetch<AdminListingEntitlement>(
    `/admin/listings/${encodeURIComponent(listingId)}/entitlement-grants`,
    {
      method: 'POST',
      body: input,
    },
  );
}

export function revokeAdminListingEntitlement(
  listingId: string,
  entitlementId: string,
  input: RevokeListingEntitlementInput,
): Promise<AdminListingEntitlement> {
  return apiFetch<AdminListingEntitlement>(
    `/admin/listings/${encodeURIComponent(listingId)}/entitlements/${encodeURIComponent(entitlementId)}/revoke`,
    {
      method: 'POST',
      body: { reason: input.reason.trim() },
    },
  );
}

export function createAdminListingManualAdjustment(
  listingId: string,
  input: CreateListingManualAdjustmentInput,
): Promise<AdminListingManualAdjustment> {
  return apiFetch<AdminListingManualAdjustment>(
    `/admin/listings/${encodeURIComponent(listingId)}/manual-adjustments`,
    {
      method: 'POST',
      body: {
        ...input,
        label: input.label.trim(),
        reason: input.reason.trim(),
      },
    },
  );
}

export function archiveAdminListingManualAdjustment(
  listingId: string,
  adjustmentId: string,
  input: ArchiveListingManualAdjustmentInput,
): Promise<AdminListingManualAdjustment> {
  return apiFetch<AdminListingManualAdjustment>(
    `/admin/listings/${encodeURIComponent(listingId)}/manual-adjustments/${encodeURIComponent(adjustmentId)}/archive`,
    {
      method: 'POST',
      body: { reason: input.reason.trim() },
    },
  );
}

function validateManualAdjustmentDiscountValue(
  value: AdminManualAdjustmentFormValues,
  context: z.RefinementCtx,
) {
  const source =
    value.discountType === ListingPromotionDiscountType.PERCENTAGE
      ? value.discountPercent
      : value.discountGrossPln;
  const schema =
    value.discountType === ListingPromotionDiscountType.PERCENTAGE
      ? percentageSchema
      : optionalMoneyInputSchema.refine((input) => input !== '', 'Podaj kwotę');
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    context.addIssue({
      code: 'custom',
      path: [
        value.discountType === ListingPromotionDiscountType.PERCENTAGE
          ? 'discountPercent'
          : 'discountGrossPln',
      ],
      message: parsed.error.issues[0]?.message ?? 'Nieprawidłowy rabat',
    });
  }
}

function collectFormErrors<TField extends string>(
  issues: z.ZodIssue[],
): Partial<Record<TField, string>> {
  const errors: Partial<Record<TField, string>> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && !(field in errors)) {
      errors[field as TField] = issue.message;
    }
  }
  return errors;
}

function nullableMoneyValue(value: string): number | null {
  return value.trim() ? decimalToInteger(value, 2) : null;
}

function nullableDateValue(value: string): string | null {
  return value.trim() ? new Date(value).toISOString() : null;
}

function decimalToInteger(value: string, precision: number): number {
  const normalized = value.trim().replace(',', '.');
  const [whole = '0', fraction = ''] = normalized.split('.');
  return (
    Number(whole) * 10 ** precision +
    Number(fraction.padEnd(precision, '0').slice(0, precision))
  );
}
