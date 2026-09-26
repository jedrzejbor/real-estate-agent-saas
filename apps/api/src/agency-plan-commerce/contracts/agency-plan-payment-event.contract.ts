import type { AgencyPlanPaymentEventType } from '../agency-plan-commerce.types';

/** Normalized only after a provider adapter has verified the webhook signature. */
export interface VerifiedAgencyPlanPaymentEventContract {
  provider: string;
  eventId: string;
  eventType: AgencyPlanPaymentEventType;
  quoteId: string;
  checkoutAttemptId?: string | null;
  agencyId?: string | null;
  checkoutSessionId: string;
  subscriptionId?: string | null;
  customerId?: string | null;
  amountGross?: number | null;
  currency?: string | null;
  occurredAt: Date;
  /** Sanitized provider metadata; never include secrets or payment instrument data. */
  payload?: Record<string, unknown>;
}

export interface AgencyPlanPaymentEventResultContract {
  status: 'processed' | 'ignored_duplicate' | 'ignored_stale';
  quoteId: string;
  checkoutAttemptId?: string | null;
  attemptStatus: string;
  agencyId?: string | null;
}
