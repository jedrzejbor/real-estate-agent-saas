import { apiFetch } from './api-client';
import { LISTING_STATUS_LABELS } from './listings';
import { CLIENT_STATUS_LABELS } from './clients';
import { APPOINTMENT_STATUS_LABELS } from './appointments';

export type SearchEntityType = 'listing' | 'client' | 'appointment';

export interface SearchResultItem {
  id: string;
  entityType: SearchEntityType;
  title: string;
  subtitle: string;
  href: string;
  status?: string;
  timestamp?: string;
}

export interface SearchResponse {
  query: string;
  total: number;
  groups: Record<SearchEntityType, SearchResultItem[]>;
}

export async function fetchGlobalSearch(
  query: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, limitPerType: '5' });
  return apiFetch<SearchResponse>(`/search?${params.toString()}`, { signal });
}

export function getSearchSectionLabel(entityType: SearchEntityType): string {
  switch (entityType) {
    case 'listing':
      return 'Oferty';
    case 'client':
      return 'Klienci';
    case 'appointment':
      return 'Spotkania';
  }
}

export function getSearchResultStatusLabel(result: SearchResultItem): string | null {
  if (!result.status) return null;

  switch (result.entityType) {
    case 'listing':
      return LISTING_STATUS_LABELS[result.status as keyof typeof LISTING_STATUS_LABELS] ?? result.status;
    case 'client':
      return CLIENT_STATUS_LABELS[result.status as keyof typeof CLIENT_STATUS_LABELS] ?? result.status;
    case 'appointment':
      return APPOINTMENT_STATUS_LABELS[result.status as keyof typeof APPOINTMENT_STATUS_LABELS] ?? result.status;
  }
}
