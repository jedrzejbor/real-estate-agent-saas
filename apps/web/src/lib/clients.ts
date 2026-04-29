import { z } from 'zod';
import { apiFetch } from './api-client';
import { AnalyticsEventName, trackAnalyticsEvent } from './analytics';

// ── Enums (mirroring backend) ──

export const ClientSource = {
  WEBSITE: 'website',
  REFERRAL: 'referral',
  PORTAL: 'portal',
  PHONE: 'phone',
  WALK_IN: 'walk_in',
  SOCIAL: 'social',
  OTHER: 'other',
} as const;

export type ClientSource = (typeof ClientSource)[keyof typeof ClientSource];

export const ClientStatus = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  ACTIVE: 'active',
  NEGOTIATING: 'negotiating',
  CLOSED_WON: 'closed_won',
  CLOSED_LOST: 'closed_lost',
  INACTIVE: 'inactive',
} as const;

export type ClientStatus = (typeof ClientStatus)[keyof typeof ClientStatus];

export const PropertyType = {
  APARTMENT: 'apartment',
  HOUSE: 'house',
  LAND: 'land',
  COMMERCIAL: 'commercial',
  OFFICE: 'office',
  GARAGE: 'garage',
} as const;

export type PropertyType = (typeof PropertyType)[keyof typeof PropertyType];

// ── Labels (Polish) ──

export const CLIENT_SOURCE_LABELS: Record<ClientSource, string> = {
  website: 'Strona www',
  referral: 'Polecenie',
  portal: 'Portal',
  phone: 'Telefon',
  walk_in: 'Wizyta osobista',
  social: 'Media społecznościowe',
  other: 'Inne',
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  new: 'Nowy',
  contacted: 'Skontaktowany',
  qualified: 'Zakwalifikowany',
  active: 'Aktywny',
  negotiating: 'Negocjacje',
  closed_won: 'Zamknięty (sukces)',
  closed_lost: 'Stracony',
  inactive: 'Nieaktywny',
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: 'Mieszkanie',
  house: 'Dom',
  land: 'Działka',
  commercial: 'Lokal użytkowy',
  office: 'Biuro',
  garage: 'Garaż',
};

export const STATUS_BADGE_VARIANT: Record<
  ClientStatus,
  'success' | 'warning' | 'info' | 'secondary' | 'destructive' | 'default'
> = {
  new: 'info',
  contacted: 'secondary',
  qualified: 'success',
  active: 'success',
  negotiating: 'warning',
  closed_won: 'default',
  closed_lost: 'destructive',
  inactive: 'destructive',
};

export const SOURCE_BADGE_VARIANT: Record<
  ClientSource,
  'brand' | 'muted' | 'info' | 'secondary' | 'default'
> = {
  website: 'brand',
  referral: 'info',
  portal: 'secondary',
  phone: 'muted',
  walk_in: 'muted',
  social: 'info',
  other: 'muted',
};

// ── Types ──

export interface ClientPreference {
  id: string;
  propertyType?: PropertyType;
  minArea?: number | string;
  maxPrice?: number | string;
  preferredCity?: string;
  minRooms?: number;
}

export interface ClientNote {
  id: string;
  content: string;
  createdAt: string;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  source: ClientSource;
  status: ClientStatus;
  budgetMin?: number | string;
  budgetMax?: number | string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  preference?: ClientPreference | null;
  clientNotes?: ClientNote[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedClients {
  data: Client[];
  meta: PaginationMeta;
}

export interface ImportClientsResult {
  imported: number;
  clients: Client[];
}

export interface ClientFilters {
  source?: ClientSource;
  status?: ClientStatus;
  budgetMin?: number;
  budgetMax?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'lastName' | 'status';
  sortOrder?: 'ASC' | 'DESC';
}

// ── Zod Schemas (frontend validation, mirrors backend DTOs) ──

export const clientPreferenceSchema = z.object({
  propertyType: z
    .enum(['apartment', 'house', 'land', 'commercial', 'office', 'garage'])
    .optional()
    .or(z.literal('')),
  minArea: z.coerce.number().min(0).optional().or(z.literal('')),
  maxPrice: z.coerce.number().min(0).optional().or(z.literal('')),
  preferredCity: z.string().max(255).optional().or(z.literal('')),
  minRooms: z.coerce.number().int().min(1).optional().or(z.literal('')),
});

export const createClientSchema = z.object({
  firstName: z
    .string()
    .min(1, 'Imię jest wymagane')
    .max(255, 'Imię może mieć maksymalnie 255 znaków'),
  lastName: z
    .string()
    .min(1, 'Nazwisko jest wymagane')
    .max(255, 'Nazwisko może mieć maksymalnie 255 znaków'),
  email: z
    .string()
    .email('Nieprawidłowy format email')
    .max(255)
    .optional()
    .or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  source: z
    .enum([
      'website',
      'referral',
      'portal',
      'phone',
      'walk_in',
      'social',
      'other',
    ])
    .optional()
    .or(z.literal('')),
  budgetMin: z.coerce.number().min(0).optional().or(z.literal('')),
  budgetMax: z.coerce.number().min(0).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  preference: clientPreferenceSchema.optional(),
});

export type CreateClientFormData = z.infer<typeof createClientSchema>;

export const createClientNoteSchema = z.object({
  content: z
    .string()
    .min(1, 'Treść notatki jest wymagana')
    .max(5000, 'Notatka może mieć maksymalnie 5000 znaków'),
});

export type CreateClientNoteFormData = z.infer<typeof createClientNoteSchema>;

// ── API Functions ──

function buildQueryString(filters: ClientFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== null) {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchClients(
  filters: ClientFilters = {},
): Promise<PaginatedClients> {
  return apiFetch<PaginatedClients>(`/clients${buildQueryString(filters)}`);
}

export async function fetchClient(id: string): Promise<Client> {
  return apiFetch<Client>(`/clients/${id}`);
}

export async function createClient(
  data: CreateClientFormData,
): Promise<Client> {
  const cleaned = cleanPayload(data);
  const client = await apiFetch<Client>('/clients', {
    method: 'POST',
    body: cleaned,
  });

  trackAnalyticsEvent({
    name: AnalyticsEventName.CLIENT_CREATED,
    properties: {
      clientId: client.id,
      source: client.source,
      status: client.status,
      hasPreference: Boolean(client.preference),
    },
  });

  return client;
}

export async function importClients(
  rows: CreateClientFormData[],
): Promise<ImportClientsResult> {
  const cleanedRows = rows.map((row) => cleanPayload(row));
  const result = await apiFetch<ImportClientsResult>('/clients/import', {
    method: 'POST',
    body: { rows: cleanedRows },
  });

  trackAnalyticsEvent({
    name: AnalyticsEventName.CLIENTS_IMPORTED,
    properties: {
      requestedRows: rows.length,
      importedRows: result.imported,
    },
  });

  return result;
}

export async function updateClient(
  id: string,
  data: Partial<CreateClientFormData> & { status?: ClientStatus },
): Promise<Client> {
  const cleaned = cleanPayload(data);
  return apiFetch<Client>(`/clients/${id}`, { method: 'PATCH', body: cleaned });
}

export async function deleteClient(id: string): Promise<void> {
  return apiFetch<void>(`/clients/${id}`, { method: 'DELETE' });
}

export async function rollbackClientStatus(id: string): Promise<Client> {
  return apiFetch<Client>(`/clients/${id}/status/rollback`, {
    method: 'POST',
  });
}

export async function fetchClientNotes(
  clientId: string,
): Promise<ClientNote[]> {
  return apiFetch<ClientNote[]>(`/clients/${clientId}/notes`);
}

export async function addClientNote(
  clientId: string,
  data: CreateClientNoteFormData,
): Promise<ClientNote> {
  return apiFetch<ClientNote>(`/clients/${clientId}/notes`, {
    method: 'POST',
    body: data,
  });
}

export async function deleteClientNote(
  clientId: string,
  noteId: string,
): Promise<void> {
  return apiFetch<void>(`/clients/${clientId}/notes/${noteId}`, {
    method: 'DELETE',
  });
}

// ── Helpers ──

/** Remove empty strings and convert numeric strings. */
function cleanPayload(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === '' || value === undefined || value === null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
      const nested = cleanPayload(value as Record<string, unknown>);
      if (Object.keys(nested).length > 0) {
        result[key] = nested;
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

/** Format price in PLN. */
export function formatBudget(
  value: number | string | undefined | null,
): string {
  if (value === undefined || value === null) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/** Format budget range. */
export function formatBudgetRange(
  min?: number | string | null,
  max?: number | string | null,
): string {
  const fMin = formatBudget(min);
  const fMax = formatBudget(max);
  if (fMin === '—' && fMax === '—') return '—';
  if (fMin === '—') return `do ${fMax}`;
  if (fMax === '—') return `od ${fMin}`;
  return `${fMin} – ${fMax}`;
}

/** Full name helper. */
export function clientFullName(
  client: Pick<Client, 'firstName' | 'lastName'>,
): string {
  return `${client.firstName} ${client.lastName}`;
}

/** Get initials for avatar. */
export function clientInitials(
  client: Pick<Client, 'firstName' | 'lastName'>,
): string {
  return `${client.firstName.charAt(0)}${client.lastName.charAt(0)}`.toUpperCase();
}

/** Format relative time in Polish. */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Dzisiaj';
  if (diffDays === 1) return 'Wczoraj';
  if (diffDays < 7) return `${diffDays} dni temu`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? 'tydzień' : weeks < 5 ? 'tygodnie' : 'tygodni'} temu`;
  }
  return date.toLocaleDateString('pl-PL');
}

/** Status transitions for client CRM pipeline. */
export interface StatusAction {
  status: ClientStatus;
  label: string;
}

export function getClientStatusActions(current: ClientStatus): StatusAction[] {
  const CS = ClientStatus;
  switch (current) {
    case CS.NEW:
      return [
        { status: CS.CONTACTED, label: 'Oznacz jako skontaktowany' },
        { status: CS.INACTIVE, label: 'Oznacz jako nieaktywny' },
      ];
    case CS.CONTACTED:
      return [
        { status: CS.QUALIFIED, label: 'Zakwalifikuj' },
        { status: CS.INACTIVE, label: 'Oznacz jako nieaktywny' },
      ];
    case CS.QUALIFIED:
      return [
        { status: CS.ACTIVE, label: 'Aktywuj klienta' },
        { status: CS.CLOSED_LOST, label: 'Oznacz jako stracony' },
      ];
    case CS.ACTIVE:
      return [
        { status: CS.NEGOTIATING, label: 'Rozpocznij negocjacje' },
        { status: CS.INACTIVE, label: 'Oznacz jako nieaktywny' },
      ];
    case CS.NEGOTIATING:
      return [
        { status: CS.CLOSED_WON, label: 'Zamknij transakcję (sukces)' },
        { status: CS.CLOSED_LOST, label: 'Oznacz jako stracony' },
        { status: CS.ACTIVE, label: 'Wróć do aktywnych' },
      ];
    case CS.CLOSED_LOST:
      return [{ status: CS.NEW, label: 'Reaktywuj jako nowy lead' }];
    case CS.INACTIVE:
      return [{ status: CS.NEW, label: 'Reaktywuj jako nowy lead' }];
    case CS.CLOSED_WON:
    default:
      return [];
  }
}
