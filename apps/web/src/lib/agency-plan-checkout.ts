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
