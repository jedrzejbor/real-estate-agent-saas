'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Check, Loader2, Save, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/contexts/toast-context';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  fetchRetentionChoices,
  formatPrice,
  LISTING_PUBLICATION_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  saveRetentionChoices,
  TRANSACTION_TYPE_LABELS,
  type ListingPublicationStatus,
  type RetentionChoiceListing,
  type RetentionChoicesResponse,
} from '@/lib/listings';
import { cn } from '@/lib/utils';

type SortKey =
  | 'createdAtDesc'
  | 'createdAtAsc'
  | 'titleAsc'
  | 'priceDesc'
  | 'priceAsc';

type PublicationFilter = 'all' | ListingPublicationStatus;

const sortLabels: Record<SortKey, string> = {
  createdAtDesc: 'Najnowsze',
  createdAtAsc: 'Najstarsze',
  titleAsc: 'Tytuł A-Z',
  priceDesc: 'Cena malejąco',
  priceAsc: 'Cena rosnąco',
};

export function ListingRetentionChoicePanel() {
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [data, setData] = useState<RetentionChoicesResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('createdAtDesc');
  const [publicationFilter, setPublicationFilter] =
    useState<PublicationFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadChoices = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetchRetentionChoices();
      setData(response);
      setSelectedIds(response.selectedListingIds);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChoices();
  }, [loadChoices]);

  const limit = data?.limit ?? null;
  const selectedCount = selectedIds.length;
  const canSave =
    Boolean(data?.isOverLimit) &&
    limit !== null &&
    selectedCount <= limit &&
    !isSaving;

  const filteredListings = useMemo(() => {
    const query = normalizeSearch(search);

    return [...(data?.listings ?? [])]
      .filter((listing) => {
        if (
          publicationFilter !== 'all' &&
          listing.publicationStatus !== publicationFilter
        ) {
          return false;
        }

        if (!query) return true;

        const haystack = normalizeSearch(
          [
            listing.title,
            listing.address?.city,
            listing.address?.district,
            PROPERTY_TYPE_LABELS[listing.propertyType],
            TRANSACTION_TYPE_LABELS[listing.transactionType],
          ]
            .filter(Boolean)
            .join(' '),
        );

        return haystack.includes(query);
      })
      .sort((left, right) => sortListings(left, right, sort));
  }, [data?.listings, publicationFilter, search, sort]);

  if (isLoading) {
    return (
      <section
        id="retention-choices"
        className="rounded-xl border border-border bg-card p-4"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Ładowanie ofert do wyboru...
        </div>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section
        id="retention-choices"
        className="rounded-xl border border-destructive/30 bg-destructive/5 p-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-destructive">{errorMessage}</p>
          <Button type="button" variant="outline" size="sm" onClick={loadChoices}>
            Odśwież
          </Button>
        </div>
      </section>
    );
  }

  if (!data?.isOverLimit || limit === null) {
    return null;
  }

  async function handleSave() {
    if (!canSave) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await saveRetentionChoices(selectedIds);
      setData(response);
      setSelectedIds(response.selectedListingIds);
      showSuccessToast({
        title: 'Zapisano wybór ofert',
        description: `Wybrano ${response.selectedListingIds.length} z ${response.limit ?? 0} ofert do zachowania.`,
      });
    } catch (error) {
      const message = getApiErrorMessage(error);
      setErrorMessage(message);
      showErrorToast({
        title: 'Nie udało się zapisać wyboru',
        description: message,
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleToggle(listingId: string) {
    setSelectedIds((current) => {
      if (current.includes(listingId)) {
        return current.filter((id) => id !== listingId);
      }

      if (limit !== null && current.length >= limit) {
        return current;
      }

      return [...current, listingId];
    });
  }

  return (
    <section
      id="retention-choices"
      className="rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">
              Oferty do zachowania po egzekucji limitu
            </h2>
            <Badge variant={selectedCount === limit ? 'success' : 'warning'}>
              Wybrane {selectedCount}/{limit}
            </Badge>
          </div>
          <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
            Jeśli karencja się skończy, system zachowa najpierw wybrane tutaj
            oferty. Pozostały limit zostanie uzupełniony regułą automatyczną.
          </p>
          {data.limitGraceEndsAt ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              Koniec karencji: {formatDateTime(data.limitGraceEndsAt)}
            </div>
          ) : null}
        </div>

        <Button type="button" onClick={handleSave} disabled={!canSave}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Zapisz wybór
        </Button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_170px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-8"
            placeholder="Szukaj po tytule, mieście lub dzielnicy"
          />
        </label>

        <select
          value={publicationFilter}
          onChange={(event) =>
            setPublicationFilter(event.target.value as PublicationFilter)
          }
          className="h-8 rounded-lg border border-border/80 bg-card px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Filtr statusu publikacji"
        >
          <option value="all">Wszystkie publikacje</option>
          {Object.entries(LISTING_PUBLICATION_STATUS_LABELS).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ),
          )}
        </select>

        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as SortKey)}
          className="h-8 rounded-lg border border-border/80 bg-card px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Sortowanie ofert"
        >
          {Object.entries(sortLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {selectedCount > limit ? (
        <p className="mt-3 text-sm text-destructive">
          Wybrano więcej ofert niż pozwala obecny plan.
        </p>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-lg border border-border">
        {filteredListings.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Brak ofert pasujących do filtrów.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {filteredListings.map((listing) => {
              const isSelected = selectedIds.includes(listing.id);
              const isDisabled =
                !isSelected && limit !== null && selectedCount >= limit;

              return (
                <li key={listing.id}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50',
                      isSelected && 'bg-primary/5',
                      isDisabled && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isSelected}
                        disabled={isDisabled}
                        onChange={() => handleToggle(listing.id)}
                      />
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      ) : null}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium text-foreground">
                          {listing.title}
                        </span>
                        <Badge variant="muted">
                          {
                            LISTING_PUBLICATION_STATUS_LABELS[
                              listing.publicationStatus
                            ]
                          }
                        </Badge>
                      </span>
                      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{PROPERTY_TYPE_LABELS[listing.propertyType]}</span>
                        <span>{TRANSACTION_TYPE_LABELS[listing.transactionType]}</span>
                        <span>{formatListingLocation(listing)}</span>
                        <span>Dodano {formatDate(listing.createdAt)}</span>
                      </span>
                    </span>

                    <span className="shrink-0 text-right text-sm font-semibold text-foreground">
                      {formatPrice(listing.price, listing.currency)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function sortListings(
  left: RetentionChoiceListing,
  right: RetentionChoiceListing,
  sort: SortKey,
): number {
  if (sort === 'titleAsc') {
    return left.title.localeCompare(right.title, 'pl');
  }

  if (sort === 'priceAsc' || sort === 'priceDesc') {
    const result = Number(left.price) - Number(right.price);
    return sort === 'priceAsc' ? result : -result;
  }

  const result =
    new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  return sort === 'createdAtAsc' ? result : -result;
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase('pl-PL');
}

function formatListingLocation(listing: RetentionChoiceListing): string {
  const parts = [listing.address?.district, listing.address?.city].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Brak lokalizacji';
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
