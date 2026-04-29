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

function compactProperties(
  properties: AnalyticsProperties,
): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined),
  ) as Record<string, string | number | boolean | null>;
}
