import { apiFetch } from './api-client';
import { getStoredTokens } from './auth';

export const AnalyticsEventName = {
  SIGNUP_COMPLETED: 'signup_completed',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_CHECKLIST_DISMISSED: 'onboarding_checklist_dismissed',
  ONBOARDING_CHECKLIST_RESTORED: 'onboarding_checklist_restored',
  ONBOARDING_EMPTY_STATE_SHOWN: 'onboarding_empty_state_shown',
  ONBOARDING_EMPTY_STATE_CTA_CLICKED: 'onboarding_empty_state_cta_clicked',
  LISTING_CREATED: 'listing_created',
  LISTING_PUBLISHED: 'listing_published',
  LISTING_UNPUBLISHED: 'listing_unpublished',
  PUBLIC_LISTING_VIEWED: 'public_listing_viewed',
  PUBLIC_LISTING_SHARE_CLICKED: 'public_listing_share_clicked',
  PUBLIC_LISTING_LINK_COPIED: 'public_listing_link_copied',
  PUBLIC_LISTING_ABUSE_REPORTED: 'public_listing_abuse_reported',
  PUBLIC_LEAD_SUBMITTED: 'public_lead_submitted',
  PUBLIC_LEAD_ACCEPTED: 'public_lead_accepted',
  PUBLIC_LISTING_CLAIM_STARTED: 'public_listing_claim_started',
  PUBLIC_LISTING_CLAIM_COMPLETED: 'public_listing_claim_completed',
  CLIENT_CREATED: 'client_created',
  CLIENTS_IMPORTED: 'clients_imported',
  APPOINTMENT_CREATED: 'appointment_created',
  LIMIT_WARNING_SHOWN: 'limit_warning_shown',
  LIMIT_REACHED: 'limit_reached',
  UPGRADE_CTA_CLICKED: 'upgrade_cta_clicked',
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEventName)[keyof typeof AnalyticsEventName];

export type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

interface TrackAnalyticsEventInput {
  name: AnalyticsEventName;
  properties?: AnalyticsProperties;
  path?: string;
}

export function trackAnalyticsEvent({
  name,
  properties,
  path,
}: TrackAnalyticsEventInput): void {
  if (typeof window === 'undefined' || !getStoredTokens()) {
    return;
  }

  const payload = {
    name,
    path: path ?? `${window.location.pathname}${window.location.search}`,
    properties: compactProperties(properties ?? {}),
  };

  void apiFetch('/analytics/events', {
    method: 'POST',
    body: payload,
  }).catch((error) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Analytics event failed', name, error);
    }
  });
}

export function trackPublicListingEvent({
  slug,
  name,
  properties,
  path,
}: TrackAnalyticsEventInput & { slug: string }): void {
  if (typeof window === 'undefined') {
    return;
  }

  const payload = {
    name,
    path: path ?? `${window.location.pathname}${window.location.search}`,
    properties: compactProperties({
      referrer: document.referrer || null,
      ...properties,
    }),
  };

  void apiFetch(`/analytics/public-listings/${slug}/events`, {
    method: 'POST',
    skipAuth: true,
    body: payload,
  }).catch((error) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Public listing analytics event failed', name, error);
    }
  });
}

function compactProperties(
  properties: AnalyticsProperties,
): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined),
  ) as Record<string, string | number | boolean | null>;
}
