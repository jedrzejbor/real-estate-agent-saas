'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CalendarDays,
  Copy,
  Handshake,
  Loader2,
  MapPin,
} from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/page-header';
import { AgentListingMarketplaceAccessState } from '@/components/dashboard/agent-listing-marketplace-access-state';
import { useAuth } from '@/contexts/auth-context';
import { getApiErrorMessage, isFeatureAccessDeniedApiError } from '@/lib/api-client';
import { isAgentUser } from '@/lib/auth';
import {
  fetchAgentListingAssignments,
  type ListingAgentAssignmentListItem,
  type ListingAgentAssignmentStatus,
} from '@/lib/listing-agent-proposals';
import { formatPrice } from '@/lib/listings';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: Array<{
  value: ListingAgentAssignmentStatus | '';
  label: string;
}> = [
  { value: 'active', label: 'Aktywne' },
  { value: '', label: 'Wszystkie' },
  { value: 'completed', label: 'Zakończone' },
  { value: 'revoked', label: 'Cofnięte' },
];

const STATUS_COPY: Record<
  ListingAgentAssignmentStatus,
  { label: string; description: string; className: string }
> = {
  active: {
    label: 'Aktywna',
    description: 'Właściciel zaakceptował Twoją propozycję współpracy.',
    className: 'bg-emerald-100 text-emerald-900',
  },
  completed: {
    label: 'Zakończona',
    description: 'Współpraca została oznaczona jako zakończona.',
    className: 'bg-stone-200 text-stone-800',
  },
  revoked: {
    label: 'Cofnięta',
    description: 'Współpraca została cofnięta.',
    className: 'bg-red-100 text-red-900',
  },
};

export default function AgentAssignmentsPage() {
  const [status, setStatus] = useState<ListingAgentAssignmentStatus | ''>(
    'active',
  );
  const [assignments, setAssignments] = useState<
    ListingAgentAssignmentListItem[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlanBlocked, setIsPlanBlocked] = useState(false);
  const { user, isLoading: isAuthLoading } = useAuth();
  const isAgent = user ? isAgentUser(user) : false;

  useEffect(() => {
    if (isAuthLoading || !user || !isAgent) return;

    let cancelled = false;

    async function loadAssignments() {
      setIsLoading(true);
      setError(null);
      setIsPlanBlocked(false);

      try {
        const result = await fetchAgentListingAssignments({
          status: status || undefined,
          page: 1,
          limit: 50,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        });

        if (!cancelled) {
          setAssignments(result.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setAssignments([]);
          setIsPlanBlocked(isFeatureAccessDeniedApiError(loadError));
          setError(getApiErrorMessage(loadError));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAssignments();

    return () => {
      cancelled = true;
    };
  }, [isAgent, isAuthLoading, status, user]);

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Współprace"
        description="Zarządzaj ofertami, przy których właściciel zaakceptował Twoją propozycję."
        icon={Handshake}
      />

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <label className="block max-w-xs space-y-1.5">
          <span className="text-sm font-medium">Status</span>
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as ListingAgentAssignmentStatus | '')
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

      {isAuthLoading ? (
        <LoadingState />
      ) : user && !isAgent ? (
        <AgentListingMarketplaceAccessState
          variant="role"
          message="Zaakceptowane współprace są dostępne tylko dla kont agentów nieruchomości."
        />
      ) : isLoading ? (
        <LoadingState />
      ) : error ? (
        <AgentListingMarketplaceAccessState
          variant={isPlanBlocked ? 'plan' : 'error'}
          message={error}
        />
      ) : assignments.length === 0 ? (
        <AssignmentsEmptyState hasStatusFilter={Boolean(status)} />
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <AssignmentCard key={assignment.id} assignment={assignment} />
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function AssignmentCard({
  assignment,
}: {
  assignment: ListingAgentAssignmentListItem;
}) {
  const status = STATUS_COPY[assignment.status];
  const listing = assignment.listing;

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
            {assignment.agentListingId ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                <Copy className="h-3.5 w-3.5" />
                Kopia w CRM
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                <Copy className="h-3.5 w-3.5" />
                Bez kopii w CRM
              </span>
            )}
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
              {formatListingLocation(assignment)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              Zaakceptowano {formatDate(assignment.createdAt)}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-left lg:text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Cena oferty
          </p>
          <p className="mt-1 text-lg font-semibold">
            {listing?.price
              ? formatPrice(Number(listing.price), listing.currency)
              : 'ukryta'}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {listing?.slug ? (
          <Link
            href={`/oferty/${listing.slug}`}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted"
          >
            Zobacz ofertę
          </Link>
        ) : null}
        {assignment.proposalId ? (
          <Link
            href={`/dashboard/agent-proposals/${assignment.proposalId}`}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted"
          >
            Propozycja i czat
          </Link>
        ) : null}
        {assignment.agentListingId ? (
          <Link
            href={`/dashboard/listings/${assignment.agentListingId}`}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Otwórz kopię CRM
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex h-10 cursor-not-allowed items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground opacity-60"
          >
            Utwórz kopię w CRM
          </button>
        )}
      </div>
    </article>
  );
}

function AssignmentsEmptyState({
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
        {hasStatusFilter
          ? 'Brak współprac w tym statusie'
          : 'Brak zaakceptowanych współprac'}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Gdy właściciel zaakceptuje Twoją propozycję, zobaczysz tutaj ofertę i
        możliwość przejścia do kolejnego kroku.
      </p>
      <Link
        href="/dashboard/agent-proposals"
        className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Wysłane propozycje
      </Link>
    </section>
  );
}

function formatListingLocation(
  assignment: ListingAgentAssignmentListItem,
): string {
  const listing = assignment.listing;

  if (!listing) {
    return 'Lokalizacja niedostępna';
  }

  return [listing.city, listing.district].filter(Boolean).join(', ') ||
    'Lokalizacja niedostępna';
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}
