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

export interface GeocodeAddressInput {
  city: string;
  street: string;
  district?: string | null;
  postalCode?: string | null;
  voivodeship?: string | null;
  country?: 'PL';
}

export interface GeocodeAddressResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  precision: 'rooftop' | 'parcel' | 'street' | 'interpolated' | 'approximate';
  confidence: number;
  provider: string;
}

export interface GeocodeAddressResponse {
  query: string;
  result: GeocodeAddressResult | null;
  warning?: string;
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

export async function searchDistricts(
  city: string,
  query = '',
  limit = 10,
): Promise<LocationSuggestion[]> {
  const params = new URLSearchParams();

  params.set('city', city.trim());

  if (query.trim()) {
    params.set('query', query.trim());
  }

  params.set('limit', String(limit));

  const response = await apiFetch<SearchLocationsResponse>(
    `/locations/districts?${params.toString()}`,
    { skipAuth: true },
  );

  return response.data;
}

export async function geocodeListingAddress(
  input: GeocodeAddressInput,
): Promise<GeocodeAddressResponse> {
  return apiFetch<GeocodeAddressResponse>('/locations/geocode-address', {
    method: 'POST',
    body: {
      ...input,
      country: input.country ?? 'PL',
    },
  });
}
