import { apiFetch } from './api-client';

// ── Types (mirroring backend DashboardStats) ──

export interface ListingStats {
  total: number;
  active: number;
  draft: number;
  reserved: number;
  sold: number;
  rented: number;
  archived: number;
}

export interface ClientStats {
  total: number;
  new: number;
  active: number;
  negotiating: number;
  closedWon: number;
  closedLost: number;
  conversionRate: number;
}

export interface AppointmentStats {
  total: number;
  thisWeek: number;
  today: number;
  upcoming: number;
  completed: number;
  cancelled: number;
}

export interface RevenueStats {
  totalListedValue: number;
  avgPrice: number;
  soldValue: number;
  activeCommissionValue: number;
  closedCommissionValue: number;
}

export interface RecentActivity {
  id: string;
  type: 'listing' | 'client' | 'appointment';
  title: string;
  subtitle: string;
  createdAt: string;
}

export interface UpcomingAppointment {
  id: string;
  title: string;
  type: string;
  startTime: string;
  endTime: string;
  location?: string;
  clientName?: string;
}

export type DocumentAttentionKind =
  | 'missing_required'
  | 'needs_correction'
  | 'overdue'
  | 'expired';

export interface DocumentAttentionItem {
  id: string;
  kind: DocumentAttentionKind;
  listingId: string;
  listingTitle: string;
  documentId: string | null;
  documentName: string | null;
  count: number;
  dueDate: string | null;
  createdAt: string;
}

export interface DocumentAttentionStats {
  total: number;
  missingRequired: number;
  needsCorrection: number;
  overdue: number;
  expired: number;
  items: DocumentAttentionItem[];
}

export interface DashboardStats {
  listings: ListingStats;
  clients: ClientStats;
  appointments: AppointmentStats;
  revenue: RevenueStats;
  documentAttention: DocumentAttentionStats;
  recentActivity: RecentActivity[];
  upcomingAppointments: UpcomingAppointment[];
}

export type TodayItemType =
  | 'appointment'
  | 'public_lead'
  | 'document'
  | 'listing'
  | 'task';
export type TodayItemPriority = 'high' | 'medium' | 'low';
export type TodayItemEntityType =
  | 'appointment'
  | 'public_lead'
  | 'listing'
  | 'task';

export interface TodayItemAction {
  label: string;
  href: string;
}

export interface TodayItem {
  id: string;
  type: TodayItemType;
  priority: TodayItemPriority;
  title: string;
  description: string;
  entityType: TodayItemEntityType;
  entityId: string;
  href: string;
  dueAt: string | null;
  action: TodayItemAction;
}

export interface DashboardTodayResponse {
  items: TodayItem[];
  generatedAt: string;
}

export type DashboardInsightSeverity = 'info' | 'warning' | 'success';
export type DashboardInsightEntityType =
  | 'listing'
  | 'public_lead'
  | 'appointment'
  | 'pipeline';

export interface DashboardInsight {
  id: string;
  severity: DashboardInsightSeverity;
  title: string;
  description: string;
  entityType: DashboardInsightEntityType;
  entityId: string | null;
  actionLabel: string;
  actionHref: string;
  createdAt: string;
}

export interface DashboardInsightsResponse {
  insights: DashboardInsight[];
  generatedAt: string;
}

// ── API ──

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>('/dashboard/stats');
}

export async function fetchDashboardToday(): Promise<DashboardTodayResponse> {
  return apiFetch<DashboardTodayResponse>('/dashboard/today');
}

export async function fetchDashboardInsights(): Promise<DashboardInsightsResponse> {
  return apiFetch<DashboardInsightsResponse>('/insights');
}

export async function markTodayTaskDone(taskId: string): Promise<void> {
  await apiFetch(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: {
      status: 'done',
    },
  });
}

// ── Helpers ──

/** Format price in PLN (compact). */
export function formatPricePL(value: number): string {
  if (value === 0) return '0 zł';
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace('.0', '')} mln zł`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)} tys. zł`;
  }
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format relative time in Polish. */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Przed chwilą';
  if (diffMin < 60) return `${diffMin} min temu`;
  if (diffHrs < 24) return `${diffHrs} godz. temu`;
  if (diffDays === 1) return 'Wczoraj';
  if (diffDays < 7) return `${diffDays} dni temu`;
  return date.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
  });
}

/** Format appointment time for upcoming list. */
export function formatAppointmentTime(startTime: string): string {
  const date = new Date(startTime);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate();

  const time = date.toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isToday) return `Dziś, ${time}`;
  if (isTomorrow) return `Jutro, ${time}`;
  return date.toLocaleDateString('pl-PL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Activity type icon mapping key. */
export const ACTIVITY_TYPE_CONFIG: Record<
  RecentActivity['type'],
  { label: string; color: string; bg: string }
> = {
  listing: {
    label: 'Oferta',
    color: 'text-brand-emerald',
    bg: 'bg-brand-emerald-light',
  },
  client: {
    label: 'Klient',
    color: 'text-brand-gold-dark',
    bg: 'bg-brand-gold-light',
  },
  appointment: {
    label: 'Spotkanie',
    color: 'text-status-info',
    bg: 'bg-status-info-bg',
  },
};
