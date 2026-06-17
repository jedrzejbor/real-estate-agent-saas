export interface PublicDistrictSuggestion {
  city: string;
  name: string;
  normalizedCity: string;
  normalizedName: string;
  aliases: string[];
}

const PUBLIC_DISTRICT_SUGGESTIONS: PublicDistrictSuggestion[] = [
  {
    city: 'Bydgoszcz',
    name: 'Fordon',
    normalizedCity: 'bydgoszcz',
    normalizedName: 'fordon',
    aliases: [],
  },
  {
    city: 'Bydgoszcz',
    name: 'Śródmieście',
    normalizedCity: 'bydgoszcz',
    normalizedName: 'srodmiescie',
    aliases: ['centrum', 'srodmiescie', 'śródmieście'],
  },
];

export function getPublicDistrictSuggestions(
  city: string | null | undefined,
  query = '',
  limit = 8,
): PublicDistrictSuggestion[] {
  const cityKey = normalizeDistrictSearch(city);

  if (!cityKey) {
    return [];
  }

  const queryKey = normalizeDistrictSearch(query);

  return PUBLIC_DISTRICT_SUGGESTIONS.filter((district) => {
    if (district.normalizedCity !== cityKey) {
      return false;
    }

    if (!queryKey) {
      return true;
    }

    return getDistrictSearchKeys(district).some((key) =>
      key.includes(queryKey),
    );
  }).slice(0, limit);
}

export function hasPublicDistrictSuggestions(
  city: string | null | undefined,
): boolean {
  const cityKey = normalizeDistrictSearch(city);

  return Boolean(
    cityKey &&
      PUBLIC_DISTRICT_SUGGESTIONS.some(
        (district) => district.normalizedCity === cityKey,
      ),
  );
}

export function getCanonicalPublicDistrictName(
  city: string | null | undefined,
  district: string | null | undefined,
): string | null {
  const cityKey = normalizeDistrictSearch(city);
  const districtKey = normalizeDistrictSearch(district);

  if (!cityKey || !districtKey) {
    return null;
  }

  const match = PUBLIC_DISTRICT_SUGGESTIONS.find(
    (suggestion) =>
      suggestion.normalizedCity === cityKey &&
      getDistrictSearchKeys(suggestion).includes(districtKey),
  );

  return match?.name ?? null;
}

export function isKnownPublicDistrict(
  city: string | null | undefined,
  district: string | null | undefined,
): boolean {
  return Boolean(getCanonicalPublicDistrictName(city, district));
}

export function normalizeDistrictSearch(
  value: string | null | undefined,
): string {
  return (
    value
      ?.trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/ł/g, 'l')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim() ?? ''
  );
}

function getDistrictSearchKeys(district: PublicDistrictSuggestion): string[] {
  return [
    district.normalizedName,
    normalizeDistrictSearch(district.name),
    ...district.aliases.map(normalizeDistrictSearch),
  ].filter(Boolean);
}
