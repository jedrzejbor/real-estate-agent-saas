import { apiFetch } from './api-client';

export interface LocationSuggestion {
  id: string;
  name: string;
  municipality?: string;
  parentName?: string | null;
  county: string;
  voivodeship: string;
  kind: string;
  kindCode?: string | null;
  lat: number;
  lng: number;
  label: string;
}

interface SearchLocationsResponse {
  data: LocationSuggestion[];
}

export async function searchLocations(
  query: string,
  limit = 10,
): Promise<LocationSuggestion[]> {
  const params = new URLSearchParams();

  if (query.trim()) {
    params.set('query', query.trim());
  }

  params.set('limit', String(limit));

  const response = await apiFetch<SearchLocationsResponse>(
    `/locations?${params.toString()}`,
    { skipAuth: true },
  );

  return response.data;
}
