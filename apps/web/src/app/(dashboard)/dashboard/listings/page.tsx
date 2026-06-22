'use client';

import Link from 'next/link';
import { Building2, ListChecks, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingEmptyState } from '@/components/dashboard/onboarding-empty-state';
import { PlanLimitStatusBanner } from '@/components/growth/plan-limit-status-banner';
import { ListingCard } from '@/components/listings/listing-card';
import { ListingFiltersBar } from '@/components/listings/listing-filters';
import { ListingPagination } from '@/components/listings/listing-pagination';
import { ListingRetentionChoicePanel } from '@/components/listings/listing-retention-choice-panel';
import { useAuth } from '@/contexts/auth-context';
import { useListings } from '@/hooks/use-listings';

export default function ListingsPage() {
  const { user } = useAuth();
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
  const activeListingsLimit = user?.entitlements.limits.activeListings ?? null;
  const shouldShowRetentionChoices =
    user !== null &&
    activeListingsLimit !== null &&
    user.usage.activeListings > activeListingsLimit;

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

      {user ? (
        <PlanLimitStatusBanner
          user={user}
          resources={['activeListings']}
          source="listings_page_limit_state"
        >
          {shouldShowRetentionChoices ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 rounded-xl"
              render={<a href="#retention-choices" />}
            >
              <ListChecks className="h-3.5 w-3.5" />
              Wybierz oferty
            </Button>
          ) : null}
        </PlanLimitStatusBanner>
      ) : null}

      {shouldShowRetentionChoices ? <ListingRetentionChoicePanel /> : null}

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
        <EmptyState
          hasFilters={
            !!filters.search || !!filters.propertyType || !!filters.status
          }
        />
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
  if (hasFilters) {
    return (
      <OnboardingEmptyState
        icon={Building2}
        title="Brak wyników"
        description="Nie znaleźliśmy ofert dla wybranych filtrów. Wyczyść kryteria albo zmień zapytanie, żeby wrócić do pełnej listy."
        compact
        analyticsId="listings_filtered_empty"
      />
    );
  }

  return (
    <OnboardingEmptyState
      icon={Building2}
      title="Dodaj pierwszą ofertę"
      description="Oferta jest pierwszym praktycznym krokiem w EstateFlow: po jej zapisaniu dashboard, raporty i późniejsze publiczne strony zaczną mieć realne dane."
      actionHref="/dashboard/listings/new"
      actionLabel="Dodaj ofertę"
      secondaryHref="/dashboard"
      secondaryLabel="Wróć do checklisty"
      analyticsId="listings_empty"
    />
  );
}
