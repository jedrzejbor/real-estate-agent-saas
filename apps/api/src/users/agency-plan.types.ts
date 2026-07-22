import { AgencyPlan, SubscriptionStatus } from '../common/enums';

export interface AgencyPlanLimits {
  activeListings: number | null;
  clients: number | null;
  monthlyAppointments: number | null;
  users: number | null;
  imagesPerListing: number | null;
}

export interface AgencyPlanFeatures {
  reportsOverview: boolean;
  reportsListingsBasic: boolean;
  reportsClientsBasic: boolean;
  reportsAppointmentsBasic: boolean;
  publicListings: boolean;
  publicLeadForms: boolean;
  agentListingMarket: boolean;
  customBranding: boolean;
  multiUser: boolean;
  customDomain: boolean;
  apiAccess: boolean;
  dedicatedSupport: boolean;
}

export interface AgencyPlanOverrides {
  label?: string;
  priceMonthlyPln?: number;
  priceYearlyPln?: number;
  limits?: Partial<AgencyPlanLimits>;
  features?: Partial<AgencyPlanFeatures>;
}

export interface AgencyEntitlements {
  plan: {
    code: AgencyPlan;
    label: string;
    status: SubscriptionStatus;
  };
  limits: AgencyPlanLimits;
  features: AgencyPlanFeatures;
}

export interface AgencyPlanDefinition {
  code: AgencyPlan;
  label: string;
  limits: AgencyPlanLimits;
  features: AgencyPlanFeatures;
}
