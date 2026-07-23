'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  Loader2,
  MapPin,
  Send,
  X,
} from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/page-header';
import { AgentListingMarketplaceAccessState } from '@/components/dashboard/agent-listing-marketplace-access-state';
import {
  ListingAgentProposalForm,
  buildListingAgentProposalInput,
  normalizeListingAgentProposalFormValues,
  validateListingAgentProposalForm,
  type ListingAgentProposalFormErrors,
  type ListingAgentProposalFormValues,
} from '@/components/listings/listing-agent-proposal-form';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { getApiErrorMessage, isFeatureAccessDeniedApiError } from '@/lib/api-client';
import { isAgentUser } from '@/lib/auth';
import {
  fetchAgentListingAgentProposals,
  updateAgentListingAgentProposal,
  withdrawAgentListingAgentProposal,
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
  const [editingProposal, setEditingProposal] =
    useState<ListingAgentProposal | null>(null);
  const [editDraft, setEditDraft] =
    useState<ListingAgentProposalFormValues | null>(null);
  const [editErrors, setEditErrors] =
    useState<ListingAgentProposalFormErrors>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const { user, isLoading: isAuthLoading } = useAuth();
  const { error: showErrorToast, success: showSuccessToast } = useToast();
  const isAgent = user ? isAgentUser(user) : false;

  useEffect(() => {
    if (isAuthLoading || !user || !isAgent) return;

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
  }, [isAgent, isAuthLoading, status, user]);

  function openEditModal(proposal: ListingAgentProposal) {
    setEditingProposal(proposal);
    setEditDraft(normalizeListingAgentProposalFormValues(proposal));
    setEditErrors({});
  }

  function closeEditModal() {
    if (isSavingEdit) return;
    setEditingProposal(null);
    setEditDraft(null);
    setEditErrors({});
  }

  async function submitEdit() {
    if (!editingProposal || !editDraft) return;

    const validationErrors = validateListingAgentProposalForm(editDraft);
    setEditErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSavingEdit(true);

    try {
      const updatedProposal = await updateAgentListingAgentProposal(
        editingProposal.id,
        buildListingAgentProposalInput(editDraft),
      );
      setProposals((current) =>
        current.map((proposal) =>
          proposal.id === updatedProposal.id ? updatedProposal : proposal,
        ),
      );
      setEditingProposal(null);
      setEditDraft(null);
      showSuccessToast({
        title: 'Propozycja została zaktualizowana',
        description: 'Właściciel zobaczy najnowsze warunki współpracy.',
      });
    } catch (saveError) {
      showErrorToast({
        title: 'Nie udało się zaktualizować propozycji',
        description: getApiErrorMessage(saveError),
      });
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function withdrawProposal(proposal: ListingAgentProposal) {
    const confirmed = window.confirm(
      'Czy na pewno chcesz wycofać tę propozycję współpracy?',
    );

    if (!confirmed) {
      return;
    }

    setWithdrawingId(proposal.id);

    try {
      const withdrawnProposal = await withdrawAgentListingAgentProposal(
        proposal.id,
      );
      setProposals((current) =>
        current.map((item) =>
          item.id === withdrawnProposal.id ? withdrawnProposal : item,
        ),
      );
      showSuccessToast({
        title: 'Propozycja została wycofana',
        description: 'Właściciel nie będzie mógł już jej zaakceptować.',
      });
    } catch (withdrawError) {
      showErrorToast({
        title: 'Nie udało się wycofać propozycji',
        description: getApiErrorMessage(withdrawError),
      });
    } finally {
      setWithdrawingId(null);
    }
  }

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

      {isAuthLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : user && !isAgent ? (
        <AgentListingMarketplaceAccessState
          variant="role"
          message="Wysłane propozycje współpracy są dostępne tylko dla kont agentów nieruchomości."
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <AgentListingMarketplaceAccessState
          variant={isPlanBlocked ? 'plan' : 'error'}
          message={error}
        />
      ) : proposals.length === 0 ? (
        <AgentProposalsEmptyState hasStatusFilter={Boolean(status)} />
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <AgentProposalCard
              key={proposal.id}
              proposal={proposal}
              isWithdrawing={withdrawingId === proposal.id}
              onEdit={openEditModal}
              onWithdraw={withdrawProposal}
            />
          ))}
        </div>
      )}

      {editingProposal && editDraft ? (
        <EditProposalModal
          proposal={editingProposal}
          draft={editDraft}
          errors={editErrors}
          isSaving={isSavingEdit}
          onChange={setEditDraft}
          onSubmit={submitEdit}
          onClose={closeEditModal}
        />
      ) : null}
    </div>
  );
}

function AgentProposalCard({
  proposal,
  isWithdrawing,
  onEdit,
  onWithdraw,
}: {
  proposal: ListingAgentProposal;
  isWithdrawing: boolean;
  onEdit: (proposal: ListingAgentProposal) => void;
  onWithdraw: (proposal: ListingAgentProposal) => void;
}) {
  const status = STATUS_COPY[proposal.status];
  const listing = proposal.listing;
  const canEdit = canEditAgentProposal(proposal);

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
        <Link
          href={`/dashboard/agent-proposals/${proposal.id}`}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Szczegóły i czat
        </Link>
        {canEdit ? (
          <>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => onEdit(proposal)}
            >
              <Edit3 className="h-4 w-4" />
              Edytuj
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-10 rounded-xl"
              disabled={isWithdrawing}
              onClick={() => onWithdraw(proposal)}
            >
              {isWithdrawing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Wycofaj
            </Button>
          </>
        ) : null}
      </div>
    </article>
  );
}

function EditProposalModal({
  proposal,
  draft,
  errors,
  isSaving,
  onChange,
  onSubmit,
  onClose,
}: {
  proposal: ListingAgentProposal;
  draft: ListingAgentProposalFormValues;
  errors: ListingAgentProposalFormErrors;
  isSaving: boolean;
  onChange: (value: ListingAgentProposalFormValues) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-card px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Edycja propozycji
            </p>
            <h2 className="mt-1 font-heading text-xl font-semibold">
              {proposal.listing?.title ?? 'Oferta niedostępna'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatListingLocation(proposal)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Zamknij formularz"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">
          <ListingAgentProposalForm
            value={draft}
            errors={errors}
            disabled={isSaving}
            submitLabel="Zapisz zmiany"
            onChange={onChange}
            onSubmit={onSubmit}
            onCancel={onClose}
          />
        </div>
      </section>
    </div>
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

function canEditAgentProposal(proposal: ListingAgentProposal): boolean {
  return proposal.status === 'sent' || proposal.status === 'updated';
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
