import { z } from 'zod';
import { apiBlobFetch, apiFetch, apiFormDataFetch } from './api-client';
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

export const ListingCommissionType = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
} as const;

export type ListingCommissionType =
  (typeof ListingCommissionType)[keyof typeof ListingCommissionType];

export const ListingDocumentCategory = {
  AGENCY_AGREEMENT: 'agency_agreement',
  LAND_AND_MORTGAGE_REGISTER: 'land_and_mortgage_register',
  OWNERSHIP_DEED: 'ownership_deed',
  NO_ARREARS_CERTIFICATE: 'no_arrears_certificate',
  COMMUNITY_DOCUMENTS: 'community_documents',
  FLOOR_PLAN: 'floor_plan',
  ENERGY_CERTIFICATE: 'energy_certificate',
  HANDOVER_PROTOCOL: 'handover_protocol',
  POWER_OF_ATTORNEY: 'power_of_attorney',
  OTHER: 'other',
} as const;

export type ListingDocumentCategory =
  (typeof ListingDocumentCategory)[keyof typeof ListingDocumentCategory];

export const ListingDocumentStatus = {
  MISSING: 'missing',
  REQUESTED: 'requested',
  UPLOADED: 'uploaded',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  NEEDS_CORRECTION: 'needs_correction',
  EXPIRED: 'expired',
} as const;

export type ListingDocumentStatus =
  (typeof ListingDocumentStatus)[keyof typeof ListingDocumentStatus];

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

export const LISTING_COMMISSION_TYPE_LABELS: Record<
  ListingCommissionType,
  string
> = {
  percentage: '% ceny',
  fixed: 'Kwota stała',
};

export const LISTING_DOCUMENT_CATEGORY_LABELS: Record<
  ListingDocumentCategory,
  string
> = {
  agency_agreement: 'Umowa pośrednictwa',
  land_and_mortgage_register: 'Księga wieczysta / numer KW',
  ownership_deed: 'Akt własności / podstawa nabycia',
  no_arrears_certificate: 'Zaświadczenie o niezaleganiu',
  community_documents: 'Dokumenty wspólnoty/spółdzielni',
  floor_plan: 'Rzut lokalu',
  energy_certificate: 'Świadectwo energetyczne',
  handover_protocol: 'Protokół zdawczo-odbiorczy',
  power_of_attorney: 'Pełnomocnictwo',
  other: 'Inne',
};

export const LISTING_DOCUMENT_STATUS_LABELS: Record<
  ListingDocumentStatus,
  string
> = {
  missing: 'Brak',
  requested: 'Oczekuje',
  uploaded: 'Dodany',
  in_review: 'Do weryfikacji',
  approved: 'Zaakceptowany',
  needs_correction: 'Wymaga poprawy',
  expired: 'Wygasł',
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
  commissionType?: ListingCommissionType | null;
  commissionValue?: number | string | null;
  commissionAmount?: number | null;
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
  showPublicViewCount: boolean;
  publishedAt?: string;
  unpublishedAt?: string | null;
  publicViewCount?: number;
  createdAt: string;
  updatedAt: string;
  address?: Address;
  images?: ListingImage[];
}

export interface ListingDocument {
  id: string;
  listingId: string;
  category: ListingDocumentCategory;
  status: ListingDocumentStatus;
  displayName: string;
  originalFilename: string | null;
  mimeType: string | null;
  fileSize: number | null;
  note: string | null;
  dueDate: string | null;
  expiresAt: string | null;
  uploadedByUserId: string | null;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListingDocumentChecklistItem {
  category: ListingDocumentCategory;
  required: boolean;
  status: ListingDocumentStatus;
  documentId: string | null;
  displayName: string;
}

export interface ListingDocumentChecklist {
  items: ListingDocumentChecklistItem[];
  summary: {
    required: number;
    approved: number;
    missing: number;
    needsCorrection: number;
    completionPct: number;
  };
}

export interface ListingDocumentsResponse {
  documents: ListingDocument[];
  checklist: ListingDocumentChecklist;
}

export interface PublicListingAgent {
  id?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  agency?: {
    id: string;
    name: string;
    logoUrl?: string | null;
  } | null;
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
  showPublicViewCount: boolean;
  publicViewCount?: number | null;
  publishedAt: string;
  updatedAt: string;
}

export interface PublicListingSitemapEntry {
  slug: string;
  updatedAt: string;
}

export const PublicListingCatalogSort = {
  NEWEST: 'newest',
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
  AREA_ASC: 'area_asc',
  AREA_DESC: 'area_desc',
} as const;

export type PublicListingCatalogSort =
  (typeof PublicListingCatalogSort)[keyof typeof PublicListingCatalogSort];

export interface PublicListingCatalogFilters {
  agentId?: string;
  city?: string;
  district?: string;
  voivodeship?: string;
  propertyType?: PropertyType;
  transactionType?: TransactionType;
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
  roomsMin?: number;
  roomsMax?: number;
  q?: string;
  sort?: PublicListingCatalogSort;
  page?: number;
  limit?: number;
  bbox?: string;
  mapLimit?: number;
}

export interface PublicListingMapPoint {
  lat: number;
  lng: number;
  precision: 'exact' | 'approximate';
}

export interface PublicListingCatalogItem {
  id: string;
  slug: string;
  title: string;
  propertyType: PropertyType;
  transactionType: TransactionType;
  price?: number | string | null;
  currency: string;
  areaM2?: number | string | null;
  plotAreaM2?: number | string | null;
  rooms?: number | null;
  address?: {
    city: string;
    district?: string | null;
    voivodeship?: string | null;
  } | null;
  primaryImage?: {
    id: string;
    url: string;
    altText?: string | null;
  } | null;
  images?: Array<{
    id: string;
    url: string;
    altText?: string | null;
  }>;
  mapPoint?: PublicListingMapPoint | null;
  imageCount: number;
  agent?: {
    id?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    agency?: {
      id: string;
      name: string;
      logoUrl?: string | null;
    } | null;
  } | null;
  publishedAt: string;
  updatedAt: string;
}

export interface PublicListingCatalogMapMarker {
  id: string;
  slug: string;
  title: string;
  price?: number | string | null;
  currency: string;
  address?: PublicListingCatalogItem['address'];
  primaryImage?: PublicListingCatalogItem['primaryImage'];
  mapPoint: PublicListingMapPoint;
}

export interface PublicListingCatalogResponse {
  data: PublicListingCatalogItem[];
  mapMarkers: PublicListingCatalogMapMarker[];
  meta: PaginationMeta & {
    sort: PublicListingCatalogSort;
    map: {
      limit: number;
      pointsTotal: number;
      pointsReturned: number;
      truncated: boolean;
      bbox?: {
        west: number;
        south: number;
        east: number;
        north: number;
      } | null;
    };
  };
}

export interface PublicAgentProfileListing {
  id: string;
  slug: string;
  title: string;
  propertyType: PropertyType;
  transactionType: TransactionType;
  price?: number | string | null;
  currency: string;
  areaM2?: number | string | null;
  plotAreaM2?: number | string | null;
  rooms?: number | null;
  address?: Address | null;
  imageUrl?: string | null;
  publishedAt: string;
}

export interface PublicAgentProfile {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  agency?: {
    id: string;
    name: string;
    address?: string | null;
    logoUrl?: string | null;
  } | null;
  listings: PublicAgentProfileListing[];
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
  lat: z.literal('').or(z.coerce.number().min(-90).max(90)).optional(),
  lng: z.literal('').or(z.coerce.number().min(-180).max(180)).optional(),
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
    commissionType: z
      .enum(['percentage', 'fixed'])
      .optional()
      .or(z.literal('')),
    commissionValue: z.literal('').or(z.coerce.number().min(0)).optional(),
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
    showPublicViewCount: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
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

    const hasCommissionType =
      data.commissionType !== '' && data.commissionType !== undefined;
    const hasCommissionValue =
      data.commissionValue !== '' && data.commissionValue !== undefined;

    if (!hasCommissionType && hasCommissionValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['commissionType'],
        message: 'Wybierz typ prowizji albo usuń wartość prowizji',
      });
    }

    if (hasCommissionType && !hasCommissionValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['commissionValue'],
        message: 'Wartość prowizji jest wymagana',
      });
    }

    if (
      data.commissionType === ListingCommissionType.PERCENTAGE &&
      typeof data.commissionValue === 'number' &&
      data.commissionValue > 100
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['commissionValue'],
        message: 'Prowizja procentowa nie może być większa niż 100%',
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
  showPublicViewCount: z.boolean().optional(),
});

export type PublicListingSettingsFormData = z.infer<
  typeof publicListingSettingsSchema
>;

// ── API Functions ──

function buildQueryString(
  filters: ListingFilters | PublicListingCatalogFilters,
): string {
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

export async function fetchPublicAgentProfile(
  agentId: string,
): Promise<PublicAgentProfile> {
  return apiFetch<PublicAgentProfile>(`/listings/public-agents/${agentId}`, {
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

export async function fetchPublicListingCatalog(
  filters: PublicListingCatalogFilters = {},
): Promise<PublicListingCatalogResponse> {
  return apiFetch<PublicListingCatalogResponse>(
    `/listings/public/catalog${buildQueryString(filters)}`,
    {
      skipAuth: true,
    },
  );
}

export async function reportPublicListingAbuse(
  slug: string,
  input: {
    reason: string;
    details?: string;
    listingId?: string;
    listingTitle?: string;
  },
): Promise<void> {
  await apiFetch(`/analytics/public-listings/${slug}/events`, {
    method: 'POST',
    skipAuth: true,
    body: {
      name: AnalyticsEventName.PUBLIC_LISTING_ABUSE_REPORTED,
      path:
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}`
          : `/oferty/${slug}`,
      properties: {
        reason: input.reason,
        details: input.details ?? null,
        listingId: input.listingId ?? null,
        listingTitle: input.listingTitle ?? null,
        referrer:
          typeof document !== 'undefined' ? document.referrer || null : null,
      },
    },
  });
}

export async function createListing(
  data: CreateListingFormData,
): Promise<Listing> {
  const cleaned = cleanListingPayload(data);
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
  const cleaned = cleanListingPayload(data);
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

export async function uploadListingImages(
  id: string,
  files: File[],
): Promise<Listing> {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));

  return apiFormDataFetch<Listing>(`/listings/${id}/images`, formData, {
    method: 'POST',
  });
}

export async function fetchListingDocuments(
  listingId: string,
): Promise<ListingDocumentsResponse> {
  return apiFetch<ListingDocumentsResponse>(
    `/listings/${listingId}/documents`,
  );
}

export async function uploadListingDocument(
  listingId: string,
  input: {
    file: File;
    category: ListingDocumentCategory;
    displayName?: string;
    status?: ListingDocumentStatus;
    note?: string;
    dueDate?: string;
    expiresAt?: string;
  },
): Promise<ListingDocument> {
  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('category', input.category);

  if (input.displayName) formData.append('displayName', input.displayName);
  if (input.status) formData.append('status', input.status);
  if (input.note) formData.append('note', input.note);
  if (input.dueDate) formData.append('dueDate', input.dueDate);
  if (input.expiresAt) formData.append('expiresAt', input.expiresAt);

  return apiFormDataFetch<ListingDocument>(
    `/listings/${listingId}/documents`,
    formData,
    { method: 'POST' },
  );
}

export async function updateListingDocument(
  listingId: string,
  documentId: string,
  input: {
    category?: ListingDocumentCategory;
    status?: ListingDocumentStatus;
    displayName?: string;
    note?: string | null;
    dueDate?: string | null;
    expiresAt?: string | null;
  },
): Promise<ListingDocument> {
  return apiFetch<ListingDocument>(
    `/listings/${listingId}/documents/${documentId}`,
    {
      method: 'PATCH',
      body: input,
    },
  );
}

export async function deleteListingDocument(
  listingId: string,
  documentId: string,
): Promise<void> {
  await apiFetch(`/listings/${listingId}/documents/${documentId}`, {
    method: 'DELETE',
  });
}

export async function downloadListingDocument(
  listingId: string,
  documentId: string,
): Promise<{ blob: Blob; filename: string | null }> {
  return apiBlobFetch(`/listings/${listingId}/documents/${documentId}/download`);
}

export async function updateListingImage(
  id: string,
  imageId: string,
  data: { altText?: string },
): Promise<Listing> {
  return apiFetch<Listing>(`/listings/${id}/images/${imageId}`, {
    method: 'PATCH',
    body: data,
  });
}

export async function setListingPrimaryImage(
  id: string,
  imageId: string,
): Promise<Listing> {
  return apiFetch<Listing>(`/listings/${id}/images/${imageId}/primary`, {
    method: 'POST',
  });
}

export async function reorderListingImages(
  id: string,
  imageIds: string[],
): Promise<Listing> {
  return apiFetch<Listing>(`/listings/${id}/images/reorder`, {
    method: 'PATCH',
    body: { imageIds },
  });
}

export async function deleteListingImage(
  id: string,
  imageId: string,
): Promise<Listing> {
  return apiFetch<Listing>(`/listings/${id}/images/${imageId}`, {
    method: 'DELETE',
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

function cleanListingPayload(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const result = cleanPayload(data);
  const hasCommissionType = Object.prototype.hasOwnProperty.call(
    data,
    'commissionType',
  );

  if (
    hasCommissionType &&
    (data.commissionType === '' || data.commissionType === null)
  ) {
    result.commissionType = null;
    result.commissionValue = null;
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

export function calculateListingCommissionAmount(
  listing: Pick<Listing, 'price' | 'commissionType' | 'commissionValue'>,
): number | null {
  const price = parseOptionalNumber(listing.price);
  const commissionValue = parseOptionalNumber(listing.commissionValue);

  if (!listing.commissionType || price === null || commissionValue === null) {
    return null;
  }

  if (listing.commissionType === ListingCommissionType.PERCENTAGE) {
    return roundMoney((price * commissionValue) / 100);
  }

  if (listing.commissionType === ListingCommissionType.FIXED) {
    return roundMoney(commissionValue);
  }

  return null;
}

export function formatListingCommission(listing: Listing): string {
  const amount =
    listing.commissionAmount ?? calculateListingCommissionAmount(listing);

  if (amount === null) {
    return 'Nie ustawiono';
  }

  return formatPrice(amount, listing.currency);
}

function parseOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Format area with m² suffix. */
export function formatArea(area: number | string | undefined): string {
  if (!area) return '—';
  const num = typeof area === 'string' ? parseFloat(area) : area;
  return `${num.toLocaleString('pl-PL')} m²`;
}
