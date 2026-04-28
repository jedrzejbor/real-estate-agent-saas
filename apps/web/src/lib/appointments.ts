import { z } from 'zod';
import { apiFetch } from './api-client';

// ── Enums (mirroring backend) ──

export const AppointmentType = {
  VIEWING: 'viewing',
  NEGOTIATION: 'negotiation',
  SIGNING: 'signing',
  CONSULTATION: 'consultation',
  OTHER: 'other',
} as const;

export type AppointmentType =
  (typeof AppointmentType)[keyof typeof AppointmentType];

export const AppointmentStatus = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const;

export type AppointmentStatus =
  (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

// ── Labels (Polish) ──

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  viewing: 'Prezentacja',
  negotiation: 'Negocjacje',
  signing: 'Podpisanie umowy',
  consultation: 'Konsultacja',
  other: 'Inne',
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Zaplanowane',
  completed: 'Zakończone',
  cancelled: 'Anulowane',
  no_show: 'Nieobecność',
};

export const TYPE_COLORS: Record<AppointmentType, string> = {
  viewing: 'bg-blue-100 text-blue-800 border-blue-200',
  negotiation: 'bg-amber-100 text-amber-800 border-amber-200',
  signing: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  consultation: 'bg-purple-100 text-purple-800 border-purple-200',
  other: 'bg-gray-100 text-gray-800 border-gray-200',
};

export const STATUS_BADGE_VARIANT: Record<
  AppointmentStatus,
  'success' | 'warning' | 'info' | 'secondary' | 'destructive' | 'default'
> = {
  scheduled: 'info',
  completed: 'success',
  cancelled: 'destructive',
  no_show: 'warning',
};

// ── Types ──

export interface AppointmentClient {
  id: string;
  firstName: string;
  lastName: string;
}

export interface AppointmentListing {
  id: string;
  title: string;
}

export interface Appointment {
  id: string;
  title: string;
  type: AppointmentType;
  status: AppointmentStatus;
  startTime: string;
  endTime: string;
  location?: string;
  notes?: string;
  createdAt: string;
  agentId: string;
  clientId?: string;
  listingId?: string;
  client?: AppointmentClient | null;
  listing?: AppointmentListing | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedAppointments {
  data: Appointment[];
  meta: PaginationMeta;
}

export interface AppointmentFilters {
  type?: AppointmentType;
  status?: AppointmentStatus;
  clientId?: string;
  listingId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'startTime' | 'createdAt' | 'title';
  sortOrder?: 'ASC' | 'DESC';
}

// ── Zod Schemas ──

export const createAppointmentSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Tytuł jest wymagany')
      .max(255, 'Tytuł może mieć maksymalnie 255 znaków'),
    type: z
      .enum(['viewing', 'negotiation', 'signing', 'consultation', 'other'])
      .optional()
      .or(z.literal('')),
    startTime: z.string().min(1, 'Data rozpoczęcia jest wymagana'),
    endTime: z.string().min(1, 'Data zakończenia jest wymagana'),
    location: z.string().max(500).optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
    clientId: z.string().optional().or(z.literal('')),
    listingId: z.string().optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      if (!data.startTime || !data.endTime) return true;
      return new Date(data.endTime) > new Date(data.startTime);
    },
    {
      message: 'Data zakończenia musi być późniejsza niż data rozpoczęcia',
      path: ['endTime'],
    },
  );

export type CreateAppointmentFormData = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = z.object({
  title: z.string().max(255).optional().or(z.literal('')),
  type: z
    .enum(['viewing', 'negotiation', 'signing', 'consultation', 'other'])
    .optional()
    .or(z.literal('')),
  status: z
    .enum(['scheduled', 'completed', 'cancelled', 'no_show'])
    .optional()
    .or(z.literal('')),
  startTime: z.string().optional().or(z.literal('')),
  endTime: z.string().optional().or(z.literal('')),
  location: z.string().max(500).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  clientId: z.string().optional().or(z.literal('')),
  listingId: z.string().optional().or(z.literal('')),
});

export type UpdateAppointmentFormData = z.infer<typeof updateAppointmentSchema>;

// ── API Functions ──

function buildQueryString(filters: AppointmentFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== null) {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchAppointments(
  filters: AppointmentFilters = {},
): Promise<PaginatedAppointments> {
  return apiFetch<PaginatedAppointments>(
    `/appointments${buildQueryString(filters)}`,
  );
}

export async function fetchAppointment(id: string): Promise<Appointment> {
  return apiFetch<Appointment>(`/appointments/${id}`);
}

export async function createAppointment(
  data: CreateAppointmentFormData,
): Promise<Appointment> {
  const cleaned = cleanPayload(data);
  return apiFetch<Appointment>('/appointments', {
    method: 'POST',
    body: cleaned,
  });
}

export async function updateAppointment(
  id: string,
  data: UpdateAppointmentFormData,
): Promise<Appointment> {
  const cleaned = cleanPayload(data);
  return apiFetch<Appointment>(`/appointments/${id}`, {
    method: 'PATCH',
    body: cleaned,
  });
}

export async function deleteAppointment(id: string): Promise<void> {
  return apiFetch<void>(`/appointments/${id}`, { method: 'DELETE' });
}

// ── Helpers ──

function cleanPayload(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === '' || value === undefined || value === null) continue;
    result[key] = value;
  }
  return result;
}

/** Build local date key: "YYYY-MM-DD" */
export function toLocalDateKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Format date for display: "12 kwi 2025" */
export function formatAppointmentDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Format time only: "14:30" */
export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format time range: "14:30 – 15:30" */
export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** Format date as day header: "Poniedziałek, 12 kwietnia 2025" */
export function formatDayHeader(date: Date): string {
  return date.toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Check if a date is today. */
export function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/** Get start/end of month for calendar range queries. */
export function getMonthRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

/** Get start/end of week (Monday-based). */
export function getWeekRange(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

/** Group appointments by date key "YYYY-MM-DD". */
export function groupByDate(
  appointments: Appointment[],
): Map<string, Appointment[]> {
  const groups = new Map<string, Appointment[]>();
  for (const appt of appointments) {
    const key = toLocalDateKey(appt.startTime);
    const existing = groups.get(key) || [];
    existing.push(appt);
    groups.set(key, existing);
  }
  return groups;
}

/** Get calendar grid days for a month (includes padding from prev/next months). */
export function getCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  // Pad start (Monday-based)
  let startDow = firstDay.getDay();
  if (startDow === 0) startDow = 7;
  for (let i = startDow - 1; i > 0; i--) {
    days.push(new Date(year, month, 1 - i));
  }

  // Month days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  // Pad end to complete 6 rows
  while (days.length < 42) {
    days.push(new Date(year, month + 1, days.length - lastDay.getDate() - (startDow - 1) + 1));
  }

  return days;
}
