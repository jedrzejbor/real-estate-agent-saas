import { createHash } from 'crypto';
import {
  GeocodeAddressInput,
  NormalizedGeocodeAddress,
} from './geocoding.types';

function normalizeAddressPart(value?: string | null): string | null {
  const normalized = value?.replace(/\s+/g, ' ').trim();
  return normalized || null;
}

export function normalizeGeocodeAddressInput(
  input: GeocodeAddressInput,
): NormalizedGeocodeAddress {
  return {
    city: normalizeAddressPart(input.city) ?? '',
    street: normalizeAddressPart(input.street) ?? '',
    district: normalizeAddressPart(input.district),
    postalCode: normalizeAddressPart(input.postalCode),
    voivodeship: normalizeAddressPart(input.voivodeship),
    country: input.country ?? 'PL',
  };
}

export function buildGeocodeQuery(address: NormalizedGeocodeAddress): string {
  return [
    address.street,
    address.district,
    address.postalCode,
    address.city,
    address.voivodeship,
    address.country,
  ]
    .filter((part): part is string => Boolean(part))
    .join(', ');
}

export function buildNormalizedGeocodeQuery(
  address: NormalizedGeocodeAddress,
): string {
  return buildGeocodeQuery(address)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function hashGeocodeQuery(provider: string, normalizedQuery: string) {
  return createHash('sha256')
    .update(`${provider}:${normalizedQuery}`)
    .digest('hex');
}
