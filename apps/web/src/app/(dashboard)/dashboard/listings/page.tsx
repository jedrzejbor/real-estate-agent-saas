'use client';

import Link from 'next/link';
import { Plus, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ListingCard } from '@/components/listings/listing-card';
import { ListingFiltersBar } from '@/components/listings/listing-filters';
import { ListingPagination } from '@/components/listings/listing-pagination';
import { useListings } from '@/hooks/use-listings';

export default function ListingsPage() {
  const {
    listings,
    meta,
    isLoading,
    error,
    filters,
    updateFilter,
    setFilters,
    setPage,
  } = useListings();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Oferty
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Zarządzaj swoimi ofertami nieruchomości
          </p>
        </div>
        <Link href="/dashboard/listings/new">
          <Button size="lg" className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" />
            Dodaj ofertę
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <ListingFiltersBar
        filters={filters}
        onFilterChange={updateFilter}
        onReset={() =>
          setFilters({
            page: 1,
            limit: 12,
            sortBy: 'createdAt',
            sortOrder: 'DESC',
          })
        }
      />

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : listings.length === 0 ? (
        <EmptyState hasFilters={!!filters.search || !!filters.propertyType || !!filters.status} />
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

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white py-16">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Building2 className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-heading text-lg font-semibold text-foreground">
        {hasFilters ? 'Brak wyników' : 'Brak ofert'}
      </h3>
      <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
        {hasFilters
          ? 'Zmień kryteria wyszukiwania lub wyczyść filtry.'
          : 'Dodaj swoją pierwszą ofertę nieruchomości, aby rozpocząć.'}
      </p>
      {!hasFilters && (
        <Link href="/dashboard/listings/new" className="mt-6">
          <Button className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" />
            Dodaj pierwszą ofertę
          </Button>
        </Link>
      )}
    </div>
  );
}
