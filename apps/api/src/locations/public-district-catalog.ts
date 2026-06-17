import { normalizeLocationSearch } from './locations-normalization';

export interface PublicDistrictCatalogEntry {
  city: string;
  name: string;
  normalizedCity: string;
  normalizedName: string;
  voivodeship: string;
  lat: number;
  lng: number;
  aliases: string[];
}

export const PUBLIC_DISTRICT_CATALOG: PublicDistrictCatalogEntry[] = [
  {
    city: 'Bydgoszcz',
    name: 'Fordon',
    normalizedCity: 'bydgoszcz',
    normalizedName: 'fordon',
    voivodeship: 'kujawsko-pomorskie',
    lat: 53.148,
    lng: 18.17,
    aliases: [],
  },
  {
    city: 'Bydgoszcz',
    name: 'Śródmieście',
    normalizedCity: 'bydgoszcz',
    normalizedName: 'srodmiescie',
    voivodeship: 'kujawsko-pomorskie',
    lat: 53.123,
    lng: 18.002,
    aliases: ['centrum', 'srodmiescie', 'śródmieście'],
  },
];

export const PUBLIC_DISTRICT_CENTROIDS = PUBLIC_DISTRICT_CATALOG.reduce<
  Record<string, { lat: number; lng: number }>
>((centroids, district) => {
  centroids[`${district.normalizedCity}|${district.normalizedName}`] = {
    lat: district.lat,
    lng: district.lng,
  };
  return centroids;
}, {});

export function getPublicDistrictSearchKeys(
  district: Pick<PublicDistrictCatalogEntry, 'name' | 'normalizedName' | 'aliases'>,
): string[] {
  return [
    district.normalizedName,
    normalizeLocationSearch(district.name),
    ...district.aliases.map((alias) => normalizeLocationSearch(alias)),
  ].filter((value): value is string => Boolean(value));
}
