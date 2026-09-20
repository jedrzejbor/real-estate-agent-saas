import type { AgencyPlan } from '../../common/enums';
import type {
  AgencyPlanBillingInterval,
  AgencyPlanPromotionApplicationTiming,
  AgencyPlanPromotionDiscountSourceType,
} from '../agency-plan-commerce.types';

export interface AgencyPlanQuoteRequestContract {
  planCode: AgencyPlan;
  billingInterval: AgencyPlanBillingInterval;
  promotionCode?: string;
}

export interface AgencyPlanQuoteDiscountContract {
  sourceType: AgencyPlanPromotionDiscountSourceType;
  /** Opaque internal reference persisted in the snapshot, never trusted from the client. */
  sourceReference: string;
  label: string;
  grossAmount: number;
  durationBillingCycles: number;
  applicationTiming: AgencyPlanPromotionApplicationTiming;
}

export interface AgencyPlanQuoteContract {
  quoteId: string;
  planCode: AgencyPlan;
  planLabel: string;
  billingInterval: AgencyPlanBillingInterval;
  currency: 'PLN';
  quotedAt: string;
  expiresAt: string;
  subtotalGrossAmount: number;
  discountGrossAmount: number;
  totalGrossAmount: number;
  discounts: AgencyPlanQuoteDiscountContract[];
}

export interface AgencyPlanCheckoutAttemptContract {
  quoteId: string;
  quoteStatus: string;
  checkoutAttemptId: string;
  attemptNumber: number;
  status: string;
  provider: string;
  sessionId: string;
  checkoutUrl: string;
  subscriptionId: string | null;
  amountGross: number;
  currency: 'PLN';
  expiresAt: string;
}
