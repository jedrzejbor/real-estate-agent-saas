'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  Send,
} from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/page-header';
import { getApiErrorMessage, isFeatureAccessDeniedApiError } from '@/lib/api-client';
import {
  fetchAgentListingAgentProposals,
  type ListingAgentProposal,
  type ListingAgentProposalStatus,
} from '@/lib/listing-agent-proposals';
import { formatPrice } from '@/lib/listings';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: Array<{
  value: ListingAgentProposalStatus | '';
  label: string;
}> = [
  { value: '', label: 'Wszystkie' },
  { value: 'sent', label: 'Wysłane' },
  { value: 'updated', label: 'Zaktualizowane' },
  { value: 'accepted', label: 'Zaakceptowane' },
  { value: 'rejected', label: 'Odrzucone' },
  { value: 'withdrawn', label: 'Wycofane' },
  { value: 'expired', label: 'Wygasłe' },
  { value: 'closed', label: 'Zamknięte' },
];

const STATUS_COPY: Record<
  ListingAgentProposalStatus,
  { label: string; description: string; className: string }
> = {
  draft: {
    label: 'Szkic',
    description: 'Propozycja nie została jeszcze wysłana.',
    className: 'bg-muted text-muted-foreground',
  },
  sent: {
    label: 'Wysłana',
    description: 'Propozycja czeka na decyzję właściciela.',
    className: 'bg-blue-100 text-blue-900',
  },
  updated: {
    label: 'Zaktualizowana',
    description: 'Warunki propozycji zostały zmienione.',
    className: 'bg-amber-100 text-amber-900',
  },
  accepted: {
    label: 'Zaakceptowana',
    description: 'Właściciel wybrał Twoją propozycję.',
    className: 'bg-emerald-100 text-emerald-900',
  },
  rejected: {
    label: 'Odrzucona',
    description: 'Właściciel odrzucił tę propozycję.',
    className: 'bg-red-100 text-red-900',
  },
  withdrawn: {
    label: 'Wycofana',
    description: 'Propozycja została wycofana.',
    className: 'bg-stone-200 text-stone-800',
  },
  expired: {
    label: 'Wygasła',
    description: 'Termin ważności propozycji minął.',
    className: 'bg-stone-200 text-stone-800',
  },
  closed: {
    label: 'Zamknięta',
    description: 'Nabór dla tej oferty został zamknięty.',
    className: 'bg-stone-200 text-stone-800',
  },
};

export default function AgentProposalsPage() {
  const [status, setStatus] = useState<ListingAgentProposalStatus | ''>('');
  const [proposals, setProposals] = useState<ListingAgentProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlanBlocked, setIsPlanBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProposals() {
      setIsLoading(true);
      setError(null);
      setIsPlanBlocked(false);

      try {
        const result = await fetchAgentListingAgentProposals({
          status: status || undefined,
          page: 1,
          limit: 50,
          sortBy: 'updatedAt',
          sortOrder: 'DESC',
        });

        if (!cancelled) {
          setProposals(result.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setProposals([]);
          setIsPlanBlocked(isFeatureAccessDeniedApiError(loadError));
          setError(getApiErrorMessage(loadError));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProposals();

    return () => {
      cancelled = true;
    };
  }, [status]);

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Wysłane propozycje"
        description="Śledź propozycje współpracy wysłane do właścicieli ofert."
        icon={Send}
      />

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <label className="block max-w-xs space-y-1.5">
          <span className="text-sm font-medium">Status</span>
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as ListingAgentProposalStatus | '')
            }
            className="h-10 w-full rounded-xl border border-border/80 bg-card px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <AgentProposalsErrorState
          message={error}
          isPlanBlocked={isPlanBlocked}
        />
      ) : proposals.length === 0 ? (
        <AgentProposalsEmptyState hasStatusFilter={Boolean(status)} />
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <AgentProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </div>
      )}
    </div>
  );
}

function AgentProposalCard({
  proposal,
}: {
  proposal: ListingAgentProposal;
}) {
  const status = STATUS_COPY[proposal.status];
  const listing = proposal.listing;

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
                status.className,
              )}
            >
              {status.label}
            </span>
            {proposal.assignment?.status === 'active' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Aktywna współpraca
              </span>
            ) : null}
          </div>

          <h2 className="mt-3 font-heading text-xl font-semibold">
            {listing?.title ?? 'Oferta niedostępna'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {status.description}
          </p>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {formatListingLocation(proposal)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              Wysłano {formatDate(proposal.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-4 w-4" />
              Aktualizacja {formatDate(proposal.updatedAt)}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-left lg:text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Prowizja
          </p>
          <p className="mt-1 text-lg font-semibold">
            {formatProposalCommission(proposal)}
          </p>
          {proposal.validUntil ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Ważna do {formatDate(proposal.validUntil)}
            </p>
          ) : null}
        </div>
      </div>

      {proposal.services.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {proposal.services.slice(0, 5).map((service) => (
            <span
              key={service}
              className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
            >
              {service}
            </span>
          ))}
          {proposal.services.length > 5 ? (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              +{proposal.services.length - 5}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {listing?.slug ? (
          <Link
            href={`/oferty/${listing.slug}`}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted"
          >
            Zobacz ofertę
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function AgentProposalsEmptyState({
  hasStatusFilter,
}: {
  hasStatusFilter: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Building2 className="h-6 w-6" />
      </div>
      <h2 className="mt-4 font-heading text-2xl font-semibold">
        {hasStatusFilter ? 'Brak propozycji w tym statusie' : 'Nie wysłano jeszcze propozycji'}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {hasStatusFilter
          ? 'Zmień filtr statusu, aby zobaczyć pozostałe propozycje.'
          : 'Przejdź do rynku ofert i wyślij pierwszą propozycję właścicielowi.'}
      </p>
      {!hasStatusFilter ? (
        <Link
          href="/dashboard/agent-market"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Przejdź do ofert
        </Link>
      ) : null}
    </section>
  );
}

function AgentProposalsErrorState({
  message,
  isPlanBlocked,
}: {
  message: string;
  isPlanBlocked: boolean;
}) {
  return (
    <section className="rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h2 className="mt-4 font-heading text-2xl font-semibold">
        {isPlanBlocked ? 'Funkcja dostępna w płatnym planie' : 'Nie udało się pobrać propozycji'}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {message}
      </p>
      {isPlanBlocked ? (
        <Link
          href="/dashboard/upgrade"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Zobacz plany
        </Link>
      ) : null}
    </section>
  );
}

function formatListingLocation(proposal: ListingAgentProposal): string {
  const listing = proposal.listing;

  if (!listing) {
    return 'Lokalizacja niedostępna';
  }

  return [listing.city, listing.district].filter(Boolean).join(', ') ||
    'Lokalizacja niedostępna';
}

function formatProposalCommission(proposal: ListingAgentProposal): string {
  if (proposal.commissionType === 'none') {
    return 'brak';
  }

  if (proposal.commissionValue === null || proposal.commissionValue === undefined) {
    return 'do ustalenia';
  }

  const value = Number(proposal.commissionValue);
  if (!Number.isFinite(value)) {
    return 'do ustalenia';
  }

  if (proposal.commissionType === 'percentage') {
    return `${value.toLocaleString('pl-PL')}%`;
  }

  if (proposal.commissionType === 'fixed') {
    return formatPrice(value, proposal.listing?.currency ?? 'PLN');
  }

  return `${value.toLocaleString('pl-PL')} + warunki`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}
