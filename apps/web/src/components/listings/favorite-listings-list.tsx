'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Heart, Loader2, Search, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { ListingPagination } from '@/components/listings/listing-pagination';
import { FavoriteListingButton } from '@/components/listings/favorite-listing-button';
import { useToast } from '@/contexts/toast-context';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  AnalyticsEventName,
  trackAnalyticsEvent,
} from '@/lib/analytics';
import {
  fetchFavoriteListings,
  removeFavoriteListing,
  type FavoriteListingListEntry,
  type FavoriteListingsPage,
} from '@/lib/favorite-listings';
import {
  formatArea,
  formatPrice,
  PROPERTY_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
} from '@/lib/listings';
import { cn } from '@/lib/utils';

const PAGE_LIMIT = 12;
const FALLBACK_LISTING_IMAGE = '/images/hero/house-2.jpg';

export function FavoriteListingsList() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [favoritesPage, setFavoritesPage] =
    useState<FavoriteListingsPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const entries = favoritesPage?.data ?? [];
  const meta = favoritesPage?.meta;
  const isCorrectingEmptyPage =
    !isLoading &&
    Boolean(meta) &&
    entries.length === 0 &&
    page > 1 &&
    Number(meta?.total) > 0;
  const statusMessage = isLoading
    ? favoritesPage
      ? 'Aktualizacja listy ulubionych ofert'
      : 'Ładowanie ulubionych ofert'
    : meta
      ? `Załadowano ${meta.total} ${formatOfferCount(meta.total)}`
      : 'Lista ulubionych ofert jest gotowa';

  const loadFavorites = useCallback(async (nextPage: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchFavoriteListings({
        page: nextPage,
        limit: PAGE_LIMIT,
      });
      setFavoritesPage(response);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    trackAnalyticsEvent({
      name: AnalyticsEventName.FAVORITES_PROFILE_OPENED,
      properties: {
        source: 'dashboard_profile_favorites',
      },
    });
  }, []);

  useEffect(() => {
    void loadFavorites(page);
  }, [loadFavorites, page]);

  useEffect(() => {
    if (isCorrectingEmptyPage) {
      setPage(page - 1);
    }
  }, [isCorrectingEmptyPage, page]);

  const handleFavoriteRemoved = useCallback((listingId: string) => {
    setFavoritesPage((current) => {
      if (!current) return current;

      const nextData = current.data.filter(
        (entry) => entry.listingId !== listingId,
      );

      return {
        ...current,
        data: nextData,
        meta: {
          ...current.meta,
          total: Math.max(0, current.meta.total - 1),
        },
      };
    });
  }, []);

  const handleUnavailableRemove = useCallback(
    async (listingId: string) => {
      try {
        await removeFavoriteListing(listingId);
        handleFavoriteRemoved(listingId);
        toast.success({
          title: 'Usunięto z ulubionych',
          description: 'Niedostępna oferta zniknęła z listy.',
        });
      } catch (err) {
        toast.error({
          title: 'Nie udało się usunąć oferty',
          description: getApiErrorMessage(err),
        });
      }
    },
    [handleFavoriteRemoved, toast],
  );

  const resultLabel = useMemo(() => {
    if (!meta) return 'Ulubione oferty';
    return `${meta.total} ${formatOfferCount(meta.total)}`;
  }, [meta]);

  if (isLoading && !favoritesPage) {
    return (
      <div
        className="flex min-h-[320px] items-center justify-center rounded-2xl border border-border bg-card"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Ładowanie ulubionych ofert
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-2xl border border-destructive/20 bg-card p-6 shadow-sm"
        role="alert"
      >
        <p className="font-semibold text-destructive">
          Nie udało się pobrać ulubionych
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Button
          type="button"
          variant="outline"
          className="mt-5 rounded-xl"
          onClick={() => void loadFavorites(page)}
        >
          Spróbuj ponownie
        </Button>
      </div>
    );
  }

  if (isCorrectingEmptyPage) {
    return (
      <div
        className="flex min-h-[220px] items-center justify-center rounded-2xl border border-border bg-card"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Aktualizacja strony ulubionych ofert
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return <FavoriteListingsEmptyState />;
  }

  return (
    <section
      className="space-y-5"
      aria-label="Lista ulubionych ofert"
      aria-busy={isLoading}
      aria-live="polite"
    >
      <p className="sr-only" role="status">
        {statusMessage}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {resultLabel}
          </p>
          <h2 className="font-heading text-xl font-semibold">
            Zapisane nieruchomości
          </h2>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Aktualizacja listy
          </div>
        ) : null}
      </div>

      <div className="grid gap-4">
        {entries.map((entry) =>
          entry.isAvailable ? (
            <FavoriteListingAvailableCard
              key={entry.id}
              entry={entry}
              onRemoved={handleFavoriteRemoved}
            />
          ) : (
            <FavoriteListingUnavailableCard
              key={entry.id}
              entry={entry}
              onRemove={handleUnavailableRemove}
            />
          ),
        )}
      </div>

      {meta ? (
        <ListingPagination
          meta={meta}
          onPageChange={(nextPage) => setPage(nextPage)}
        />
      ) : null}
    </section>
  );
}

function FavoriteListingAvailableCard({
  entry,
  onRemoved,
}: {
  entry: Extract<FavoriteListingListEntry, { isAvailable: true }>;
  onRemoved: (listingId: string) => void;
}) {
  const { listing } = entry;
  const image = listing.primaryImage ?? listing.images?.[0] ?? null;
  const location = [listing.address?.district, listing.address?.city]
    .filter(Boolean)
    .join(', ');
  const price = listing.price
    ? formatPrice(listing.price, listing.currency)
    : 'Cena na zapytanie';
  const area = listing.areaM2
    ? formatArea(listing.areaM2)
    : listing.plotAreaM2
      ? formatArea(listing.plotAreaM2)
      : null;

  return (
    <article className="grid overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:grid-cols-[220px_1fr]">
      <Link
        href={`/oferty/${listing.slug}`}
        className="relative block min-h-44 bg-muted md:min-h-full"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Listing images can be API-upload URLs outside next/image remote config. */}
        <img
          src={image?.url ?? FALLBACK_LISTING_IMAGE}
          alt={image?.altText ?? listing.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </Link>
      <div className="flex min-w-0 flex-col gap-4 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
              <span className="rounded-full bg-muted px-2.5 py-1">
                {PROPERTY_TYPE_LABELS[listing.propertyType]}
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1">
                {TRANSACTION_TYPE_LABELS[listing.transactionType]}
              </span>
            </div>
            <Link
              href={`/oferty/${listing.slug}`}
              className="mt-3 block font-heading text-xl font-semibold leading-snug hover:text-primary"
            >
              {listing.title}
            </Link>
            {location ? (
              <p className="mt-2 text-sm text-muted-foreground">{location}</p>
            ) : null}
          </div>
          <FavoriteListingButton
            listingId={listing.id}
            listingSlug={listing.slug}
            initialIsFavorite
            analyticsSource="dashboard_profile_favorites"
            className="w-full justify-center lg:w-auto"
            onChanged={(result) => {
              if (!result.isFavorite) {
                onRemoved(result.listingId);
              }
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <p className="font-semibold text-primary">{price}</p>
          {area ? <p className="text-muted-foreground">{area}</p> : null}
          {listing.rooms ? (
            <p className="text-muted-foreground">{listing.rooms} pok.</p>
          ) : null}
          <p className="text-muted-foreground">
            Dodano {formatDate(entry.createdAt)}
          </p>
        </div>

        <Link
          href={`/oferty/${listing.slug}`}
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          Zobacz ofertę
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

function FavoriteListingUnavailableCard({
  entry,
  onRemove,
}: {
  entry: Extract<FavoriteListingListEntry, { isAvailable: false }>;
  onRemove: (listingId: string) => Promise<void>;
}) {
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleRemove() {
    setIsRemoving(true);

    try {
      await onRemove(entry.listingId);
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <article className="rounded-2xl border border-dashed border-border bg-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-heading text-lg font-semibold">
            Oferta nie jest już publicznie dostępna
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Dodano {formatDate(entry.createdAt)}. Możesz usunąć ją z listy
            ulubionych.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl sm:w-auto"
          aria-label="Usuń niedostępną ofertę z ulubionych"
          disabled={isRemoving}
          onClick={() => void handleRemove()}
        >
          {isRemoving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Usuń
        </Button>
      </div>
    </article>
  );
}

function FavoriteListingsEmptyState() {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Heart className="h-7 w-7" />
      </div>
      <h2 className="mt-5 font-heading text-2xl font-semibold">
        Nie masz jeszcze ulubionych ofert
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Zapisuj interesujące nieruchomości z wyszukiwarki, a pojawią się tutaj.
      </p>
      <Link
        href="/oferty"
        className={cn(buttonVariants(), 'mt-6 rounded-xl')}
      >
        <Search className="h-4 w-4" />
        Przejdź do ofert
      </Link>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatOfferCount(count: number): string {
  if (count === 1) return 'oferta';
  if (count > 1 && count < 5) return 'oferty';
  return 'ofert';
}
