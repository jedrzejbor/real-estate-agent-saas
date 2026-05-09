/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Home,
  Map as MapIcon,
  MapPin,
  PlusCircle,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
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
  formatArea,
  formatPrice,
  PROPERTY_TYPE_LABELS,
  PropertyType,
  PublicListingCatalogSort,
  TRANSACTION_TYPE_LABELS,
  TransactionType,
  type PublicListingCatalogFilters,
  type PublicListingCatalogItem,
  type PublicListingCatalogResponse,
} from '@/lib/listings';
import { PublicListingCatalogResultLink } from '@/components/listings/public-listing-catalog-result-link';
import { PublicListingCatalogMap } from '@/components/listings/public-listing-catalog-map';
import { PublicListingCityFilterField } from '@/components/listings/public-listing-city-filter-field';
import type { AnalyticsProperties } from '@/lib/analytics';

type SearchParams = Record<string, string | string[] | undefined>;

interface PublicListingsIndexPageProps {
  searchParams: Promise<SearchParams>;
}

const FALLBACK_LISTING_IMAGE = '/images/hero/house-2.jpg';
const DEFAULT_LIMIT = 24;
const CATALOG_FILTER_QUERY_KEYS = new Set([
  'agentId',
  'city',
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
    ? `Oferty nieruchomości ${seoCity.name} | EstateFlow`
    : isBaseCatalog
      ? 'Oferty nieruchomości | EstateFlow'
      : 'Wyniki wyszukiwania ofert | EstateFlow';
  const description = seoCity
    ? `Przeglądaj oferty nieruchomości w lokalizacji ${seoCity.name}. Sprawdź mieszkania, domy i działki w publicznym katalogu EstateFlow.`
    : isBaseCatalog
      ? 'Przeglądaj publiczne oferty nieruchomości opublikowane w EstateFlow.'
      : 'Przefiltrowane wyniki publicznego katalogu ofert EstateFlow.';

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
      siteName: 'EstateFlow',
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
  const catalog = result.data;
  const searchProperties = buildSearchAnalyticsProperties(filters);
  const activeSeoCity = getPublicCatalogSeoCity(filters.city);

  return (
    <main className="min-h-screen bg-[#FAFAF9] text-[#1C1917]">
      <section className="border-b border-border bg-white">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            EstateFlow
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
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/dodaj-oferte"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <PlusCircle className="h-4 w-4" />
                  Dodaj ofertę bez konta
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-semibold transition-colors hover:bg-muted"
                >
                  Załóż konto agenta
                </Link>
              </div>
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

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[320px_1fr] lg:px-10">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <form
            action="/oferty"
            className="rounded-2xl border border-border bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              <h2 className="font-heading text-lg font-semibold">Filtry</h2>
            </div>

            <div className="mt-4 space-y-4">
              <Field label="Fraza">
                <input
                  name="q"
                  defaultValue={filters.q ?? ''}
                  placeholder="np. ogród, centrum"
                  className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none transition focus:border-primary"
                />
              </Field>

              <Field label="Miasto">
                <PublicListingCityFilterField
                  initialValue={filters.city ?? ''}
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <Field label="Typ nieruchomości">
                  <select
                    name="propertyType"
                    defaultValue={filters.propertyType ?? ''}
                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none transition focus:border-primary"
                  >
                    <option value="">Dowolny</option>
                    {Object.values(PropertyType).map((type) => (
                      <option key={type} value={type}>
                        {PROPERTY_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Transakcja">
                  <select
                    name="transactionType"
                    defaultValue={filters.transactionType ?? ''}
                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none transition focus:border-primary"
                  >
                    <option value="">Dowolna</option>
                    {Object.values(TransactionType).map((type) => (
                      <option key={type} value={type}>
                        {TRANSACTION_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Cena od">
                  <input
                    name="priceMin"
                    type="number"
                    min="0"
                    defaultValue={filters.priceMin ?? ''}
                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none transition focus:border-primary"
                  />
                </Field>
                <Field label="Cena do">
                  <input
                    name="priceMax"
                    type="number"
                    min="0"
                    defaultValue={filters.priceMax ?? ''}
                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none transition focus:border-primary"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Metraż od">
                  <input
                    name="areaMin"
                    type="number"
                    min="0"
                    defaultValue={filters.areaMin ?? ''}
                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none transition focus:border-primary"
                  />
                </Field>
                <Field label="Metraż do">
                  <input
                    name="areaMax"
                    type="number"
                    min="0"
                    defaultValue={filters.areaMax ?? ''}
                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none transition focus:border-primary"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Pokoje od">
                  <input
                    name="roomsMin"
                    type="number"
                    min="1"
                    max="20"
                    defaultValue={filters.roomsMin ?? ''}
                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none transition focus:border-primary"
                  />
                </Field>
                <Field label="Pokoje do">
                  <input
                    name="roomsMax"
                    type="number"
                    min="1"
                    max="20"
                    defaultValue={filters.roomsMax ?? ''}
                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none transition focus:border-primary"
                  />
                </Field>
              </div>

              <Field label="Sortowanie">
                <select
                  name="sort"
                  defaultValue={filters.sort ?? PublicListingCatalogSort.NEWEST}
                  className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none transition focus:border-primary"
                >
                  <option value={PublicListingCatalogSort.NEWEST}>
                    Najnowsze
                  </option>
                  <option value={PublicListingCatalogSort.PRICE_ASC}>
                    Cena rosnąco
                  </option>
                  <option value={PublicListingCatalogSort.PRICE_DESC}>
                    Cena malejąco
                  </option>
                  <option value={PublicListingCatalogSort.AREA_ASC}>
                    Powierzchnia rosnąco
                  </option>
                  <option value={PublicListingCatalogSort.AREA_DESC}>
                    Powierzchnia malejąco
                  </option>
                </select>
              </Field>

              <input type="hidden" name="page" value="1" />
              {filters.bbox ? (
                <input type="hidden" name="bbox" value={filters.bbox} />
              ) : null}
              {filters.agentId ? (
                <input type="hidden" name="agentId" value={filters.agentId} />
              ) : null}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Search className="h-4 w-4" />
                  Szukaj
                </button>
                <Link
                  href="/oferty"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted"
                >
                  Wyczyść
                </Link>
              </div>
            </div>
          </form>
        </aside>

        <div className="min-w-0">
          {result.error ? (
            <ErrorState message={result.error} />
          ) : catalog ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Strona {catalog.meta.page} z {catalog.meta.totalPages} •{' '}
                  {catalog.meta.total} wyników
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/dodaj-oferte"
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Dodaj ofertę
                  </Link>
                  {filters.bbox ? (
                    <Link
                      href={`/oferty${buildCatalogQueryString({ ...filters, bbox: undefined, page: 1 })}`}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 text-sm font-semibold transition-colors hover:bg-muted"
                    >
                      Wyczyść obszar
                    </Link>
                  ) : null}
                  <a
                    href="#mapa"
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 text-sm font-semibold transition-colors hover:bg-muted"
                  >
                    <MapIcon className="h-4 w-4" />
                    Mapa
                  </a>
                </div>
              </div>

              <div className="mb-6">
                <PublicListingCatalogMap
                  markers={catalog.mapMarkers}
                  mapMeta={catalog.meta.map}
                />
              </div>

              {catalog.data.length > 0 ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {catalog.data.map((listing, index) => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        position={
                          (catalog.meta.page - 1) * catalog.meta.limit +
                          index +
                          1
                        }
                        searchProperties={searchProperties}
                      />
                    ))}
                  </div>

                  <Pagination
                    filters={filters}
                    page={catalog.meta.page}
                    totalPages={catalog.meta.totalPages}
                  />
                </>
              ) : (
                <EmptyState filters={filters} />
              )}
            </>
          ) : (
            <EmptyState filters={filters} />
          )}
        </div>
      </section>
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
                  : 'border-border bg-white text-foreground hover:bg-muted'
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

function ListingCard({
  listing,
  position,
  searchProperties,
}: {
  listing: PublicListingCatalogItem;
  position: number;
  searchProperties: AnalyticsProperties;
}) {
  const location = [listing.address?.district, listing.address?.city]
    .filter(Boolean)
    .join(', ');
  const imageUrl = listing.primaryImage?.url ?? FALLBACK_LISTING_IMAGE;
  const agencyName = listing.agent?.agency?.name;

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <PublicListingCatalogResultLink
        slug={listing.slug}
        listingId={listing.id}
        position={position}
        searchProperties={searchProperties}
        className="block"
      >
        <div className="relative aspect-[4/3] bg-muted">
          <img
            src={imageUrl}
            alt={listing.primaryImage?.altText || listing.title}
            className="h-full w-full object-cover"
          />
          {listing.imageCount > 1 ? (
            <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-2.5 py-1 text-xs font-semibold text-white">
              {listing.imageCount} zdjęć
            </span>
          ) : null}
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {PROPERTY_TYPE_LABELS[listing.propertyType]}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              {TRANSACTION_TYPE_LABELS[listing.transactionType]}
            </span>
          </div>
          <h2 className="mt-3 line-clamp-2 font-heading text-lg font-semibold leading-snug text-foreground">
            {listing.title}
          </h2>
          {location ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{location}</span>
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <Metric
              icon={Home}
              label="Cena"
              value={
                listing.price
                  ? formatPrice(listing.price, listing.currency)
                  : 'Zapytaj'
              }
            />
            <Metric
              icon={Building2}
              label="Metraż"
              value={formatArea(
                listing.areaM2 ?? listing.plotAreaM2 ?? undefined,
              )}
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
            <p className="truncate text-xs text-muted-foreground">
              {agencyName || 'EstateFlow'}
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
              Szczegóły
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </PublicListingCatalogResultLink>
    </article>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Home;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-muted/40 px-3 py-2">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 truncate font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function EmptyState({ filters }: { filters: PublicListingCatalogFilters }) {
  const hasLocationContext = Boolean(filters.city);
  const relaxedCatalogHref = buildRelaxedCatalogHref(filters);
  const addListingHref = buildAddListingHref(filters);
  const title = hasLocationContext
    ? `Brak ofert w lokalizacji ${filters.city}`
    : 'Brak ofert dla tych filtrów';
  const description = hasLocationContext
    ? 'W tej lokalizacji nie znaleźliśmy jeszcze pasujących publicznych ofert. Możesz zdjąć część filtrów albo dodać własną ofertę dla tego miejsca.'
    : 'Nie znaleźliśmy wyników dla wybranych parametrów. Zmień filtry albo dodaj ofertę, żeby pojawiła się w publicznym katalogu.';

  return (
    <section className="rounded-2xl border border-border bg-white p-6 text-center shadow-sm sm:p-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Search className="h-6 w-6" />
      </div>
      <h2 className="mt-5 font-heading text-2xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>

      {hasLocationContext ? (
        <p className="mx-auto mt-3 max-w-md rounded-xl bg-muted/40 px-4 py-3 text-sm font-medium text-foreground">
          Lokalizacja: {filters.city}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link
          href={relaxedCatalogHref}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
        >
          <RotateCcw className="h-4 w-4" />
          Zmień filtry
        </Link>
        <Link
          href={addListingHref}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <PlusCircle className="h-4 w-4" />
          Dodaj ofertę w tej lokalizacji
        </Link>
      </div>
    </section>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <section className="rounded-2xl border border-destructive/20 bg-white p-8 text-center shadow-sm">
      <h2 className="font-heading text-2xl font-semibold">
        Nie udało się pobrać ofert
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {message}
      </p>
      <Link
        href="/oferty"
        className="mt-5 inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted"
      >
        Spróbuj ponownie
      </Link>
    </section>
  );
}

function Pagination({
  filters,
  page,
  totalPages,
}: {
  filters: PublicListingCatalogFilters;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="mt-8 flex items-center justify-between gap-3">
      <PaginationLink
        disabled={page <= 1}
        href={`/oferty${buildCatalogQueryString({ ...filters, page: page - 1 })}`}
      >
        Poprzednia
      </PaginationLink>
      <span className="text-sm text-muted-foreground">
        {page} / {totalPages}
      </span>
      <PaginationLink
        disabled={page >= totalPages}
        href={`/oferty${buildCatalogQueryString({ ...filters, page: page + 1 })}`}
      >
        Następna
      </PaginationLink>
    </nav>
  );
}

function PaginationLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground opacity-50">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-white px-4 text-sm font-semibold transition-colors hover:bg-muted"
    >
      {children}
    </Link>
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

function buildCatalogQueryString(filters: PublicListingCatalogFilters): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== null) {
      params.set(key, String(value));
    }
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function buildRelaxedCatalogHref(filters: PublicListingCatalogFilters): string {
  if (!hasRestrictiveCatalogFilters(filters)) {
    return '/oferty';
  }

  const relaxedFilters: PublicListingCatalogFilters = {
    agentId: filters.agentId,
    city: filters.city,
    page: 1,
  };

  return `/oferty${buildCatalogQueryString(relaxedFilters)}`;
}

function buildAddListingHref(filters: PublicListingCatalogFilters): string {
  if (!filters.city) {
    return '/dodaj-oferte';
  }

  const params = new URLSearchParams({ city: filters.city });

  return `/dodaj-oferte?${params.toString()}`;
}

function hasRestrictiveCatalogFilters(
  filters: PublicListingCatalogFilters,
): boolean {
  return Boolean(
    filters.district ||
    filters.voivodeship ||
    filters.propertyType ||
    filters.transactionType ||
    filters.priceMin !== undefined ||
    filters.priceMax !== undefined ||
    filters.areaMin !== undefined ||
    filters.areaMax !== undefined ||
    filters.roomsMin !== undefined ||
    filters.roomsMax !== undefined ||
    filters.q ||
    filters.bbox,
  );
}

function buildSearchAnalyticsProperties(
  filters: PublicListingCatalogFilters,
): AnalyticsProperties {
  return {
    city: filters.city,
    propertyType: filters.propertyType,
    transactionType: filters.transactionType,
    q: filters.q,
    sort: filters.sort,
    page: filters.page,
    bbox: filters.bbox,
    agentId: filters.agentId,
  };
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
