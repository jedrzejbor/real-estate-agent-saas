import { apiFetch } from './api-client';
import type { PaginationMeta } from './clients';

export const PublicLeadSource = {
  PUBLIC_LISTING_PAGE: 'public_listing_page',
  PUBLIC_LISTING_SHARE: 'public_listing_share',
  QR_CODE: 'qr_code',
  EMBED: 'embed',
  OTHER: 'other',
} as const;

export type PublicLeadSource =
  (typeof PublicLeadSource)[keyof typeof PublicLeadSource];

export const PublicLeadStatus = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  CONVERTED_TO_CLIENT: 'converted_to_client',
  SPAM: 'spam',
  ARCHIVED: 'archived',
} as const;

export type PublicLeadStatus =
  (typeof PublicLeadStatus)[keyof typeof PublicLeadStatus];

export const PUBLIC_LEAD_SOURCE_LABELS: Record<PublicLeadSource, string> = {
  public_listing_page: 'Strona oferty',
  public_listing_share: 'Udostępnienie',
  qr_code: 'Kod QR',
  embed: 'Widget',
  other: 'Inne',
};

export const PUBLIC_LEAD_STATUS_LABELS: Record<PublicLeadStatus, string> = {
  new: 'Nowy',
  contacted: 'Skontaktowany',
  qualified: 'Zakwalifikowany',
  converted_to_client: 'W CRM',
  spam: 'Spam',
  archived: 'Archiwum',
};

export const PUBLIC_LEAD_STATUS_BADGE_VARIANT: Record<
  PublicLeadStatus,
  'success' | 'warning' | 'info' | 'secondary' | 'destructive' | 'muted'
> = {
  new: 'info',
  contacted: 'secondary',
  qualified: 'success',
  converted_to_client: 'success',
  spam: 'destructive',
  archived: 'muted',
};

export interface PublicInquiryListing {
  id: string;
  title: string;
  publicSlug: string | null;
}

export interface PublicInquiryConvertedClient {
  id: string;
  firstName: string;
  lastName: string;
}

export interface PublicInquiry {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: PublicLeadSource;
  status: PublicLeadStatus;
  sourceUrl: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  contactConsent: boolean;
  marketingConsent: boolean;
  handledAt: string | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
  listing: PublicInquiryListing | null;
  convertedClient: PublicInquiryConvertedClient | null;
}

export interface PublicInquiryFilters {
  status?: PublicLeadStatus;
  source?: PublicLeadSource;
  listingId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'status';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedPublicInquiries {
  data: PublicInquiry[];
  meta: PaginationMeta;
}

function buildQueryString(filters: PublicInquiryFilters): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== null) {
      params.set(key, String(value));
    }
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchPublicInquiries(
  filters: PublicInquiryFilters = {},
): Promise<PaginatedPublicInquiries> {
  return apiFetch<PaginatedPublicInquiries>(
    `/public-leads${buildQueryString(filters)}`,
  );
}
