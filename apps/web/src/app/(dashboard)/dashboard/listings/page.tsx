'use client';

import Link from 'next/link';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardPageHeader } from '@/components/dashboard/page-header';
import { OnboardingEmptyState } from '@/components/dashboard/onboarding-empty-state';
import { PlanLimitStatusBanner } from '@/components/growth/plan-limit-status-banner';
import { ListingCard } from '@/components/listings/listing-card';
import { ListingFiltersBar } from '@/components/listings/listing-filters';
import { ListingPagination } from '@/components/listings/listing-pagination';
import { ListingRetentionChoiceModal } from '@/components/listings/listing-retention-choice-modal';
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
        description="Zmień filtry albo wyczyść wyszukiwanie."
        compact
        analyticsId="listings_filtered_empty"
      />
    );
  }

  return (
    <OnboardingEmptyState
      icon={Building2}
      title="Dodaj pierwszą ofertę"
      description="Po zapisie zobaczysz statusy, publikację i raporty."
      actionHref="/dashboard/listings/new"
      actionLabel="Dodaj ofertę"
      secondaryHref="/dashboard"
      secondaryLabel="Wróć do checklisty"
      analyticsId="listings_empty"
    />
  );
}
