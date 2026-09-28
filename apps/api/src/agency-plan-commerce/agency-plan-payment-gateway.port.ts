import { AgencyPlan } from '../common/enums';
import { AgencyPlanBillingInterval } from './agency-plan-commerce.types';

export const AGENCY_PLAN_PAYMENT_GATEWAY = Symbol(
  'AGENCY_PLAN_PAYMENT_GATEWAY',
);

export interface CreateAgencyPlanSubscriptionCheckoutInput {
  quoteId: string;
  checkoutAttemptId: string;
  attemptNumber: number;
  agencyId: string;
  agencyName: string;
  buyerEmail: string;
  billingCustomerId?: string | null;
  planCode: AgencyPlan;
  planLabel: string;
  billingInterval: AgencyPlanBillingInterval;
  providerPriceReference: string;
  currency: 'PLN';
  subtotalGrossAmount: number;
  discountGrossAmount: number;
  totalGrossAmount: number;
  discountDurationBillingCycles: number | null;
  expiresAt: Date;
}

export interface CreatedAgencyPlanSubscriptionCheckout {
  provider: string;
  sessionId: string;
  checkoutUrl: string;
  subscriptionId: string | null;
  expiresAt: Date | null;
}

export interface AgencyPlanPaymentGateway {
  readonly provider: string;

  createSubscriptionCheckoutSession(
    input: CreateAgencyPlanSubscriptionCheckoutInput,
  ): Promise<CreatedAgencyPlanSubscriptionCheckout>;
}
