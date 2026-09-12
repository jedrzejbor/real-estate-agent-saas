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

export type AdminEntitlementGrantFormField =
  keyof AdminEntitlementGrantFormValues;
export type AdminEntitlementGrantFormErrors = Partial<
  Record<AdminEntitlementGrantFormField, string>
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

export function createEmptyAdminEntitlementGrantForm(): AdminEntitlementGrantFormValues {
  return {
    productType: ListingProductType.PUBLICATION,
    durationDays: '',
    reason: '',
    featuredTier: '',
    priorityWeight: '0',
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
