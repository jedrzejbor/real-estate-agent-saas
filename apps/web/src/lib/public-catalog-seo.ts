export interface PublicCatalogSeoCity {
  name: string;
  region: string;
}

export const PUBLIC_CATALOG_SEO_CITIES: readonly PublicCatalogSeoCity[] = [
  { name: 'Warszawa', region: 'mazowieckie' },
  { name: 'Kraków', region: 'małopolskie' },
  { name: 'Wrocław', region: 'dolnośląskie' },
  { name: 'Poznań', region: 'wielkopolskie' },
  { name: 'Gdańsk', region: 'pomorskie' },
  { name: 'Łódź', region: 'łódzkie' },
  { name: 'Katowice', region: 'śląskie' },
  { name: 'Lublin', region: 'lubelskie' },
  { name: 'Szczecin', region: 'zachodniopomorskie' },
  { name: 'Białystok', region: 'podlaskie' },
  { name: 'Rzeszów', region: 'podkarpackie' },
  { name: 'Bydgoszcz', region: 'kujawsko-pomorskie' },
  { name: 'Toruń', region: 'kujawsko-pomorskie' },
  { name: 'Nakło nad Notecią', region: 'kujawsko-pomorskie' },
  { name: 'Łabiszyn', region: 'kujawsko-pomorskie' },
] as const;

export function getPublicCatalogCityHref(city: string): string {
  const params = new URLSearchParams({ city });

  return `/oferty?${params.toString()}`;
}

export function getPublicCatalogSeoCity(
  city: string | null | undefined,
): PublicCatalogSeoCity | null {
  const normalizedCity = normalizeCityName(city);

  if (!normalizedCity) {
    return null;
  }

  return (
    PUBLIC_CATALOG_SEO_CITIES.find(
      (seoCity) => normalizeCityName(seoCity.name) === normalizedCity,
    ) ?? null
  );
}

export function isPublicCatalogSeoCity(
  city: string | null | undefined,
): boolean {
  return Boolean(getPublicCatalogSeoCity(city));
}

function normalizeCityName(city: string | null | undefined): string {
  return (
    city
      ?.trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pl-PL') ?? ''
  );
}
