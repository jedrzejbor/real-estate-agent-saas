import { apiFetch } from './api-client';
import {
  type AppointmentStatus,
  type AppointmentType,
} from './appointments';
import {
  type ClientSource,
  type ClientStatus,
} from './clients';
import {
  type PropertyType,
  type TransactionType,
} from './listings';

export type ReportsGroupBy = 'day' | 'week' | 'month';

export interface ReportsFilters {
  dateFrom: string;
  dateTo: string;
  groupBy: ReportsGroupBy;
  agentId?: string;
  propertyType?: PropertyType;
  transactionType?: TransactionType;
}

export interface ReportsAgentOption {
  id: string;
  label: string;
}

export interface ReportsOverviewSummary {
  newListings: number;
  activeListings: number;
  newClients: number;
  activeClients: number;
  appointments: number;
  completedAppointments: number;
  portfolioValue: number;
}

export interface ReportsOverviewMetricDelta {
  current: number;
  previous: number;
  change: number;
  changePct: number | null;
  direction: 'up' | 'down' | 'flat';
}

export interface ReportsOverviewBucket {
  key: string;
  label: string;
  newListings: number;
  newClients: number;
  appointments: number;
  completedAppointments: number;
}

export interface ReportsOverviewComparison {
  previousPeriod: {
    dateFrom: string;
    dateTo: string;
  };
  deltas: {
    newListings: ReportsOverviewMetricDelta;
    activeListings: ReportsOverviewMetricDelta;
    newClients: ReportsOverviewMetricDelta;
    activeClients: ReportsOverviewMetricDelta;
    appointments: ReportsOverviewMetricDelta;
    completedAppointments: ReportsOverviewMetricDelta;
    portfolioValue: ReportsOverviewMetricDelta;
  };
}

export interface ListingsReportSummary {
  totalListings: number;
  newListings: number;
  activatedListings: number;
  closedListings: number;
  withdrawnListings: number;
  activeListingsEnd: number;
  averageLifecycleDays: number | null;
}

export interface ListingsBreakdownItem {
  key: string;
  count: number;
  percentage: number;
  activeCount?: number;
  closedCount?: number;
  totalValue?: number;
}

export interface ListingsReportResponse {
  generatedAt: string;
  filtersApplied: {
    dateFrom: string;
    dateTo: string;
    groupBy: ReportsGroupBy;
    propertyType?: PropertyType;
    transactionType?: TransactionType;
    requestedAgentId?: string;
    effectiveAgentIds: string[];
  };
  summary: ListingsReportSummary;
  breakdowns: {
    byStatus: ListingsBreakdownItem[];
    byPropertyType: ListingsBreakdownItem[];
    byTransactionType: ListingsBreakdownItem[];
  };
  notes: string[];
}

export interface ClientsReportSummary {
  totalClients: number;
  newClients: number;
  activePipeline: number;
  negotiatingClients: number;
  wonClients: number;
  lostClients: number;
  conversionRate: number;
}

export interface ClientsBreakdownItem {
  key: string;
  count: number;
  percentage: number;
  wonCount?: number;
  lostCount?: number;
}

export interface ClientsReportResponse {
  generatedAt: string;
  filtersApplied: {
    dateFrom: string;
    dateTo: string;
    groupBy: ReportsGroupBy;
    propertyType?: PropertyType;
    transactionType?: TransactionType;
    requestedAgentId?: string;
    effectiveAgentIds: string[];
  };
  summary: ClientsReportSummary;
  breakdowns: {
    byStatus: Array<ClientsBreakdownItem & { key: ClientStatus }>;
    bySource: Array<ClientsBreakdownItem & { key: ClientSource }>;
  };
  notes: string[];
}

export interface AppointmentsReportSummary {
  totalAppointments: number;
  completedAppointments: number;
  scheduledAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  linkedToClient: number;
  linkedToListing: number;
  completionRate: number;
}

export interface AppointmentsBreakdownItem {
  key: string;
  count: number;
  percentage: number;
  linkedToClient?: number;
  linkedToListing?: number;
}

export interface AppointmentsReportResponse {
  generatedAt: string;
  filtersApplied: {
    dateFrom: string;
    dateTo: string;
    groupBy: ReportsGroupBy;
    propertyType?: PropertyType;
    transactionType?: TransactionType;
    requestedAgentId?: string;
    effectiveAgentIds: string[];
  };
  summary: AppointmentsReportSummary;
  breakdowns: {
    byStatus: Array<AppointmentsBreakdownItem & { key: AppointmentStatus }>;
    byType: Array<AppointmentsBreakdownItem & { key: AppointmentType }>;
  };
  notes: string[];
}

export interface ReportsOverviewResponse {
  generatedAt: string;
  filtersApplied: {
    dateFrom: string;
    dateTo: string;
    groupBy: ReportsGroupBy;
    propertyType?: PropertyType;
    transactionType?: TransactionType;
    requestedAgentId?: string;
    effectiveAgentIds: string[];
  };
  scope: {
    mode: 'self' | 'team';
    currentAgentId: string;
    canSelectAgent: boolean;
    availableAgents: ReportsAgentOption[];
  };
  summary: ReportsOverviewSummary;
  comparison: ReportsOverviewComparison;
  timeline: ReportsOverviewBucket[];
  notes: string[];
}

export function getDefaultReportsFilters(): ReportsFilters {
  const today = new Date();
  const dateTo = toDateInputValue(today);
  const dateFrom = new Date(today);
  dateFrom.setDate(today.getDate() - 29);

  return {
    dateFrom: toDateInputValue(dateFrom),
    dateTo,
    groupBy: 'day',
  };
}

export function parseReportsFilters(
  source: URLSearchParams | ReadonlyURLSearchParamsLike,
): ReportsFilters {
  const defaults = getDefaultReportsFilters();
  const groupBy = source.get('groupBy');

  return {
    dateFrom: source.get('dateFrom') || defaults.dateFrom,
    dateTo: source.get('dateTo') || defaults.dateTo,
    groupBy:
      groupBy === 'week' || groupBy === 'month' || groupBy === 'day'
        ? groupBy
        : defaults.groupBy,
    agentId: source.get('agentId') || undefined,
    propertyType: (source.get('propertyType') as PropertyType | null) || undefined,
    transactionType:
      (source.get('transactionType') as TransactionType | null) || undefined,
  };
}

export async function fetchReportsOverview(
  filters: ReportsFilters,
): Promise<ReportsOverviewResponse> {
  const params = new URLSearchParams();
  params.set('dateFrom', filters.dateFrom);
  params.set('dateTo', filters.dateTo);
  params.set('groupBy', filters.groupBy);

  if (filters.agentId) params.set('agentId', filters.agentId);
  if (filters.propertyType) params.set('propertyType', filters.propertyType);
  if (filters.transactionType) {
    params.set('transactionType', filters.transactionType);
  }

  return apiFetch<ReportsOverviewResponse>(`/reports/overview?${params.toString()}`);
}

export async function fetchReportsListings(
  filters: ReportsFilters,
): Promise<ListingsReportResponse> {
  const params = new URLSearchParams();
  params.set('dateFrom', filters.dateFrom);
  params.set('dateTo', filters.dateTo);
  params.set('groupBy', filters.groupBy);

  if (filters.agentId) params.set('agentId', filters.agentId);
  if (filters.propertyType) params.set('propertyType', filters.propertyType);
  if (filters.transactionType) {
    params.set('transactionType', filters.transactionType);
  }

  return apiFetch<ListingsReportResponse>(`/reports/listings?${params.toString()}`);
}

export async function fetchReportsClients(
  filters: ReportsFilters,
): Promise<ClientsReportResponse> {
  const params = new URLSearchParams();
  params.set('dateFrom', filters.dateFrom);
  params.set('dateTo', filters.dateTo);
  params.set('groupBy', filters.groupBy);

  if (filters.agentId) params.set('agentId', filters.agentId);
  if (filters.propertyType) params.set('propertyType', filters.propertyType);
  if (filters.transactionType) {
    params.set('transactionType', filters.transactionType);
  }

  return apiFetch<ClientsReportResponse>(`/reports/clients?${params.toString()}`);
}

export async function fetchReportsAppointments(
  filters: ReportsFilters,
): Promise<AppointmentsReportResponse> {
  const params = new URLSearchParams();
  params.set('dateFrom', filters.dateFrom);
  params.set('dateTo', filters.dateTo);
  params.set('groupBy', filters.groupBy);

  if (filters.agentId) params.set('agentId', filters.agentId);
  if (filters.propertyType) params.set('propertyType', filters.propertyType);
  if (filters.transactionType) {
    params.set('transactionType', filters.transactionType);
  }

  return apiFetch<AppointmentsReportResponse>(
    `/reports/appointments?${params.toString()}`,
  );
}

export function formatReportsDateRange(dateFrom: string, dateTo: string): string {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  return `${from.toLocaleDateString('pl-PL')} – ${to.toLocaleDateString('pl-PL')}`;
}

export function formatReportsDelta(
  delta: ReportsOverviewMetricDelta,
): string {
  if (delta.change === 0) {
    return 'Bez zmian vs poprzedni okres';
  }

  if (delta.changePct === null) {
    return delta.change > 0
      ? `+${delta.change} vs poprzedni okres`
      : `${delta.change} vs poprzedni okres`;
  }

  return `${delta.changePct > 0 ? '+' : ''}${delta.changePct}% vs poprzedni okres`;
}

export function getReportsDeltaTone(
  delta: ReportsOverviewMetricDelta,
): 'positive' | 'negative' | 'neutral' {
  if (delta.direction === 'flat') return 'neutral';
  return delta.direction === 'up' ? 'positive' : 'negative';
}

export function formatReportsBucketLabel(
  bucket: ReportsOverviewBucket,
): string {
  return bucket.label;
}

function toDateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type ReadonlyURLSearchParamsLike = {
  get(name: string): string | null;
};
