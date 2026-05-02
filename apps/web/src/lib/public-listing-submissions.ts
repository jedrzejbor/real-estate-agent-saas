import { apiFetch, apiFormDataFetch } from './api-client';
import { AnalyticsEventName, trackAnalyticsEvent } from './analytics';
import type { PropertyType, TransactionType } from './listings';

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
