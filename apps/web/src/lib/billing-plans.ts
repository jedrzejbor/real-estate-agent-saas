import { apiFetch } from './api-client';

export type AgencyPlanCode =
  | 'free'
  | 'starter'
  | 'professional'
  | 'enterprise'
  | 'custom';

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
  customBranding: boolean;
  multiUser: boolean;
  customDomain: boolean;
  apiAccess: boolean;
  dedicatedSupport: boolean;
}

export interface AdminPlan {
  code: Exclude<AgencyPlanCode, 'custom'>;
  label: string;
  description: string | null;
  priceMonthlyPln: number;
  priceYearlyPln: number;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  limits: AgencyPlanLimits;
  features: AgencyPlanFeatures;
  isPublic: boolean;
  sortOrder: number;
  billingReady: boolean;
  billingWarnings: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PublicPlan {
  code: AgencyPlanCode;
  label: string;
  description: string | null;
  priceMonthlyPln: number;
  priceYearlyPln: number;
  limits: AgencyPlanLimits;
  features: AgencyPlanFeatures;
  sortOrder: number;
}

export interface AdminAgencyListItem {
  id: string;
  name: string;
  plan: AgencyPlanCode;
  subscription: string;
  ownerId: string | null;
  planChangedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgencyPlanOverrides {
  label?: string;
  priceMonthlyPln?: number;
  priceYearlyPln?: number;
  limits?: Partial<AgencyPlanLimits>;
  features?: Partial<AgencyPlanFeatures>;
}

export interface AdminAgencyPlanResponse {
  agency: {
    id: string;
    name: string;
    plan: AgencyPlanCode;
    subscription: string;
    planChangedAt: string | null;
    limitGraceStartedAt: string | null;
    limitGraceEndsAt: string | null;
    limitGraceEnforcedAt: string | null;
  };
  planOverrides: AgencyPlanOverrides | null;
  entitlements: {
    plan: {
      code: AgencyPlanCode;
      label: string;
      status: string;
    };
    limits: AgencyPlanLimits;
    features: AgencyPlanFeatures;
  };
  usage: {
    activeListings: number;
    clients: number;
    monthlyAppointments: number;
    users: number;
  };
  limitWarnings: Array<{
    resource: keyof AgencyPlanLimits;
    usage: number;
    limit: number;
    message: string;
  }>;
}

export interface AdminLimitEnforcementAuditItem {
  id: string;
  agencyId: string | null;
  listingId: string | null;
  agentId: string;
  action: string;
  reason: string | null;
  previousStatus: unknown;
  newStatus: unknown;
  previousPublicationStatus: unknown;
  newPublicationStatus: unknown;
  planLimit: unknown;
  usageBeforeEnforcement: unknown;
  enforcedAt: string | null;
  createdAt: string;
}

export interface AdminAgencyLimitEnforcementResult {
  agencyId: string;
  status:
    | 'skipped_no_limit'
    | 'skipped_no_agents'
    | 'skipped_within_limit'
    | 'skipped_grace_active'
    | 'enforced';
  limit: number | null;
  activeListingsUsage: number;
  keptListingIds: string[];
  excessListingIds: string[];
  archivedListingIds: string[];
  unpublishedListingIds: string[];
}

export type UpdatePlanInput = Partial<
  Pick<
    AdminPlan,
    | 'label'
    | 'description'
    | 'priceMonthlyPln'
    | 'priceYearlyPln'
    | 'stripePriceIdMonthly'
    | 'stripePriceIdYearly'
    | 'limits'
    | 'features'
    | 'isPublic'
    | 'sortOrder'
  >
>;

export interface UpdateAgencyPlanInput {
  plan: AgencyPlanCode;
  planOverrides?: AgencyPlanOverrides | null;
}

export function fetchAdminPlans(): Promise<AdminPlan[]> {
  return apiFetch<AdminPlan[]>('/admin/plans');
}

export function fetchPublicPlans(): Promise<PublicPlan[]> {
  return apiFetch<PublicPlan[]>('/plans', { skipAuth: true });
}

export function updateAdminPlan(
  code: AdminPlan['code'],
  input: UpdatePlanInput,
): Promise<AdminPlan> {
  return apiFetch<AdminPlan>(`/admin/plans/${code}`, {
    method: 'PATCH',
    body: input,
  });
}

export function fetchAdminAgencies(
  search?: string,
): Promise<AdminAgencyListItem[]> {
  const params = new URLSearchParams();
  if (search?.trim()) {
    params.set('search', search.trim());
  }

  const query = params.toString();
  return apiFetch<AdminAgencyListItem[]>(
    `/admin/agencies${query ? `?${query}` : ''}`,
  );
}

export function fetchAdminAgencyPlan(
  agencyId: string,
): Promise<AdminAgencyPlanResponse> {
  return apiFetch<AdminAgencyPlanResponse>(`/admin/agencies/${agencyId}/plan`);
}

export function fetchAdminAgencyLimitEnforcements(
  agencyId: string,
  limit = 10,
): Promise<AdminLimitEnforcementAuditItem[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  return apiFetch<AdminLimitEnforcementAuditItem[]>(
    `/admin/agencies/${agencyId}/plan/enforcements?${params.toString()}`,
  );
}

export function enforceAdminAgencyLimits(
  agencyId: string,
): Promise<AdminAgencyLimitEnforcementResult> {
  return apiFetch<AdminAgencyLimitEnforcementResult>(
    `/admin/agencies/${agencyId}/plan/enforce-limits`,
    { method: 'POST' },
  );
}

export function updateAdminAgencyPlan(
  agencyId: string,
  input: UpdateAgencyPlanInput,
): Promise<AdminAgencyPlanResponse> {
  return apiFetch<AdminAgencyPlanResponse>(`/admin/agencies/${agencyId}/plan`, {
    method: 'PATCH',
    body: input,
  });
}

export function resetAdminAgencyPlanOverrides(
  agencyId: string,
): Promise<AdminAgencyPlanResponse> {
  return apiFetch<AdminAgencyPlanResponse>(
    `/admin/agencies/${agencyId}/plan/reset-overrides`,
    { method: 'POST' },
  );
}
