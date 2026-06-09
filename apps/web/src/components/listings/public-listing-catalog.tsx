'use client';

/* eslint-disable @next/next/no-img-element */
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
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
import { PublicListingCatalogMap } from '@/components/listings/public-listing-catalog-map';
import { PublicListingCatalogResultLink } from '@/components/listings/public-listing-catalog-result-link';
import { PublicListingCityFilterField } from '@/components/listings/public-listing-city-filter-field';
import type { AnalyticsProperties } from '@/lib/analytics';

interface PublicListingCatalogProps {
  initialFilters: PublicListingCatalogFilters;
  initialCatalog: PublicListingCatalogResponse | null;
  initialError: string | null;
}

const FALLBACK_LISTING_IMAGE = '/images/hero/house-2.jpg';
const DEFAULT_LIMIT = 24;

export function PublicListingCatalog({
  initialFilters,
  initialCatalog,
  initialError,
}: PublicListingCatalogProps) {
  const [filters, setFilters] = useState(initialFilters);
  const [catalog, setCatalog] = useState(initialCatalog);
  const [error, setError] = useState(initialError);
  const [isPending, startTransition] = useTransition();
  const searchProperties = useMemo(
    () => buildSearchAnalyticsProperties(filters),
    [filters],
  );
  const formKey = buildCatalogQueryString(filters) || 'base-catalog';
  const initialStateKey =
    buildCatalogQueryString(initialFilters) || 'base-catalog';

  useEffect(() => {
    setFilters(initialFilters);
    setCatalog(initialCatalog);
    setError(initialError);
  }, [initialStateKey, initialCatalog, initialError, initialFilters]);

  function loadCatalog(
    nextFilters: PublicListingCatalogFilters,
    options: { updateUrl?: boolean } = {},
  ) {
    startTransition(async () => {
      try {
        const nextCatalog = await fetchPublicListingCatalog(nextFilters);
        setFilters(nextFilters);
        setCatalog(nextCatalog);
        setError(null);
        if (options.updateUrl !== false) {
          updateBrowserUrl(nextFilters);
        }
      } catch (fetchError) {
        setFilters(nextFilters);
        setCatalog(null);
        setError(
          fetchError instanceof ApiError
            ? fetchError.message
            : 'Nie udało się pobrać ofert',
        );
        if (options.updateUrl !== false) {
          updateBrowserUrl(nextFilters);
        }
      }
    });
  }

  useEffect(() => {
    function handlePopState() {
      loadCatalog(parseCatalogFiltersFromUrlSearchParams(window.location.search), {
        updateUrl: false,
      });
    }

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    loadCatalog(parseCatalogFiltersFromForm(formData, filters));
  }

  function clearFilters() {
    loadCatalog({ limit: DEFAULT_LIMIT, sort: PublicListingCatalogSort.NEWEST, page: 1 });
  }

  function clearBbox() {
    loadCatalog({ ...filters, bbox: undefined, page: 1 });
  }

  function changePage(page: number) {
    loadCatalog({ ...filters, page });
  }

  function changeBbox(bbox: string | null) {
    loadCatalog({ ...filters, bbox: bbox ?? undefined, page: 1 });
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[320px_1fr] lg:px-10">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <form
          key={formKey}
          action="/oferty"
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-card p-4 shadow-sm"
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
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:border-primary"
              />
            </Field>

            <Field label="Miasto">
              <PublicListingCityFilterField
                key={filters.city ?? 'empty-city'}
                initialValue={filters.city ?? ''}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Field label="Typ nieruchomości">
                <select
                  name="propertyType"
                  defaultValue={filters.propertyType ?? ''}
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:border-primary"
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
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:border-primary"
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
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:border-primary"
                />
              </Field>
              <Field label="Cena do">
                <input
                  name="priceMax"
                  type="number"
                  min="0"
                  defaultValue={filters.priceMax ?? ''}
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:border-primary"
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
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:border-primary"
                />
              </Field>
              <Field label="Metraż do">
                <input
                  name="areaMax"
                  type="number"
                  min="0"
                  defaultValue={filters.areaMax ?? ''}
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:border-primary"
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
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:border-primary"
                />
              </Field>
              <Field label="Pokoje do">
                <input
                  name="roomsMax"
                  type="number"
                  min="1"
                  max="20"
                  defaultValue={filters.roomsMax ?? ''}
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:border-primary"
                />
              </Field>
            </div>

            <Field label="Sortowanie">
              <select
                name="sort"
                defaultValue={filters.sort ?? PublicListingCatalogSort.NEWEST}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:border-primary"
              >
                <option value={PublicListingCatalogSort.NEWEST}>Najnowsze</option>
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

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
              >
                <Search className="h-4 w-4" />
                {isPending ? 'Szukam...' : 'Szukaj'}
              </button>
              <button
                type="button"
                onClick={clearFilters}
                disabled={isPending}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted disabled:cursor-wait disabled:opacity-70"
              >
                Wyczyść
              </button>
            </div>
          </div>
        </form>
      </aside>

      <div className="relative min-w-0">
        {isPending ? (
          <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-card/45" />
        ) : null}

        {error ? (
          <ErrorState message={error} onRetry={() => loadCatalog(filters)} />
        ) : catalog ? (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Strona {catalog.meta.page} z {catalog.meta.totalPages} -{' '}
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
                  <button
                    type="button"
                    onClick={clearBbox}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold transition-colors hover:bg-muted"
                  >
                    Wyczyść obszar
                  </button>
                ) : null}
                <a
                  href="#mapa"
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold transition-colors hover:bg-muted"
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
                activeBbox={filters.bbox}
                onBboxChange={changeBbox}
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
                        (catalog.meta.page - 1) * catalog.meta.limit + index + 1
                      }
                      searchProperties={searchProperties}
                    />
                  ))}
                </div>

                <Pagination
                  page={catalog.meta.page}
                  totalPages={catalog.meta.totalPages}
                  onPageChange={changePage}
                />
              </>
            ) : (
              <EmptyState filters={filters} onRelaxFilters={loadCatalog} />
            )}
          </>
        ) : (
          <EmptyState filters={filters} onRelaxFilters={loadCatalog} />
        )}
      </div>
    </section>
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
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
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

function EmptyState({
  filters,
  onRelaxFilters,
}: {
  filters: PublicListingCatalogFilters;
  onRelaxFilters: (filters: PublicListingCatalogFilters) => void;
}) {
  const hasLocationContext = Boolean(filters.city);
  const relaxedFilters = buildRelaxedCatalogFilters(filters);
  const addListingHref = buildAddListingHref(filters);
  const title = hasLocationContext
    ? `Brak ofert w lokalizacji ${filters.city}`
    : 'Brak ofert dla tych filtrów';
  const description = hasLocationContext
    ? 'W tej lokalizacji nie znaleźliśmy jeszcze pasujących publicznych ofert. Możesz zdjąć część filtrów albo dodać własną ofertę dla tego miejsca.'
    : 'Nie znaleźliśmy wyników dla wybranych parametrów. Zmień filtry albo dodaj ofertę, żeby pojawiła się w publicznym katalogu.';

  return (
    <section className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
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
        <button
          type="button"
          onClick={() => onRelaxFilters(relaxedFilters)}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
        >
          <RotateCcw className="h-4 w-4" />
          Zmień filtry
        </button>
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

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
      <h2 className="font-heading text-2xl font-semibold">
        Nie udało się pobrać ofert
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted"
      >
        Spróbuj ponownie
      </button>
    </section>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="mt-8 flex items-center justify-between gap-3">
      <PaginationButton disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Poprzednia
      </PaginationButton>
      <span className="text-sm text-muted-foreground">
        {page} / {totalPages}
      </span>
      <PaginationButton
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Następna
      </PaginationButton>
    </nav>
  );
}

function PaginationButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold transition-colors hover:bg-muted disabled:pointer-events-none disabled:text-muted-foreground disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function parseCatalogFiltersFromForm(
  formData: FormData,
  currentFilters: PublicListingCatalogFilters,
): PublicListingCatalogFilters {
  return {
    agentId: currentFilters.agentId,
    city: getStringFormValue(formData, 'city'),
    propertyType: getEnumFormValue(formData, 'propertyType', PropertyType),
    transactionType: getEnumFormValue(
      formData,
      'transactionType',
      TransactionType,
    ),
    priceMin: getNumberFormValue(formData, 'priceMin'),
    priceMax: getNumberFormValue(formData, 'priceMax'),
    areaMin: getNumberFormValue(formData, 'areaMin'),
    areaMax: getNumberFormValue(formData, 'areaMax'),
    roomsMin: getNumberFormValue(formData, 'roomsMin'),
    roomsMax: getNumberFormValue(formData, 'roomsMax'),
    q: getStringFormValue(formData, 'q'),
    bbox: currentFilters.bbox,
    mapLimit: currentFilters.mapLimit,
    sort:
      getEnumFormValue(formData, 'sort', PublicListingCatalogSort) ??
      PublicListingCatalogSort.NEWEST,
    page: 1,
    limit: DEFAULT_LIMIT,
  };
}

function parseCatalogFiltersFromUrlSearchParams(
  search: string,
): PublicListingCatalogFilters {
  const searchParams = new URLSearchParams(search);

  return {
    agentId: getStringSearchParam(searchParams, 'agentId'),
    city: getStringSearchParam(searchParams, 'city'),
    propertyType: getEnumSearchParam(searchParams, 'propertyType', PropertyType),
    transactionType: getEnumSearchParam(
      searchParams,
      'transactionType',
      TransactionType,
    ),
    priceMin: getNumberSearchParam(searchParams, 'priceMin'),
    priceMax: getNumberSearchParam(searchParams, 'priceMax'),
    areaMin: getNumberSearchParam(searchParams, 'areaMin'),
    areaMax: getNumberSearchParam(searchParams, 'areaMax'),
    roomsMin: getNumberSearchParam(searchParams, 'roomsMin'),
    roomsMax: getNumberSearchParam(searchParams, 'roomsMax'),
    q: getStringSearchParam(searchParams, 'q'),
    bbox: getStringSearchParam(searchParams, 'bbox'),
    mapLimit: getNumberSearchParam(searchParams, 'mapLimit', 1),
    sort:
      getEnumSearchParam(searchParams, 'sort', PublicListingCatalogSort) ??
      PublicListingCatalogSort.NEWEST,
    page: getNumberSearchParam(searchParams, 'page', 1) ?? 1,
    limit: DEFAULT_LIMIT,
  };
}

function getStringFormValue(
  formData: FormData,
  key: string,
): string | undefined {
  const value = formData.get(key);
  const normalized = typeof value === 'string' ? value.trim() : '';

  return normalized || undefined;
}

function getNumberFormValue(
  formData: FormData,
  key: string,
  min = 0,
): number | undefined {
  const value = getStringFormValue(formData, key);
  if (!value) return undefined;

  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue >= min
    ? numberValue
    : undefined;
}

function getEnumFormValue<T extends Record<string, string>>(
  formData: FormData,
  key: string,
  source: T,
): T[keyof T] | undefined {
  const value = getStringFormValue(formData, key);
  const values = Object.values(source);

  return values.includes(value ?? '') ? (value as T[keyof T]) : undefined;
}

function getStringSearchParam(
  searchParams: URLSearchParams,
  key: string,
): string | undefined {
  const normalized = searchParams.get(key)?.trim();

  return normalized || undefined;
}

function getNumberSearchParam(
  searchParams: URLSearchParams,
  key: string,
  min = 0,
): number | undefined {
  const value = getStringSearchParam(searchParams, key);
  if (!value) return undefined;

  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue >= min
    ? numberValue
    : undefined;
}

function getEnumSearchParam<T extends Record<string, string>>(
  searchParams: URLSearchParams,
  key: string,
  source: T,
): T[keyof T] | undefined {
  const value = getStringSearchParam(searchParams, key);
  const values = Object.values(source);

  return values.includes(value ?? '') ? (value as T[keyof T]) : undefined;
}

function updateBrowserUrl(filters: PublicListingCatalogFilters) {
  const href = `/oferty${buildCatalogQueryString(filters)}`;
  window.history.pushState(null, '', href);
}

function buildCatalogQueryString(filters: PublicListingCatalogFilters): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (key === 'limit' && value === DEFAULT_LIMIT) {
      continue;
    }

    if (value !== undefined && value !== '' && value !== null) {
      params.set(key, String(value));
    }
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function buildRelaxedCatalogFilters(
  filters: PublicListingCatalogFilters,
): PublicListingCatalogFilters {
  if (!hasRestrictiveCatalogFilters(filters)) {
    return {
      limit: DEFAULT_LIMIT,
      sort: PublicListingCatalogSort.NEWEST,
      page: 1,
    };
  }

  return {
    agentId: filters.agentId,
    city: filters.city,
    page: 1,
    limit: DEFAULT_LIMIT,
    sort: PublicListingCatalogSort.NEWEST,
  };
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
