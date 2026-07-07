import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';
import { ApiError } from '@/lib/api-client';
import { absoluteUrl, getSiteUrl } from '@/lib/seo';
import {
  getPublicCatalogCityHref,
  getPublicCatalogSeoCity,
  PUBLIC_CATALOG_SEO_CITIES,
  type PublicCatalogSeoCity,
} from '@/lib/public-catalog-seo';
import {
  fetchPublicListingCatalog,
  PropertyType,
  PublicListingCatalogSort,
  TransactionType,
  type PublicListingCatalogFilters,
  type PublicListingCatalogResponse,
} from '@/lib/listings';
import { PublicListingCatalog } from '@/components/listings/public-listing-catalog';
import { PublicListingsHeroActions } from '@/components/listings/public-listings-hero-actions';
import { APP_NAME } from '@/lib/brand';

type SearchParams = Record<string, string | string[] | undefined>;

interface PublicListingsIndexPageProps {
  searchParams: Promise<SearchParams>;
}

const DEFAULT_LIMIT = 24;
const CATALOG_FILTER_QUERY_KEYS = new Set([
  'agentId',
  'city',
  'district',
  'propertyType',
  'transactionType',
  'priceMin',
  'priceMax',
  'areaMin',
  'areaMax',
  'roomsMin',
  'roomsMax',
  'q',
  'bbox',
  'mapLimit',
  'sort',
  'page',
]);

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: PublicListingsIndexPageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const seoCity = getIndexableSeoCity(resolvedSearchParams);
  const isBaseCatalog = isIndexableBaseCatalogView(resolvedSearchParams);
  const isIndexable = isBaseCatalog || Boolean(seoCity);
  const canonicalPath = seoCity
    ? getPublicCatalogCityHref(seoCity.name)
    : '/oferty';
  const title = seoCity
    ? `Oferty nieruchomości ${seoCity.name} | ${APP_NAME}`
    : isBaseCatalog
      ? `Oferty nieruchomości | ${APP_NAME}`
      : `Wyniki wyszukiwania ofert | ${APP_NAME}`;
  const description = seoCity
    ? `Przeglądaj oferty nieruchomości w lokalizacji ${seoCity.name}. Sprawdź mieszkania, domy i działki w publicznym katalogu ${APP_NAME}.`
    : isBaseCatalog
      ? `Przeglądaj publiczne oferty nieruchomości opublikowane w ${APP_NAME}.`
      : `Przefiltrowane wyniki publicznego katalogu ofert ${APP_NAME}.`;

  return {
    metadataBase: getSiteUrl(),
    title,
    description,
    alternates: {
      canonical: absoluteUrl(canonicalPath),
    },
    robots: {
      index: isIndexable,
      follow: true,
      googleBot: {
        index: isIndexable,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(canonicalPath),
      siteName: APP_NAME,
      type: 'website',
      locale: 'pl_PL',
    },
  };
}

export default async function PublicListingsIndexPage({
  searchParams,
}: PublicListingsIndexPageProps) {
  const resolvedSearchParams = await searchParams;
  const filters = parseCatalogFilters(resolvedSearchParams);
  const result = await getPublicCatalog(filters);
  const activeSeoCity = getPublicCatalogSeoCity(filters.city);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            {APP_NAME}
          </Link>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">
                Publiczny katalog
              </p>
              <h1 className="mt-2 max-w-3xl font-heading text-4xl font-bold leading-tight sm:text-5xl">
                {filters.city
                  ? `Oferty nieruchomości: ${filters.city}`
                  : 'Znajdź ofertę nieruchomości'}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                {filters.agentId
                  ? 'Przeglądasz oferty powiązane z wybranym profilem publicznym. Możesz zawęzić wyniki po lokalizacji, mapie, cenie i parametrach.'
                  : filters.city
                    ? `Przeglądaj opublikowane mieszkania, domy i działki w lokalizacji ${filters.city}. Zmieniaj filtry, sprawdzaj mapę i przechodź do szczegółów wybranej nieruchomości.`
                    : 'Przeglądaj opublikowane oferty, filtruj po lokalizacji, parametrach i cenie, a potem przejdź do szczegółów wybranej nieruchomości.'}
              </p>
              <PublicListingsHeroActions />
            </div>

            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="text-sm font-semibold text-foreground">
                {result.data?.meta.total ?? 0} ofert
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Wyniki pokazują wyłącznie publicznie opublikowane oferty.
              </p>
            </div>
          </div>

          <PopularCityLinks activeCity={activeSeoCity?.name ?? filters.city} />
        </div>
      </section>

      <PublicListingCatalog
        initialFilters={filters}
        initialCatalog={result.data}
        initialError={result.error}
      />
    </main>
  );
}

function PopularCityLinks({ activeCity }: { activeCity?: string }) {
  const activeSeoCity = getPublicCatalogSeoCity(activeCity);

  return (
    <nav
      aria-label="Popularne miasta w katalogu ofert"
      className="mt-8 border-t border-border pt-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Popularne lokalizacje
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Szybkie przejścia do ofert z najczęściej wyszukiwanych miast.
          </p>
        </div>
        {activeSeoCity ? (
          <Link
            href="/oferty"
            className="inline-flex h-9 w-fit items-center justify-center rounded-xl border border-border px-3 text-sm font-semibold transition-colors hover:bg-muted"
          >
            Wszystkie miasta
          </Link>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {PUBLIC_CATALOG_SEO_CITIES.map((city) => {
          const isActive = activeSeoCity?.name === city.name;

          return (
            <Link
              key={city.name}
              href={getPublicCatalogCityHref(city.name)}
              aria-current={isActive ? 'page' : undefined}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-foreground hover:bg-muted'
              }`}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>Oferty {city.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

async function getPublicCatalog(filters: PublicListingCatalogFilters): Promise<{
  data: PublicListingCatalogResponse | null;
  error: string | null;
}> {
  try {
    return {
      data: await fetchPublicListingCatalog(filters),
      error: null,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        data: null,
        error: error.message,
      };
    }

    throw error;
  }
}

function parseCatalogFilters(
  searchParams: SearchParams,
): PublicListingCatalogFilters {
  return {
    agentId: getStringParam(searchParams.agentId),
    city: getStringParam(searchParams.city),
    district: getStringParam(searchParams.district),
    propertyType: getEnumParam(searchParams.propertyType, PropertyType),
    transactionType: getEnumParam(
      searchParams.transactionType,
      TransactionType,
    ),
    priceMin: getNumberParam(searchParams.priceMin),
    priceMax: getNumberParam(searchParams.priceMax),
    areaMin: getNumberParam(searchParams.areaMin),
    areaMax: getNumberParam(searchParams.areaMax),
    roomsMin: getNumberParam(searchParams.roomsMin),
    roomsMax: getNumberParam(searchParams.roomsMax),
    q: getStringParam(searchParams.q),
    bbox: getStringParam(searchParams.bbox),
    mapLimit: getNumberParam(searchParams.mapLimit, { min: 1 }),
    sort:
      getEnumParam(searchParams.sort, PublicListingCatalogSort) ??
      PublicListingCatalogSort.NEWEST,
    page: getNumberParam(searchParams.page, { min: 1 }) ?? 1,
    limit: DEFAULT_LIMIT,
  };
}

function getStringParam(
  value: string | string[] | undefined,
): string | undefined {
  const normalized = Array.isArray(value) ? value[0] : value;
  const trimmed = normalized?.trim();

  return trimmed || undefined;
}

function getNumberParam(
  value: string | string[] | undefined,
  options: { min?: number } = {},
): number | undefined {
  const normalized = getStringParam(value);
  if (!normalized) return undefined;

  const numberValue = Number(normalized);
  const min = options.min ?? 0;

  return Number.isFinite(numberValue) && numberValue >= min
    ? numberValue
    : undefined;
}

function getEnumParam<T extends Record<string, string>>(
  value: string | string[] | undefined,
  source: T,
): T[keyof T] | undefined {
  const normalized = getStringParam(value);
  const values = Object.values(source);

  return values.includes(normalized ?? '')
    ? (normalized as T[keyof T])
    : undefined;
}

function isIndexableBaseCatalogView(searchParams: SearchParams): boolean {
  for (const [key, value] of Object.entries(searchParams)) {
    const trimmed = getStringParam(value);

    if (!trimmed) {
      continue;
    }

    if (!CATALOG_FILTER_QUERY_KEYS.has(key)) {
      return false;
    }

    if (key === 'page' && trimmed === '1') {
      continue;
    }

    if (key === 'sort' && trimmed === PublicListingCatalogSort.NEWEST) {
      continue;
    }

    return false;
  }

  return true;
}

function getIndexableSeoCity(
  searchParams: SearchParams,
): PublicCatalogSeoCity | null {
  const seoCity = getPublicCatalogSeoCity(getStringParam(searchParams.city));

  if (!seoCity) {
    return null;
  }

  for (const [key, value] of Object.entries(searchParams)) {
    const trimmed = getStringParam(value);

    if (!trimmed) {
      continue;
    }

    if (!CATALOG_FILTER_QUERY_KEYS.has(key)) {
      return null;
    }

    if (key === 'city') {
      if (getPublicCatalogSeoCity(trimmed)?.name === seoCity.name) {
        continue;
      }

      return null;
    }

    if (key === 'page' && trimmed === '1') {
      continue;
    }

    if (key === 'sort' && trimmed === PublicListingCatalogSort.NEWEST) {
      continue;
    }

    return null;
  }

  return seoCity;
}
