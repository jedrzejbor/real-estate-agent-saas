import { apiFetch } from './api-client';
import type { AgencyPlanCode } from './billing-plans';
import type { BillingInterval } from './public-pricing';

export type AgencyPlanPromotionApplicationTiming =
  | 'initial_checkout'
  | 'next_invoice'
  | 'future_invoices';

export interface AgencyPlanQuoteDiscount {
  sourceType: 'campaign' | 'promotion_code' | 'customer_benefit';
  sourceReference: string;
  label: string;
  grossAmount: number;
  durationBillingCycles: number;
  applicationTiming: AgencyPlanPromotionApplicationTiming;
}

export interface AgencyPlanQuote {
  quoteId: string;
  planCode: AgencyPlanCode;
  planLabel: string;
  billingInterval: BillingInterval;
  currency: 'PLN';
  quotedAt: string;
  expiresAt: string;
  subtotalGrossAmount: number;
  discountGrossAmount: number;
  totalGrossAmount: number;
  discounts: AgencyPlanQuoteDiscount[];
}

export interface CreateAgencyPlanQuoteInput {
  planCode: Exclude<AgencyPlanCode, 'custom'>;
  billingInterval: BillingInterval;
  promotionCode?: string;
}

export interface AgencyPlanCheckoutAttempt {
  quoteId: string;
  checkoutAttemptId: string;
  status: string;
  checkoutUrl: string;
  amountGross: number;
  currency: 'PLN';
  expiresAt: string;
}

/** Mirrors the server's 35-minute guard; the API remains authoritative. */
export function canStartAgencyPlanCheckout(
  quote: AgencyPlanQuote,
  now = new Date(),
): boolean {
  return new Date(quote.expiresAt).getTime() - now.getTime() >= 35 * 60 * 1000;
}

export function createAgencyPlanCheckoutAttempt(
  quoteId: string,
): Promise<AgencyPlanCheckoutAttempt> {
  return apiFetch<AgencyPlanCheckoutAttempt>('/agency-plan-checkout/attempts', {
    method: 'POST',
    body: { quoteId },
  });
}

export function createAgencyPlanQuote(
  input: CreateAgencyPlanQuoteInput,
): Promise<AgencyPlanQuote> {
  const promotionCode = input.promotionCode?.trim();
  return apiFetch<AgencyPlanQuote>('/agency-plan-checkout/quote', {
    method: 'POST',
    skipAuth: true,
    body: {
      planCode: input.planCode,
      billingInterval: input.billingInterval,
      ...(promotionCode ? { promotionCode } : {}),
    },
  });
}
