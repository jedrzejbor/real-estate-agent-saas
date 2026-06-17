import { ServiceUnavailableException } from '@nestjs/common';
import {
  GeocodingPrecision,
  GeocodingProvider,
  GeocodingResponse,
  NormalizedGeocodeAddress,
} from './geocoding.types';
import { buildGeocodeQuery } from './geocoding-normalization';

interface GoogleGeocodingResponse {
  status: string;
  error_message?: string;
  results?: GoogleGeocodingResult[];
}

interface GoogleGeocodingResult {
  formatted_address?: string;
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
    location_type?: string;
  };
  partial_match?: boolean;
}

export class GoogleGeocodingProvider implements GeocodingProvider {
  readonly name = 'google';

  constructor(
    private readonly apiKey: string,
    private readonly timeoutMs: number,
  ) {}

  async geocode(
    address: NormalizedGeocodeAddress,
  ): Promise<GeocodingResponse> {
    const query = buildGeocodeQuery(address);
    const params = new URLSearchParams({
      address: query,
      key: this.apiKey,
      region: 'pl',
      language: 'pl',
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
        { signal: controller.signal },
      );

      if (!response.ok) {
        throw new ServiceUnavailableException('Geocoder provider failed');
      }

      return mapGoogleGeocodingResponse(query, await response.json());
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException('Geocoder provider unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function mapGoogleGeocodingResponse(
  query: string,
  payload: GoogleGeocodingResponse,
): GeocodingResponse {
  if (payload.status === 'ZERO_RESULTS') {
    return {
      query,
      result: null,
      warning: 'Nie znaleziono adresu.',
    };
  }

  if (payload.status !== 'OK') {
    throw new ServiceUnavailableException('Geocoder provider failed');
  }

  const firstResult = payload.results?.[0];
  const lat = Number(firstResult?.geometry?.location?.lat);
  const lng = Number(firstResult?.geometry?.location?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return {
      query,
      result: null,
      warning: 'Geocoder nie zwrócił poprawnego punktu.',
    };
  }

  const precision = mapGoogleLocationType(
    firstResult?.geometry?.location_type,
  );
  const confidence = getGoogleResultConfidence(
    precision,
    Boolean(firstResult?.partial_match),
  );

  return {
    query,
    result: {
      lat,
      lng,
      formattedAddress: firstResult?.formatted_address ?? query,
      precision,
      confidence,
      provider: 'google',
    },
    warning:
      precision === 'rooftop' && confidence >= 0.9
        ? undefined
        : 'Wynik geokodowania wymaga weryfikacji.',
  };
}

function mapGoogleLocationType(locationType?: string): GeocodingPrecision {
  switch (locationType) {
    case 'ROOFTOP':
      return 'rooftop';
    case 'RANGE_INTERPOLATED':
      return 'interpolated';
    case 'GEOMETRIC_CENTER':
      return 'street';
    default:
      return 'approximate';
  }
}

function getGoogleResultConfidence(
  precision: GeocodingPrecision,
  partialMatch: boolean,
): number {
  const baseConfidence =
    precision === 'rooftop'
      ? 0.95
      : precision === 'interpolated'
        ? 0.75
        : precision === 'street'
          ? 0.6
          : 0.4;

  return partialMatch ? Math.max(baseConfidence - 0.25, 0.1) : baseConfidence;
}
