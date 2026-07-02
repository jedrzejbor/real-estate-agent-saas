import { apiFetch } from './api-client';
import { hasCookieConsent, readStoredCookieConsent } from './cookie-consent';

export const AnalyticsEventName = {
  SIGNUP_COMPLETED: 'signup_completed',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_CHECKLIST_DISMISSED: 'onboarding_checklist_dismissed',
  ONBOARDING_CHECKLIST_RESTORED: 'onboarding_checklist_restored',
  ONBOARDING_EMPTY_STATE_SHOWN: 'onboarding_empty_state_shown',
  ONBOARDING_EMPTY_STATE_CTA_CLICKED: 'onboarding_empty_state_cta_clicked',
  LISTING_CREATED: 'listing_created',
  LISTING_RETENTION_CHOICES_OPENED: 'listing_retention_choices_opened',
  LISTING_RETENTION_CHOICES_SAVED: 'listing_retention_choices_saved',
  LISTING_ADDRESS_GEOCODING_REQUESTED: 'listing_address_geocoding_requested',
  LISTING_ADDRESS_GEOCODING_SUCCEEDED: 'listing_address_geocoding_succeeded',
  LISTING_ADDRESS_GEOCODING_FAILED: 'listing_address_geocoding_failed',
  LISTING_PUBLISHED: 'listing_published',
  LISTING_UNPUBLISHED: 'listing_unpublished',
  PUBLIC_LISTING_VIEWED: 'public_listing_viewed',
  PUBLIC_LISTING_SHARE_CLICKED: 'public_listing_share_clicked',
  PUBLIC_LISTING_LINK_COPIED: 'public_listing_link_copied',
  PUBLIC_LISTING_GALLERY_OPENED: 'public_listing_gallery_opened',
  PUBLIC_LISTING_GALLERY_IMAGE_VIEWED: 'public_listing_gallery_image_viewed',
  PUBLIC_LISTING_CATALOG_RESULT_CLICKED:
    'public_listing_catalog_result_clicked',
  PUBLIC_LISTING_MAP_SEARCH_USED: 'public_listing_map_search_used',
  PUBLIC_LISTING_ABUSE_REPORTED: 'public_listing_abuse_reported',
  PUBLIC_LEAD_SUBMITTED: 'public_lead_submitted',
  PUBLIC_LEAD_ACCEPTED: 'public_lead_accepted',
  PUBLIC_LISTING_CLAIM_STARTED: 'public_listing_claim_started',
  PUBLIC_LISTING_CLAIM_COMPLETED: 'public_listing_claim_completed',
  BLOG_ARTICLE_VIEWED: 'blog_article_viewed',
  BLOG_CTA_CLICKED: 'blog_cta_clicked',
  CLIENT_CREATED: 'client_created',
  CLIENTS_IMPORTED: 'clients_imported',
  APPOINTMENT_CREATED: 'appointment_created',
  DASHBOARD_TODAY_VIEWED: 'dashboard_today_viewed',
  MESSAGE_TEMPLATE_RENDERED: 'message_template_rendered',
  MESSAGE_TEMPLATE_COPIED: 'message_template_copied',
  OWNER_REPORT_VIEWED: 'owner_report_viewed',
  OWNER_REPORT_LINK_COPIED: 'owner_report_link_copied',
  OWNER_REPORT_SUMMARY_COPIED: 'owner_report_summary_copied',
  NOTIFICATION_CENTER_OPENED: 'notification_center_opened',
  NOTIFICATION_MARKED_READ: 'notification_marked_read',
  NOTIFICATION_NAVIGATED: 'notification_navigated',
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
  if (typeof window === 'undefined' || !canTrackAnalyticsEvent(name)) {
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
  if (typeof window === 'undefined' || !canTrackAnalyticsEvent(name)) {
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

export function trackPublicBlogEvent({
  slug,
  name,
  properties,
  path,
}: TrackAnalyticsEventInput & { slug: string }): void {
  if (typeof window === 'undefined' || !canTrackAnalyticsEvent(name)) {
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

  void apiFetch(`/analytics/public-blog/${slug}/events`, {
    method: 'POST',
    skipAuth: true,
    body: payload,
  }).catch((error) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Public blog analytics event failed', name, error);
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

function canTrackAnalyticsEvent(name: AnalyticsEventName): boolean {
  if (isOperationalAnalyticsEvent(name)) {
    return true;
  }

  return hasCookieConsent(readStoredCookieConsent(), 'analytics');
}

function isOperationalAnalyticsEvent(name: AnalyticsEventName): boolean {
  return [
    AnalyticsEventName.PUBLIC_LISTING_ABUSE_REPORTED,
    AnalyticsEventName.LISTING_ADDRESS_GEOCODING_REQUESTED,
    AnalyticsEventName.LISTING_ADDRESS_GEOCODING_SUCCEEDED,
    AnalyticsEventName.LISTING_ADDRESS_GEOCODING_FAILED,
  ].some((eventName) => eventName === name);
}
