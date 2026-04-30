import { z } from 'zod';
import { apiFetch } from './api-client';
import { AnalyticsEventName, trackAnalyticsEvent } from './analytics';

// ── Enums (mirroring backend) ──

export const PropertyType = {
  APARTMENT: 'apartment',
  HOUSE: 'house',
  LAND: 'land',
  COMMERCIAL: 'commercial',
  OFFICE: 'office',
  GARAGE: 'garage',
} as const;

export type PropertyType = (typeof PropertyType)[keyof typeof PropertyType];

export const ListingStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  RESERVED: 'reserved',
  SOLD: 'sold',
  RENTED: 'rented',
  WITHDRAWN: 'withdrawn',
  ARCHIVED: 'archived',
} as const;

export type ListingStatus = (typeof ListingStatus)[keyof typeof ListingStatus];

export const ListingPublicationStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  UNPUBLISHED: 'unpublished',
} as const;

export type ListingPublicationStatus =
  (typeof ListingPublicationStatus)[keyof typeof ListingPublicationStatus];

export const TransactionType = {
  SALE: 'sale',
  RENT: 'rent',
} as const;

export type TransactionType =
  (typeof TransactionType)[keyof typeof TransactionType];

// ── Labels (Polish) ──

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: 'Mieszkanie',
  house: 'Dom',
  land: 'Działka',
  commercial: 'Lokal użytkowy',
  office: 'Biuro',
  garage: 'Garaż',
};

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  draft: 'Szkic',
  active: 'Aktywna',
  reserved: 'Zarezerwowana',
  sold: 'Sprzedana',
  rented: 'Wynajęta',
  withdrawn: 'Wycofana',
  archived: 'Zarchiwizowana',
};

export const LISTING_PUBLICATION_STATUS_LABELS: Record<
  ListingPublicationStatus,
  string
> = {
  draft: 'Nieopublikowana',
  published: 'Opublikowana',
  unpublished: 'Wyłączona',
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  sale: 'Sprzedaż',
  rent: 'Wynajem',
};

export const STATUS_BADGE_VARIANT: Record<
  ListingStatus,
  'success' | 'warning' | 'info' | 'secondary' | 'destructive' | 'default'
> = {
  draft: 'secondary',
  active: 'success',
  reserved: 'info',
  sold: 'default',
  rented: 'default',
  withdrawn: 'warning',
  archived: 'destructive',
};

// ── Types ──

export interface Address {
  id: string;
  street?: string;
  city: string;
  postalCode?: string;
  district?: string;
  voivodeship?: string;
  lat?: number;
  lng?: number;
}

export interface ListingImage {
  id: string;
  url: string;
  order: number;
  isPrimary: boolean;
  altText?: string;
}

export interface Listing {
  id: string;
  title: string;
  description?: string;
  propertyType: PropertyType;
  status: ListingStatus;
  transactionType: TransactionType;
  price: number | string;
  currency: string;
  areaM2?: number | string;
  plotAreaM2?: number | string;
  rooms?: number;
  bathrooms?: number;
  floor?: number;
  totalFloors?: number;
  yearBuilt?: number;
  isPremium: boolean;
  publicSlug?: string | null;
  publicationStatus: ListingPublicationStatus;
  publicTitle?: string | null;
  publicDescription?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  shareImageUrl?: string | null;
  showPriceOnPublicPage: boolean;
  showExactAddressOnPublicPage: boolean;
  estateflowBrandingEnabled: boolean;
  publishedAt?: string;
  unpublishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  address?: Address;
  images?: ListingImage[];
}

export interface PublicListingAgent {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface PublicListing {
  id: string;
  slug: string;
  publicationStatus: typeof ListingPublicationStatus.PUBLISHED;
  title: string;
  description?: string | null;
  propertyType: PropertyType;
  transactionType: TransactionType;
  price?: number | string | null;
  currency: string;
  areaM2?: number | string | null;
  plotAreaM2?: number | string | null;
  rooms?: number | null;
  bathrooms?: number | null;
  floor?: number | null;
  totalFloors?: number | null;
  yearBuilt?: number | null;
  address?: Address;
  images: ListingImage[];
  agent?: PublicListingAgent | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  shareImageUrl?: string | null;
  estateflowBrandingEnabled: boolean;
  publishedAt: string;
  updatedAt: string;
}

export interface PublicListingSitemapEntry {
  slug: string;
  updatedAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedListings {
  data: Listing[];
  meta: PaginationMeta;
}

export interface ListingFilters {
  propertyType?: PropertyType;
  status?: ListingStatus;
  transactionType?: TransactionType;
  city?: string;
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
  roomsMin?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'price' | 'createdAt' | 'areaM2';
  sortOrder?: 'ASC' | 'DESC';
}

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

export const LISTING_FIELD_VISIBILITY: Partial<
  Record<PropertyType, ListingDynamicField[]>
> = {
  apartment: [
    'areaM2',
    'rooms',
    'bathrooms',
    'floor',
    'totalFloors',
    'yearBuilt',
  ],
  house: ['areaM2', 'plotAreaM2', 'rooms', 'bathrooms', 'yearBuilt'],
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

export function shouldShowListingField(
  propertyType: PropertyType | '' | undefined,
  field: ListingDynamicField,
): boolean {
  if (!propertyType) return false;
  return LISTING_FIELD_VISIBILITY[propertyType]?.includes(field) ?? false;
}

// ── Zod Schemas (frontend validation, mirrors backend DTOs) ──

export const addressSchema = z.object({
  street: z.string().max(255).optional().or(z.literal('')),
  city: z.string().min(1, 'Miasto jest wymagane').max(255),
  postalCode: z.string().max(10).optional().or(z.literal('')),
  district: z.string().max(255).optional().or(z.literal('')),
  voivodeship: z.string().max(255).optional().or(z.literal('')),
});

export const createListingSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Tytuł jest wymagany')
      .max(255, 'Tytuł może mieć maksymalnie 255 znaków'),
    description: z.string().optional().or(z.literal('')),
    propertyType: z.enum(
      ['apartment', 'house', 'land', 'commercial', 'office', 'garage'],
      { message: 'Wybierz typ nieruchomości' },
    ),
    transactionType: z.enum(['sale', 'rent'], {
      message: 'Wybierz typ transakcji',
    }),
    price: z.coerce
      .number({ message: 'Cena musi być liczbą' })
      .positive('Cena musi być większa od zera'),
    currency: z.string().max(3).optional(),
    areaM2: z.coerce.number().positive().optional().or(z.literal('')),
    plotAreaM2: z.coerce.number().positive().optional().or(z.literal('')),
    rooms: z.coerce.number().int().min(1).max(99).optional().or(z.literal('')),
    bathrooms: z.coerce
      .number()
      .int()
      .min(0)
      .max(20)
      .optional()
      .or(z.literal('')),
    floor: z.coerce.number().int().optional().or(z.literal('')),
    totalFloors: z.coerce.number().int().optional().or(z.literal('')),
    yearBuilt: z.coerce
      .number()
      .int()
      .min(1800)
      .max(new Date().getFullYear() + 5)
      .optional()
      .or(z.literal('')),
    address: addressSchema,
  })
  .superRefine((data, ctx) => {
    if (
      (data.propertyType === PropertyType.HOUSE ||
        data.propertyType === PropertyType.LAND) &&
      (data.plotAreaM2 === '' || data.plotAreaM2 === undefined)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['plotAreaM2'],
        message: 'Powierzchnia działki jest wymagana',
      });
    }
  });

export type CreateListingFormData = z.infer<typeof createListingSchema>;

export const publicListingSettingsSchema = z.object({
  publicTitle: z.string().max(255).optional().or(z.literal('')),
  publicDescription: z.string().optional().or(z.literal('')),
  seoTitle: z.string().max(70).optional().or(z.literal('')),
  seoDescription: z.string().max(180).optional().or(z.literal('')),
  shareImageUrl: z.string().max(500).optional().or(z.literal('')),
  showPriceOnPublicPage: z.boolean().optional(),
  showExactAddressOnPublicPage: z.boolean().optional(),
});

export type PublicListingSettingsFormData = z.infer<
  typeof publicListingSettingsSchema
>;

// ── API Functions ──

function buildQueryString(filters: ListingFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== null) {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchListings(
  filters: ListingFilters = {},
): Promise<PaginatedListings> {
  return apiFetch<PaginatedListings>(`/listings${buildQueryString(filters)}`);
}

export async function fetchListing(id: string): Promise<Listing> {
  return apiFetch<Listing>(`/listings/${id}`);
}

export async function fetchPublicListing(slug: string): Promise<PublicListing> {
  return apiFetch<PublicListing>(`/listings/public/${slug}`, {
    skipAuth: true,
  });
}

export async function fetchPublicListingSitemapEntries(): Promise<
  PublicListingSitemapEntry[]
> {
  return apiFetch<PublicListingSitemapEntry[]>('/listings/public', {
    skipAuth: true,
  });
}

export async function createListing(
  data: CreateListingFormData,
): Promise<Listing> {
  // Clean empty strings to undefined
  const cleaned = cleanPayload(data);
  const listing = await apiFetch<Listing>('/listings', {
    method: 'POST',
    body: cleaned,
  });

  trackAnalyticsEvent({
    name: AnalyticsEventName.LISTING_CREATED,
    properties: {
      listingId: listing.id,
      propertyType: listing.propertyType,
      transactionType: listing.transactionType,
      status: listing.status,
    },
  });

  return listing;
}

export async function updateListing(
  id: string,
  data: Partial<CreateListingFormData> &
    Partial<PublicListingSettingsFormData> & {
      status?: ListingStatus;
    },
): Promise<Listing> {
  const cleaned = cleanPayload(data);
  return apiFetch<Listing>(`/listings/${id}`, {
    method: 'PATCH',
    body: cleaned,
  });
}

export async function updatePublicListingSettings(
  id: string,
  data: PublicListingSettingsFormData,
): Promise<Listing> {
  return apiFetch<Listing>(`/listings/${id}`, {
    method: 'PATCH',
    body: cleanPublicListingSettingsPayload(data),
  });
}

export async function publishListing(id: string): Promise<Listing> {
  const listing = await apiFetch<Listing>(`/listings/${id}/publish`, {
    method: 'POST',
  });

  trackAnalyticsEvent({
    name: AnalyticsEventName.LISTING_PUBLISHED,
    properties: {
      listingId: listing.id,
      publicSlug: listing.publicSlug ?? null,
      publicationStatus: listing.publicationStatus,
    },
  });

  return listing;
}

export async function unpublishListing(id: string): Promise<Listing> {
  const listing = await apiFetch<Listing>(`/listings/${id}/unpublish`, {
    method: 'POST',
  });

  trackAnalyticsEvent({
    name: AnalyticsEventName.LISTING_UNPUBLISHED,
    properties: {
      listingId: listing.id,
      publicSlug: listing.publicSlug ?? null,
      publicationStatus: listing.publicationStatus,
    },
  });

  return listing;
}

export async function deleteListing(id: string): Promise<void> {
  return apiFetch<void>(`/listings/${id}`, { method: 'DELETE' });
}

export async function rollbackListingStatus(id: string): Promise<Listing> {
  return apiFetch<Listing>(`/listings/${id}/status/rollback`, {
    method: 'POST',
  });
}

// ── Helpers ──

/** Remove empty strings and convert numeric strings. */
function cleanPayload(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === '' || value === undefined || value === null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
      const nested = cleanPayload(value as Record<string, unknown>);
      if (Object.keys(nested).length > 0) {
        result[key] = nested;
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

function cleanPublicListingSettingsPayload(
  data: PublicListingSettingsFormData,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );
}

/** Format price in PLN. */
export function formatPrice(price: number | string, currency = 'PLN'): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/** Format area with m² suffix. */
export function formatArea(area: number | string | undefined): string {
  if (!area) return '—';
  const num = typeof area === 'string' ? parseFloat(area) : area;
  return `${num.toLocaleString('pl-PL')} m²`;
}
