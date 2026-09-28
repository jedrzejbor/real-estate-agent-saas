import type { AgencyPlan } from '../common/enums';

export enum AgencyPlanBillingInterval {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum AgencyPlanPromotionStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

export enum AgencyPlanPromotionDiscountType {
  PERCENTAGE = 'percentage',
  FIXED_GROSS = 'fixed_gross',
}

export enum AgencyPlanPromotionTargetScope {
  ALL_PLANS = 'all_plans',
  PLAN_CODES = 'plan_codes',
  BILLING_INTERVALS = 'billing_intervals',
}

export enum AgencyPlanPromotionApplicationTiming {
  INITIAL_CHECKOUT = 'initial_checkout',
  NEXT_INVOICE = 'next_invoice',
  FUTURE_INVOICES = 'future_invoices',
}

export enum AgencyPlanPromotionReservationStatus {
  RESERVED = 'reserved',
  APPLIED = 'applied',
  RELEASED = 'released',
  EXPIRED = 'expired',
}

export enum AgencyPlanQuoteStatus {
  QUOTED = 'quoted',
  RESERVED = 'reserved',
  APPLIED = 'applied',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum AgencyPlanCheckoutAttemptStatus {
  CREATING = 'creating',
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum AgencyPlanPaymentEventType {
  CHECKOUT_COMPLETED = 'checkout_completed',
  CHECKOUT_FAILED = 'checkout_failed',
  CHECKOUT_EXPIRED = 'checkout_expired',
}

export type AgencyPlanPromotionDiscountSourceType =
  | 'campaign'
  | 'promotion_code'
  | 'customer_benefit';

export interface AgencyPlanPromotionTargetRules {
  planCodes?: AgencyPlan[];
  billingIntervals?: AgencyPlanBillingInterval[];
  minimumSubtotalGrossAmount?: number;
}

export interface AgencyPlanQuoteDiscountSnapshot {
  sourceType: AgencyPlanPromotionDiscountSourceType;
  sourceReference: string;
  label: string;
  grossAmount: number;
  durationBillingCycles: number;
  applicationTiming: AgencyPlanPromotionApplicationTiming;
}
