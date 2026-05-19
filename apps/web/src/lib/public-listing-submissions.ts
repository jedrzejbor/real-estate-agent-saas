import { apiFetch, apiFormDataFetch } from './api-client';
import { AnalyticsEventName, trackAnalyticsEvent } from './analytics';
import type {
  ListingPublicationStatus,
  PropertyType,
  TransactionType,
} from './listings';

export interface PublicListingSubmissionImage {
  url: string;
  altText?: string | null;
  order?: number;
}

export interface CreatePublicListingSubmissionInput {
  listing: {
    title: string;
    description?: string;
    propertyType: PropertyType;
    transactionType: TransactionType;
    price: number;
    currency?: string;
    areaM2?: number;
    plotAreaM2?: number;
    rooms?: number;
    bathrooms?: number;
    floor?: number;
    totalFloors?: number;
    yearBuilt?: number;
  };
  address: {
    city: string;
    street?: string;
    postalCode?: string;
    district?: string;
    voivodeship?: string;
    lat?: number;
    lng?: number;
  };
  publicSettings?: {
    publicTitle?: string;
    publicDescription?: string;
    showExactAddressOnPublicPage?: boolean;
  };
  images?: PublicListingSubmissionImage[];
  ownerName: string;
  email: string;
  phone: string;
  agencyName?: string;
  contactConsent: boolean;
  termsConsent: boolean;
  marketingConsent?: boolean;
  consentText?: string;
  source?: 'public_wizard';
  sourceUrl?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  website?: string;
  formStartedAt?: number;
  metadata?: Record<string, unknown>;
}

export interface PublicListingSubmissionCreatedResult {
  id: string;
  status: 'pending_email_verification';
  emailMasked: string;
  expiresAt: string;
}

export interface PublicListingSubmissionImagesUploadResult {
  images: PublicListingSubmissionImage[];
}

export interface PublicListingSubmissionVerificationResult {
  id: string;
  status: 'verified';
  verifiedAt: string;
  claimToken: string;
}

export interface PublicListingSubmissionClaimResult {
  id: string;
  status: 'claimed';
  listingId: string;
  publicSlug: string | null;
  claimedAt: string;
  reviewRequired: boolean;
  moderationReasons: string[];
}

export type SellerPublicListingSubmissionStatus =
  | 'draft'
  | 'pending_email_verification'
  | 'verified'
  | 'published'
  | 'claimed'
  | 'rejected'
  | 'expired';

export interface SellerPublicListingSubmissionListItem {
  id: string;
  status: SellerPublicListingSubmissionStatus;
  title: string;
  propertyType: PropertyType;
  transactionType: TransactionType;
  price: number | null;
  currency: string;
  city: string | null;
  primaryImageUrl: string | null;
  publishedListingId: string | null;
  publishedListingSlug: string | null;
  publicationStatus: ListingPublicationStatus | null;
  createdAt: string;
  updatedAt: string;
  verifiedAt: string | null;
  publishedAt: string | null;
  unpublishedAt: string | null;
  expiresAt: string | null;
  claimedAt: string | null;
  rejectedAt: string | null;
  expiredAt: string | null;
}

export interface SellerPublicListingSubmissionDetail extends SellerPublicListingSubmissionListItem {
  listing: CreatePublicListingSubmissionInput['listing'];
  address: CreatePublicListingSubmissionInput['address'];
  publicSettings?: CreatePublicListingSubmissionInput['publicSettings'];
  images: PublicListingSubmissionImage[];
  ownerName: string;
  email: string;
  phone: string;
  agencyName: string | null;
}

export type UpdateSellerPublicListingSubmissionInput = Partial<
  Pick<
    CreatePublicListingSubmissionInput,
    | 'listing'
    | 'address'
    | 'publicSettings'
    | 'images'
    | 'ownerName'
    | 'email'
    | 'phone'
    | 'agencyName'
    | 'metadata'
  >
>;

export async function createPublicListingSubmission(
  input: CreatePublicListingSubmissionInput,
): Promise<PublicListingSubmissionCreatedResult> {
  return apiFetch<PublicListingSubmissionCreatedResult>(
    '/public-listing-submissions',
    {
      method: 'POST',
      skipAuth: true,
      body: input,
    },
  );
}

export async function createSellerPublicListingSubmission(
  input: CreatePublicListingSubmissionInput,
): Promise<PublicListingSubmissionCreatedResult> {
  return apiFetch<PublicListingSubmissionCreatedResult>(
    '/public-listing-submissions/seller',
    {
      method: 'POST',
      body: input,
    },
  );
}

export async function fetchSellerPublicListingSubmissions(): Promise<
  SellerPublicListingSubmissionListItem[]
> {
  return apiFetch<SellerPublicListingSubmissionListItem[]>(
    '/public-listing-submissions/seller',
  );
}

export async function fetchSellerPublicListingSubmission(
  id: string,
): Promise<SellerPublicListingSubmissionDetail> {
  return apiFetch<SellerPublicListingSubmissionDetail>(
    `/public-listing-submissions/seller/${id}`,
  );
}

export async function updateSellerPublicListingSubmission(
  id: string,
  input: UpdateSellerPublicListingSubmissionInput,
): Promise<SellerPublicListingSubmissionDetail> {
  return apiFetch<SellerPublicListingSubmissionDetail>(
    `/public-listing-submissions/seller/${id}`,
    {
      method: 'PATCH',
      body: input,
    },
  );
}

export async function renewSellerPublicListingSubmission(
  id: string,
): Promise<SellerPublicListingSubmissionDetail> {
  return apiFetch<SellerPublicListingSubmissionDetail>(
    `/public-listing-submissions/seller/${id}/renew`,
    {
      method: 'POST',
    },
  );
}

export async function unpublishSellerPublicListingSubmission(
  id: string,
): Promise<SellerPublicListingSubmissionDetail> {
  return apiFetch<SellerPublicListingSubmissionDetail>(
    `/public-listing-submissions/seller/${id}/unpublish`,
    {
      method: 'POST',
    },
  );
}

export async function uploadPublicListingSubmissionImages(
  files: File[],
): Promise<PublicListingSubmissionImagesUploadResult> {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));

  return apiFormDataFetch<PublicListingSubmissionImagesUploadResult>(
    '/public-listing-submissions/images',
    formData,
    {
      method: 'POST',
      skipAuth: true,
    },
  );
}

export async function verifyPublicListingSubmission(
  token: string,
): Promise<PublicListingSubmissionVerificationResult> {
  return apiFetch<PublicListingSubmissionVerificationResult>(
    '/public-listing-submissions/verify',
    {
      method: 'POST',
      skipAuth: true,
      body: { token },
    },
  );
}

export async function claimPublicListingSubmission(
  claimToken: string,
): Promise<PublicListingSubmissionClaimResult> {
  trackAnalyticsEvent({
    name: AnalyticsEventName.PUBLIC_LISTING_CLAIM_STARTED,
  });

  const result = await apiFetch<PublicListingSubmissionClaimResult>(
    '/public-listing-submissions/claim',
    {
      method: 'POST',
      body: { claimToken },
    },
  );

  trackAnalyticsEvent({
    name: AnalyticsEventName.PUBLIC_LISTING_CLAIM_COMPLETED,
    properties: {
      submissionId: result.id,
      listingId: result.listingId,
      publicSlug: result.publicSlug,
      reviewRequired: result.reviewRequired,
    },
  });

  return result;
}

export function buildClaimRedirectPath(claimToken: string): string {
  const params = new URLSearchParams({ claimToken });
  return `/dashboard/claim-listing?${params.toString()}`;
}

export function buildClaimAuthPath(
  path: '/login' | '/register',
  claimToken: string,
): string {
  const params = new URLSearchParams({ claimToken });
  return `${path}?${params.toString()}`;
}
