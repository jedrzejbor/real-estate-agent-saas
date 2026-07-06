'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, Eye, ImageIcon, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ActiveFilterChips,
  type ActiveFilterChip,
} from '@/components/dashboard/active-filter-chips';
import { DashboardErrorState } from '@/components/dashboard/error-state';
import { DashboardFilteredEmptyState } from '@/components/dashboard/filtered-empty-state';
import { DashboardPageHeader } from '@/components/dashboard/page-header';
import {
  DashboardViewModeToggle,
  type DashboardViewMode,
} from '@/components/dashboard/view-mode-toggle';
import { PlanLimitStatusBanner } from '@/components/growth/plan-limit-status-banner';
import { ListingCard } from '@/components/listings/listing-card';
import { ListingFiltersBar } from '@/components/listings/listing-filters';
import { ListingPagination } from '@/components/listings/listing-pagination';
import { ListingRetentionChoiceModal } from '@/components/listings/listing-retention-choice-modal';
import { ListingStatusBadge } from '@/components/listings/listing-status-badge';
import { useAuth } from '@/contexts/auth-context';
import { useListings } from '@/hooks/use-listings';
import {
  formatArea,
  formatListingCommission,
  formatPrice,
  ListingStatus,
  LISTING_PUBLICATION_STATUS_LABELS,
  LISTING_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  TransactionType,
  TRANSACTION_TYPE_LABELS,
  type Listing,
  type ListingFilters,
} from '@/lib/listings';

const LISTING_DEFAULT_FILTERS: ListingFilters = {
  page: 1,
  limit: 12,
  sortBy: 'createdAt',
  sortOrder: 'DESC',
};

const LISTING_QUICK_FILTERS: Array<{
  id: string;
  label: string;
  description: string;
  filters: Partial<ListingFilters>;
}> = [
  {
    id: 'drafts',
    label: 'Szkice',
    description: 'Oferty do uzupełnienia',
    filters: { status: ListingStatus.DRAFT },
  },
  {
    id: 'active',
    label: 'Aktywne',
    description: 'Bieżący portfel',
    filters: { status: ListingStatus.ACTIVE },
  },
  {
    id: 'sale',
    label: 'Sprzedaż',
    description: 'Transakcje sprzedaży',
    filters: { transactionType: TransactionType.SALE },
  },
  {
    id: 'rent',
    label: 'Wynajem',
    description: 'Transakcje najmu',
    filters: { transactionType: TransactionType.RENT },
  },
];

export default function ListingsPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<DashboardViewMode>('cards');
  const {
    listings,
    meta,
    isLoading,
    error,
    filters,
    updateFilter,
    setFilters,
    setPage,
    refresh,
  } = useListings();
  const activeListingsLimit = user?.entitlements.limits.activeListings ?? null;
  const shouldShowRetentionChoices =
    user !== null &&
    activeListingsLimit !== null &&
    user.usage.activeListings > activeListingsLimit;
  const activeFilterChips = getActiveListingFilterChips(filters, updateFilter);

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Oferty"
        description="Zarządzaj swoimi ofertami nieruchomości"
        icon={Building2}
        actions={
          <Link href="/dashboard/listings/new">
            <Button size="lg" className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              Dodaj ofertę
            </Button>
          </Link>
        }
      />

      {user ? (
        <PlanLimitStatusBanner
          user={user}
          resources={['activeListings']}
          source="listings_page_limit_state"
        >
          {shouldShowRetentionChoices ? (
            <ListingRetentionChoiceModal source="listings_page_limit_state" />
          ) : null}
        </PlanLimitStatusBanner>
      ) : null}

      {/* Filters */}
      <ListingFiltersBar
        filters={filters}
        onFilterChange={updateFilter}
        onReset={() => setFilters(LISTING_DEFAULT_FILTERS)}
      />

      <ActiveFilterChips
        filters={activeFilterChips}
        onClearAll={() => setFilters(LISTING_DEFAULT_FILTERS)}
      />

      <ListingOperationsToolbar
        filters={filters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onApplyQuickFilter={(quickFilters) =>
          setFilters({
            ...LISTING_DEFAULT_FILTERS,
            ...quickFilters,
          })
        }
      />

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <DashboardErrorState
          title="Nie udało się załadować ofert."
          description={`Lista ofert nie została pobrana. ${error}`}
          onRetry={refresh}
        />
      ) : listings.length === 0 ? (
        <EmptyState
          filters={activeFilterChips}
          onClearFilters={() => setFilters(LISTING_DEFAULT_FILTERS)}
        />
      ) : viewMode === 'list' ? (
        <>
          <ListingTable listings={listings} />
          {meta && <ListingPagination meta={meta} onPageChange={setPage} />}
        </>
      ) : (
        <>
          {/* Grid */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>

          {/* Pagination */}
          {meta && <ListingPagination meta={meta} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}

function getActiveListingFilterChips(
  filters: ListingFilters,
  updateFilter: <K extends keyof ListingFilters>(
    key: K,
    value: ListingFilters[K],
  ) => void,
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  if (filters.search) {
    chips.push({
      id: 'search',
      label: 'Szukaj',
      value: filters.search,
      onRemove: () => updateFilter('search', undefined),
    });
  }

  if (filters.propertyType) {
    chips.push({
      id: 'propertyType',
      label: 'Typ',
      value: PROPERTY_TYPE_LABELS[filters.propertyType],
      onRemove: () => updateFilter('propertyType', undefined),
    });
  }

  if (filters.transactionType) {
    chips.push({
      id: 'transactionType',
      label: 'Transakcja',
      value: TRANSACTION_TYPE_LABELS[filters.transactionType],
      onRemove: () => updateFilter('transactionType', undefined),
    });
  }

  if (filters.status) {
    chips.push({
      id: 'status',
      label: 'Status',
      value: LISTING_STATUS_LABELS[filters.status],
      onRemove: () => updateFilter('status', undefined),
    });
  }

  if (filters.city) {
    chips.push({
      id: 'city',
      label: 'Miasto',
      value: filters.city,
      onRemove: () => updateFilter('city', undefined),
    });
  }

  if (filters.priceMin !== undefined) {
    chips.push({
      id: 'priceMin',
      label: 'Cena od',
      value: formatPrice(filters.priceMin),
      onRemove: () => updateFilter('priceMin', undefined),
    });
  }

  if (filters.priceMax !== undefined) {
    chips.push({
      id: 'priceMax',
      label: 'Cena do',
      value: formatPrice(filters.priceMax),
      onRemove: () => updateFilter('priceMax', undefined),
    });
  }

  if (filters.areaMin !== undefined) {
    chips.push({
      id: 'areaMin',
      label: 'Metraż od',
      value: formatArea(filters.areaMin),
      onRemove: () => updateFilter('areaMin', undefined),
    });
  }

  if (filters.areaMax !== undefined) {
    chips.push({
      id: 'areaMax',
      label: 'Metraż do',
      value: formatArea(filters.areaMax),
      onRemove: () => updateFilter('areaMax', undefined),
    });
  }

  if (filters.roomsMin !== undefined) {
    chips.push({
      id: 'roomsMin',
      label: 'Pokoje od',
      value: String(filters.roomsMin),
      onRemove: () => updateFilter('roomsMin', undefined),
    });
  }

  return chips;
}

function ListingOperationsToolbar({
  filters,
  viewMode,
  onViewModeChange,
  onApplyQuickFilter,
}: {
  filters: ListingFilters;
  viewMode: DashboardViewMode;
  onViewModeChange: (mode: DashboardViewMode) => void;
  onApplyQuickFilter: (filters: Partial<ListingFilters>) => void;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {LISTING_QUICK_FILTERS.map((item) => {
          const isActive = Object.entries(item.filters).every(
            ([key, value]) => filters[key as keyof ListingFilters] === value,
          );

          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onApplyQuickFilter(item.filters)}
              className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                isActive
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="block text-xs font-semibold">{item.label}</span>
              <span className="block text-[0.68rem]">{item.description}</span>
            </button>
          );
        })}
      </div>
      <DashboardViewModeToggle value={viewMode} onChange={onViewModeChange} />
    </section>
  );
}

function ListingTable({ listings }: { listings: Listing[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="border-b border-border bg-muted/30 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Oferta</th>
              <th className="px-4 py-3 text-left font-semibold">Cena</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Publikacja</th>
              <th className="px-4 py-3 text-left font-semibold">Aktywność</th>
              <th className="px-4 py-3 text-right font-semibold">Akcja</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {listings.map((listing) => {
              const location = [listing.address?.district, listing.address?.city]
                .filter(Boolean)
                .join(', ');
              const area = listing.areaM2 ?? listing.plotAreaM2;
              const metric = area ? formatArea(area) : null;
              const imageCount = listing.images?.length ?? 0;

              return (
                <tr key={listing.id} className="hover:bg-muted/20">
                  <td className="max-w-[340px] px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/listings/${listing.id}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {listing.title}
                        </Link>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {[
                            PROPERTY_TYPE_LABELS[listing.propertyType],
                            TRANSACTION_TYPE_LABELS[listing.transactionType],
                            location,
                            metric,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">
                      {formatPrice(listing.price, listing.currency)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Prowizja: {formatListingCommission(listing)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <ListingStatusBadge status={listing.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        listing.publicationStatus === 'published'
                          ? 'success'
                          : 'secondary'
                      }
                    >
                      {LISTING_PUBLICATION_STATUS_LABELS[
                        listing.publicationStatus
                      ]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {listing.publicViewCount ?? 0} wyświetleń
                      </span>
                      <span>{imageCount} zdjęć</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      render={<Link href={`/dashboard/listings/${listing.id}`} />}
                    >
                      Otwórz
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({
  filters,
  onClearFilters,
}: {
  filters: ActiveFilterChip[];
  onClearFilters: () => void;
}) {
  return (
    <DashboardFilteredEmptyState
      icon={Building2}
      title="Dodaj pierwszą ofertę"
      description="Po zapisie zobaczysz statusy, publikację i raporty."
      filteredDescription="Nie znaleziono ofert dla aktywnych filtrów. Usuń wybrane filtry albo wyczyść je wszystkie."
      filters={filters}
      onClearFilters={onClearFilters}
      actionHref="/dashboard/listings/new"
      actionLabel="Dodaj ofertę"
      secondaryHref="/dashboard"
      secondaryLabel="Wróć do checklisty"
      analyticsId="listings_empty"
    />
  );
}
