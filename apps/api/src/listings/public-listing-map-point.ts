import { PublicListingMapPoint } from './public-listing.model';

export interface PublicLocationPoint {
  lat: number;
  lng: number;
}

export interface PublicListingMapPointAddress {
  city?: string | null;
  district?: string | null;
  voivodeship?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
}

export interface PublicListingMapPointInput {
  showExactAddressOnPublicPage?: boolean | null;
  address?: PublicListingMapPointAddress | null;
}

export type PublicApproximateMapPoint = PublicLocationPoint & {
  source: 'city' | 'region';
  label: string | null;
};

export const PUBLIC_DISTRICT_CENTROIDS: Record<string, PublicLocationPoint> = {
  'bydgoszcz|fordon': { lat: 53.148, lng: 18.17 },
  'bydgoszcz|srodmiescie': { lat: 53.123, lng: 18.002 },
};

const DISTRICT_PREFIX_PATTERN =
  /^(dzielnica|osiedle|os\.|rejon|okolice)\s+/i;

export function selectPublicListingMapPoint(
  input: PublicListingMapPointInput,
  fallbackLookup: (
    address: PublicListingMapPointAddress,
  ) => PublicApproximateMapPoint | null,
): PublicListingMapPoint | null {
  const address = input.address;

  if (!address) {
    return null;
  }

  if (input.showExactAddressOnPublicPage) {
    const lat = toValidLatitude(address.lat);
    const lng = toValidLongitude(address.lng);

    if (lat !== null && lng !== null) {
      return {
        lat,
        lng,
        precision: 'exact',
        source: 'exact',
        label: 'Dokładna lokalizacja',
      };
    }
  }

  const districtPoint = getPublicDistrictMapPoint(address);

  if (districtPoint) {
    return districtPoint;
  }

  const fallbackPoint = fallbackLookup(address);

  return fallbackPoint
    ? {
        ...fallbackPoint,
        precision: 'approximate',
      }
    : null;
}

export function getPublicDistrictMapPoint(
  address: PublicListingMapPointAddress,
): PublicListingMapPoint | null {
  const key = buildPublicDistrictCentroidKey(address.city, address.district);

  if (!key) {
    return null;
  }

  const point = PUBLIC_DISTRICT_CENTROIDS[key];

  return point
    ? {
        ...point,
        precision: 'approximate',
        source: 'district',
        label: formatDistrictLabel(address.district, address.city),
      }
    : null;
}

export function buildPublicDistrictCentroidKey(
  city?: string | null,
  district?: string | null,
): string | null {
  const cityKey = normalizePublicLocationKey(city);
  const districtKey = normalizePublicDistrictKey(district);

  return cityKey && districtKey ? `${cityKey}|${districtKey}` : null;
}

export function normalizePublicDistrictKey(value?: string | null): string | null {
  return normalizePublicLocationKey(
    value?.trim().replace(DISTRICT_PREFIX_PATTERN, ''),
  );
}

export function normalizePublicLocationKey(value?: string | null): string | null {
  const normalized = value
    ?.trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || null;
}

export function toValidLatitude(value?: number | string | null): number | null {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) &&
    numberValue >= -90 &&
    numberValue <= 90
    ? numberValue
    : null;
}

export function toValidLongitude(value?: number | string | null): number | null {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) &&
    numberValue >= -180 &&
    numberValue <= 180
    ? numberValue
    : null;
}

function formatDistrictLabel(
  district?: string | null,
  city?: string | null,
): string | null {
  const parts = [district?.trim(), city?.trim()].filter(
    (value): value is string => Boolean(value),
  );

  return parts.length > 0 ? parts.join(', ') : null;
}
