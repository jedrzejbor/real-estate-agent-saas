import { Injectable } from '@nestjs/common';
import { LOCATION_CATALOG, LocationCatalogEntry } from './location-catalog';
import { SearchLocationsQueryDto } from './dto/search-locations-query.dto';

export interface PublicLocationSuggestion {
  id: string;
  name: string;
  municipality?: string;
  county: string;
  voivodeship: string;
  lat: number;
  lng: number;
  label: string;
}

@Injectable()
export class LocationsService {
  search(query: SearchLocationsQueryDto): PublicLocationSuggestion[] {
    const limit = query.limit ?? 10;
    const normalizedQuery = normalizeLocationSearch(query.query);

    return LOCATION_CATALOG.map((entry) => ({
      entry,
      score: scoreLocation(entry, normalizedQuery),
    }))
      .filter(({ score }) => score > 0)
      .sort(
        (a, b) =>
          b.score - a.score || a.entry.name.localeCompare(b.entry.name, 'pl'),
      )
      .slice(0, limit)
      .map(({ entry }) => toPublicLocationSuggestion(entry));
  }
}

function scoreLocation(
  entry: LocationCatalogEntry,
  normalizedQuery: string | null,
): number {
  if (!normalizedQuery) {
    return entry.priority;
  }

  const searchableParts = [
    entry.name,
    entry.municipality,
    entry.county,
    entry.voivodeship,
  ]
    .filter((part): part is string => Boolean(part))
    .map((part) => normalizeLocationSearch(part))
    .filter((part): part is string => Boolean(part));

  let bestScore = 0;

  for (const part of searchableParts) {
    if (part === normalizedQuery) {
      bestScore = Math.max(bestScore, 1000);
      continue;
    }

    if (part.startsWith(normalizedQuery)) {
      bestScore = Math.max(bestScore, 700);
      continue;
    }

    if (part.includes(normalizedQuery)) {
      bestScore = Math.max(bestScore, 350);
    }
  }

  return bestScore > 0 ? bestScore + entry.priority : 0;
}

function toPublicLocationSuggestion(
  entry: LocationCatalogEntry,
): PublicLocationSuggestion {
  return {
    id: entry.id,
    name: entry.name,
    municipality: entry.municipality,
    county: entry.county,
    voivodeship: entry.voivodeship,
    lat: entry.lat,
    lng: entry.lng,
    label: [entry.name, entry.county, entry.voivodeship].join(', '),
  };
}

function normalizeLocationSearch(value?: string | null): string | null {
  const normalized = value
    ?.trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  return normalized || null;
}
