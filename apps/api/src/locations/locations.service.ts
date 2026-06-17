import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities';
import { LOCATION_CATALOG, LocationCatalogEntry } from './location-catalog';
import { SearchLocationsQueryDto } from './dto/search-locations-query.dto';
import { normalizeLocationSearch } from './locations-normalization';
import {
  PUBLIC_DISTRICT_CATALOG,
  PublicDistrictCatalogEntry,
  getPublicDistrictSearchKeys,
} from './public-district-catalog';
import { SearchDistrictsQueryDto } from './dto/search-districts-query.dto';

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

const PUBLIC_DISTRICT_LOCATION_KINDS = ['district', 'neighborhood'];

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

  async searchDistricts(
    query: SearchDistrictsQueryDto,
  ): Promise<PublicLocationSuggestion[]> {
    const limit = query.limit ?? 10;
    const normalizedCity = normalizeLocationSearch(query.city);
    const normalizedQuery = normalizeLocationSearch(query.query);

    if (!normalizedCity) {
      return [];
    }

    const databaseResults = await this.searchDistrictsDatabase(
      normalizedCity,
      normalizedQuery,
      limit,
    );

    if (databaseResults.length > 0) {
      return databaseResults;
    }

    return this.searchDistrictsFallback(
      normalizedCity,
      normalizedQuery,
      limit,
    );
  }

  private async searchDatabase(
    normalizedQuery: string | null,
    limit: number,
  ): Promise<PublicLocationSuggestion[]> {
    const qb = this.locationRepo
      .createQueryBuilder('location')
      .where('location.active = :active', { active: true })
      .take(limit);

    if (normalizedQuery) {
      qb.andWhere(
        `(location.normalizedName LIKE :prefix OR location.searchText LIKE :contains)`,
        {
          prefix: `${normalizedQuery}%`,
          contains: `%${normalizedQuery}%`,
        },
      )
        .orderBy(
          `CASE
          WHEN location.normalizedName = :exact THEN 0
          WHEN location.normalizedName LIKE :prefix THEN 1
          ELSE 2
        END`,
          'ASC',
        )
        .addOrderBy('location.priority', 'DESC')
        .addOrderBy('location.name', 'ASC');
      qb.setParameter('exact', normalizedQuery);
    } else {
      qb.orderBy('location.priority', 'DESC').addOrderBy(
        'location.name',
        'ASC',
      );
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

  private async searchDistrictsDatabase(
    normalizedCity: string,
    normalizedQuery: string | null,
    limit: number,
  ): Promise<PublicLocationSuggestion[]> {
    const qb = this.locationRepo
      .createQueryBuilder('location')
      .where('location.active = :active', { active: true })
      .andWhere('location.kind IN (:...kinds)', {
        kinds: PUBLIC_DISTRICT_LOCATION_KINDS,
      })
      .andWhere('location.parentNormalizedName = :normalizedCity', {
        normalizedCity,
      })
      .take(limit);

    if (normalizedQuery) {
      qb.andWhere(
        `(location.normalizedName LIKE :prefix OR location.searchText LIKE :contains)`,
        {
          prefix: `${normalizedQuery}%`,
          contains: `%${normalizedQuery}%`,
        },
      )
        .orderBy(
          `CASE
          WHEN location.normalizedName = :exact THEN 0
          WHEN location.normalizedName LIKE :prefix THEN 1
          ELSE 2
        END`,
          'ASC',
        )
        .addOrderBy('location.priority', 'DESC')
        .addOrderBy('location.name', 'ASC');
      qb.setParameter('exact', normalizedQuery);
    } else {
      qb.orderBy('location.priority', 'DESC').addOrderBy(
        'location.name',
        'ASC',
      );
    }

    const locations = await qb.getMany();

    return locations.map(toPublicDatabaseLocationSuggestion);
  }

  private searchDistrictsFallback(
    normalizedCity: string,
    normalizedQuery: string | null,
    limit: number,
  ): PublicLocationSuggestion[] {
    return PUBLIC_DISTRICT_CATALOG.map((entry) => ({
      entry,
      score: scoreDistrict(entry, normalizedCity, normalizedQuery),
    }))
      .filter(({ score }) => score > 0)
      .sort(
        (a, b) =>
          b.score - a.score || a.entry.name.localeCompare(b.entry.name, 'pl'),
      )
      .slice(0, limit)
      .map(({ entry }) => toPublicDistrictCatalogSuggestion(entry));
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
    label: [
      location.name,
      isDistrictLocationKind(location.kind)
        ? location.parentName
        : location.county,
      location.voivodeship,
    ]
      .filter(Boolean)
      .join(', '),
  };
}

function isDistrictLocationKind(kind: string): boolean {
  return PUBLIC_DISTRICT_LOCATION_KINDS.includes(kind);
}

function scoreDistrict(
  entry: PublicDistrictCatalogEntry,
  normalizedCity: string,
  normalizedQuery: string | null,
): number {
  if (entry.normalizedCity !== normalizedCity) {
    return 0;
  }

  if (!normalizedQuery) {
    return 100;
  }

  let bestScore = 0;

  for (const key of getPublicDistrictSearchKeys(entry)) {
    if (key === normalizedQuery) {
      bestScore = Math.max(bestScore, 1000);
      continue;
    }

    if (key.startsWith(normalizedQuery)) {
      bestScore = Math.max(bestScore, 700);
      continue;
    }

    if (key.includes(normalizedQuery)) {
      bestScore = Math.max(bestScore, 350);
    }
  }

  return bestScore;
}

function toPublicDistrictCatalogSuggestion(
  entry: PublicDistrictCatalogEntry,
): PublicLocationSuggestion {
  return {
    id: `district-${entry.normalizedCity}-${entry.normalizedName}`,
    name: entry.name,
    municipality: entry.city,
    parentName: entry.city,
    county: entry.city,
    voivodeship: entry.voivodeship,
    kind: 'district',
    kindCode: null,
    lat: entry.lat,
    lng: entry.lng,
    label: [entry.name, entry.city, entry.voivodeship].join(', '),
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
