'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ExternalLink,
  Inbox,
  MessageSquareText,
  RefreshCw,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InlineSelect } from '@/components/ui/inline-select';
import { Input } from '@/components/ui/input';
import { OnboardingEmptyState } from '@/components/dashboard/onboarding-empty-state';
import { ClientPagination } from '@/components/clients/client-pagination';
import { usePublicInquiries } from '@/hooks/use-public-inquiries';
import { formatRelativeTime } from '@/lib/dashboard';
import {
  PUBLIC_LEAD_SOURCE_LABELS,
  PUBLIC_LEAD_STATUS_BADGE_VARIANT,
  PUBLIC_LEAD_STATUS_LABELS,
  type PublicInquiry,
  type PublicInquiryFilters,
  type PublicLeadSource,
  type PublicLeadStatus,
} from '@/lib/public-inquiries';
import { fetchListings, type Listing } from '@/lib/listings';

const DEFAULT_FILTERS: PublicInquiryFilters = {
  page: 1,
  limit: 12,
  sortBy: 'createdAt',
  sortOrder: 'DESC',
};

export default function PublicInquiriesPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const {
    inquiries,
    meta,
    isLoading,
    error,
    filters,
    updateFilter,
    setFilters,
    setPage,
    refresh,
  } = usePublicInquiries(DEFAULT_FILTERS);

  useEffect(() => {
    let isMounted = true;

    fetchListings({ limit: 100, sortBy: 'createdAt', sortOrder: 'DESC' })
      .then((result) => {
        if (isMounted) {
          setListings(result.data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setListings([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const hasFilters = Boolean(
    filters.search || filters.status || filters.source || filters.listingId,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Zapytania publiczne
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitoruj leady z publicznych stron ofert i ich powiązanie z CRM.
          </p>
        </div>
        <Button
          variant="outline"
          size="lg"
          className="w-full gap-2 rounded-xl sm:w-auto"
          onClick={refresh}
          disabled={isLoading}
        >
          <RefreshCw className="h-4 w-4" />
          Odśwież
        </Button>
      </div>

      <PublicInquiryFiltersBar
        filters={filters}
        listings={listings}
        onFilterChange={updateFilter}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : inquiries.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <>
          <div className="grid gap-4">
            {inquiries.map((inquiry) => (
              <PublicInquiryCard key={inquiry.id} inquiry={inquiry} />
            ))}
          </div>

          {meta && <ClientPagination meta={meta} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}

function PublicInquiryFiltersBar({
  filters,
  listings,
  onFilterChange,
  onReset,
}: {
  filters: PublicInquiryFilters;
  listings: Listing[];
  onFilterChange: <K extends keyof PublicInquiryFilters>(
    key: K,
    value: PublicInquiryFilters[K],
  ) => void;
  onReset: () => void;
}) {
  const hasActiveFilters =
    filters.search || filters.status || filters.source || filters.listingId;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[220px] max-w-sm flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Szukaj po kontakcie lub ofercie..."
          value={filters.search ?? ''}
          onChange={(event) =>
            onFilterChange('search', event.target.value || undefined)
          }
          className="h-9 rounded-xl pl-9"
        />
      </div>

      <InlineSelect
        size="sm"
        value={filters.status ?? ''}
        onChange={(value) =>
          onFilterChange(
            'status',
            (value || undefined) as PublicLeadStatus | undefined,
          )
        }
        placeholder="Status"
        options={Object.entries(PUBLIC_LEAD_STATUS_LABELS).map(
          ([value, label]) => ({ value, label }),
        )}
      />

      <InlineSelect
        size="sm"
        value={filters.source ?? ''}
        onChange={(value) =>
          onFilterChange(
            'source',
            (value || undefined) as PublicLeadSource | undefined,
          )
        }
        placeholder="Źródło"
        options={Object.entries(PUBLIC_LEAD_SOURCE_LABELS).map(
          ([value, label]) => ({ value, label }),
        )}
      />

      <InlineSelect
        size="sm"
        value={filters.listingId ?? ''}
        onChange={(value) => onFilterChange('listingId', value || undefined)}
        placeholder="Oferta"
        options={listings.map((listing) => ({
          value: listing.id,
          label: listing.publicTitle || listing.title,
        }))}
      />

      {hasActiveFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="gap-1 text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Wyczyść
        </Button>
      ) : null}
    </div>
  );
}

function PublicInquiryCard({ inquiry }: { inquiry: PublicInquiry }) {
  const statusVariant = PUBLIC_LEAD_STATUS_BADGE_VARIANT[inquiry.status];

  return (
    <article className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant}>
              {PUBLIC_LEAD_STATUS_LABELS[inquiry.status]}
            </Badge>
            <Badge variant="outline">
              {PUBLIC_LEAD_SOURCE_LABELS[inquiry.source]}
            </Badge>
            {inquiry.utmCampaign ? (
              <Badge variant="muted">UTM: {inquiry.utmCampaign}</Badge>
            ) : null}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="text-base font-semibold text-foreground">
                {inquiry.fullName}
              </h2>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(inquiry.createdAt)}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {inquiry.listing?.title ?? 'Oferta niedostępna'}
            </p>
          </div>

          {inquiry.message ? (
            <p className="line-clamp-3 max-w-4xl text-sm leading-6 text-foreground">
              {inquiry.message}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Zapytanie bez dodatkowej wiadomości.
            </p>
          )}

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span>{inquiry.email ?? 'Brak emaila'}</span>
            <span>{inquiry.phone ?? 'Brak telefonu'}</span>
            {inquiry.marketingConsent ? <span>Zgoda marketingowa</span> : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
          {inquiry.convertedClient ? (
            <Link href={`/dashboard/clients/${inquiry.convertedClient.id}`}>
              <Button variant="outline" size="sm" className="gap-2">
                <UserRound className="h-4 w-4" />
                Klient CRM
              </Button>
            </Link>
          ) : null}

          {inquiry.listing?.publicSlug ? (
            <Link
              href={`/oferty/${inquiry.listing.publicSlug}`}
              target="_blank"
            >
              <Button variant="ghost" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Oferta
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  if (hasFilters) {
    return (
      <OnboardingEmptyState
        icon={Search}
        title="Brak zapytań dla filtrów"
        description="Nie znaleźliśmy publicznych zapytań pasujących do wybranych kryteriów. Wyczyść filtry albo zmień wyszukiwanie."
        compact
        analyticsId="public_inquiries_filtered_empty"
      />
    );
  }

  return (
    <OnboardingEmptyState
      icon={Inbox}
      title="Czekasz na pierwsze zapytanie"
      description="Gdy ktoś wyśle formularz z publicznej strony oferty, zobaczysz tutaj źródło, status, ofertę i powiązanego klienta CRM."
      actionHref="/dashboard/listings"
      actionLabel="Przejdź do ofert"
      analyticsId="public_inquiries_empty"
    >
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        <MessageSquareText className="h-4 w-4 shrink-0" />
        Publiczne zapytania powstają automatycznie po wysłaniu formularza na
        stronie opublikowanej oferty.
      </div>
    </OnboardingEmptyState>
  );
}
