import { apiFetch } from './api-client';
import { AnalyticsEventName, trackAnalyticsEvent } from './analytics';

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
