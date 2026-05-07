import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities';
import { LOCATION_CATALOG, LocationCatalogEntry } from './location-catalog';
import { SearchLocationsQueryDto } from './dto/search-locations-query.dto';
import { normalizeLocationSearch } from './locations-normalization';

export interface PublicLocationSuggestion {
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

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
  ) {}

  async search(
    query: SearchLocationsQueryDto,
  ): Promise<PublicLocationSuggestion[]> {
    const limit = query.limit ?? 10;
    const normalizedQuery = normalizeLocationSearch(query.query);
    const databaseResults = await this.searchDatabase(normalizedQuery, limit);

    if (databaseResults.length > 0) {
      return databaseResults;
    }

    return this.searchFallbackCatalog(normalizedQuery, limit);
  }

  private async searchDatabase(
    normalizedQuery: string | null,
    limit: number,
  ): Promise<PublicLocationSuggestion[]> {
    const qb = this.locationRepo
      .createQueryBuilder('location')
      .where('location.active = :active', { active: true })
      .orderBy('location.priority', 'DESC')
      .addOrderBy('location.name', 'ASC')
      .take(limit);

    if (normalizedQuery) {
      qb.andWhere(
        `(location.normalizedName LIKE :prefix OR location.searchText LIKE :contains)`,
        {
          prefix: `${normalizedQuery}%`,
          contains: `%${normalizedQuery}%`,
        },
      ).addOrderBy(
        `CASE
          WHEN location.normalizedName = :exact THEN 0
          WHEN location.normalizedName LIKE :prefix THEN 1
          ELSE 2
        END`,
        'ASC',
      );
      qb.setParameter('exact', normalizedQuery);
    }

    const locations = await qb.getMany();

    return locations.map(toPublicDatabaseLocationSuggestion);
  }

  private searchFallbackCatalog(
    normalizedQuery: string | null,
    limit: number,
  ): PublicLocationSuggestion[] {
    const catalogResults = LOCATION_CATALOG.map((entry) => ({
      entry,
      score: scoreLocation(entry, normalizedQuery),
    }))
      .filter(({ score }) => score > 0)
      .sort(
        (a, b) =>
          b.score - a.score || a.entry.name.localeCompare(b.entry.name, 'pl'),
      )
      .slice(0, limit)
      .map(({ entry }) => toPublicCatalogLocationSuggestion(entry));

    return catalogResults;
  }
}

function toPublicDatabaseLocationSuggestion(
  location: Location,
): PublicLocationSuggestion {
  return {
    id: location.id,
    name: location.name,
    municipality: location.municipality ?? undefined,
    parentName: location.parentName ?? null,
    county: location.county ?? '',
    voivodeship: location.voivodeship,
    kind: location.kind,
    kindCode: location.kindCode ?? null,
    lat: Number(location.lat),
    lng: Number(location.lng),
    label: [location.name, location.county, location.voivodeship]
      .filter(Boolean)
      .join(', '),
  };
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

function toPublicCatalogLocationSuggestion(
  entry: LocationCatalogEntry,
): PublicLocationSuggestion {
  return {
    id: entry.id,
    name: entry.name,
    municipality: entry.municipality,
    parentName: null,
    county: entry.county,
    voivodeship: entry.voivodeship,
    kind: 'miejscowość',
    kindCode: null,
    lat: entry.lat,
    lng: entry.lng,
    label: [entry.name, entry.county, entry.voivodeship].join(', '),
  };
}
