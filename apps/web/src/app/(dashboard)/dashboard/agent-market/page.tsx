'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardPageHeader } from '@/components/dashboard/page-header';
import {
  ListingAgentProposalForm,
  INITIAL_LISTING_AGENT_PROPOSAL_FORM_VALUES,
  buildListingAgentProposalInput,
  type ListingAgentProposalFormErrors,
  type ListingAgentProposalFormValues,
} from '@/components/listings/listing-agent-proposal-form';
import { useToast } from '@/contexts/toast-context';
import { getApiErrorMessage, isFeatureAccessDeniedApiError } from '@/lib/api-client';
import {
  fetchAgentListingMarket,
  type AgentListingMarketFilters,
  type AgentListingMarketItem,
} from '@/lib/agent-listing-market';
import { createListingAgentProposal } from '@/lib/listing-agent-proposals';
import {
  formatPrice,
  PROPERTY_TYPE_LABELS,
  PropertyType,
  TRANSACTION_TYPE_LABELS,
  TransactionType,
} from '@/lib/listings';

const DEFAULT_FILTERS: AgentListingMarketFilters = {
  page: 1,
  limit: 12,
  sortBy: 'collaborationOpenedAt',
  sortOrder: 'DESC',
};

export default function AgentListingMarketPage() {
  const [filters, setFilters] =
    useState<AgentListingMarketFilters>(DEFAULT_FILTERS);
  const [items, setItems] = useState<AgentListingMarketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlanBlocked, setIsPlanBlocked] = useState(false);
  const [selectedListing, setSelectedListing] =
    useState<AgentListingMarketItem | null>(null);
  const [proposalDraft, setProposalDraft] =
    useState<ListingAgentProposalFormValues>(
      INITIAL_LISTING_AGENT_PROPOSAL_FORM_VALUES,
    );
  const [proposalErrors, setProposalErrors] =
    useState<ListingAgentProposalFormErrors>({});
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const { error: showErrorToast, success: showSuccessToast } = useToast();

  useEffect(() => {
    let cancelled = false;

    async function loadMarket() {
      setIsLoading(true);
      setError(null);
      setIsPlanBlocked(false);

      try {
        const result = await fetchAgentListingMarket(filters);
        if (!cancelled) {
          setItems(result.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setItems([]);
          setIsPlanBlocked(isFeatureAccessDeniedApiError(loadError));
          setError(getApiErrorMessage(loadError));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadMarket();

    return () => {
      cancelled = true;
    };
  }, [filters]);

  function updateFilter<K extends keyof AgentListingMarketFilters>(
    key: K,
    value: AgentListingMarketFilters[K],
  ) {
    setFilters((current) => ({
      ...current,
      page: 1,
      [key]: value || undefined,
    }));
  }

  function openProposalForm(item: AgentListingMarketItem) {
    setSelectedListing(item);
    setProposalDraft(INITIAL_LISTING_AGENT_PROPOSAL_FORM_VALUES);
    setProposalErrors({});
  }

  function closeProposalForm() {
    if (isSubmittingProposal) return;
    setSelectedListing(null);
    setProposalErrors({});
  }

  async function submitProposal() {
    if (!selectedListing) return;

    const validationErrors = validateProposalForm(proposalDraft);
    setProposalErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmittingProposal(true);

    try {
      await createListingAgentProposal(
        selectedListing.id,
        buildListingAgentProposalInput(proposalDraft),
      );
      setItems((current) =>
        current.map((item) =>
          item.id === selectedListing.id
            ? { ...item, hasSubmittedProposal: true }
            : item,
        ),
      );
      setSelectedListing(null);
      setProposalDraft(INITIAL_LISTING_AGENT_PROPOSAL_FORM_VALUES);
      showSuccessToast({
        title: 'Propozycja została wysłana',
        description: 'Właściciel zobaczy ją w zapytaniach do tej oferty.',
      });
    } catch (submitError) {
      showErrorToast({
        title: 'Nie udało się wysłać propozycji',
        description: getApiErrorMessage(submitError),
      });
    } finally {
      setIsSubmittingProposal(false);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Oferty szukające agenta"
        description="Przeglądaj publiczne oferty właścicieli, którzy są otwarci na współpracę z agentem."
        icon={Search}
      />

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Szukaj</span>
            <input
              value={filters.search ?? ''}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="Tytuł, miasto, dzielnica"
              className="h-10 w-full rounded-xl border border-border/80 bg-card px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Typ</span>
            <select
              value={filters.propertyType ?? ''}
              onChange={(event) =>
                updateFilter('propertyType', event.target.value as PropertyType)
              }
              className="h-10 w-full rounded-xl border border-border/80 bg-card px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Wszystkie</option>
              {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Transakcja</span>
            <select
              value={filters.transactionType ?? ''}
              onChange={(event) =>
                updateFilter(
                  'transactionType',
                  event.target.value as TransactionType,
                )
              }
              className="h-10 w-full rounded-xl border border-border/80 bg-card px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Wszystkie</option>
              {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Miasto</span>
            <input
              value={filters.city ?? ''}
              onChange={(event) => updateFilter('city', event.target.value)}
              placeholder="np. Warszawa"
              className="h-10 w-full rounded-xl border border-border/80 bg-card px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <MarketErrorState message={error} isPlanBlocked={isPlanBlocked} />
      ) : items.length === 0 ? (
        <section className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-heading text-2xl font-semibold">
            Brak ofert dla tych filtrów
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Zmień filtry albo wróć później, gdy właściciele opublikują nowe
            oferty otwarte na współpracę z agentami.
          </p>
        </section>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {items.map((item) => (
            <MarketListingCard
              key={item.id}
              item={item}
              onCreateProposal={openProposalForm}
            />
          ))}
        </div>
      )}

      {selectedListing ? (
        <ProposalModal
          listing={selectedListing}
          draft={proposalDraft}
          errors={proposalErrors}
          isSubmitting={isSubmittingProposal}
          onChange={setProposalDraft}
          onSubmit={submitProposal}
          onClose={closeProposalForm}
        />
      ) : null}
    </div>
  );
}

function MarketListingCard({
  item,
  onCreateProposal,
}: {
  item: AgentListingMarketItem;
  onCreateProposal: (item: AgentListingMarketItem) => void;
}) {
  return (
    <article className="grid overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:grid-cols-[180px_1fr]">
      <div
        className="min-h-44 bg-muted"
        style={
          item.primaryImage
            ? {
                backgroundImage: `url(${item.primaryImage.url})`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
              }
            : undefined
        }
      >
        {!item.primaryImage ? (
          <div className="flex h-full min-h-44 items-center justify-center text-muted-foreground">
            <Building2 className="h-8 w-8" />
          </div>
        ) : null}
      </div>
      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {PROPERTY_TYPE_LABELS[item.propertyType]}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {TRANSACTION_TYPE_LABELS[item.transactionType]}
          </span>
          {item.hasSubmittedProposal ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Wysłano propozycję
            </span>
          ) : null}
        </div>
        <h2 className="mt-3 font-heading text-xl font-semibold">
          {item.title}
        </h2>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {[item.address.city, item.address.district].filter(Boolean).join(', ') ||
            'Lokalizacja niedostępna'}
        </p>
        <p className="mt-4 text-lg font-semibold">
          {item.price ? formatPrice(Number(item.price), item.currency) : 'Cena ukryta'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/oferty/${item.slug}`}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted"
          >
            Zobacz ofertę
          </Link>
          <Button
            disabled={item.hasSubmittedProposal}
            className="rounded-xl"
            onClick={() => onCreateProposal(item)}
          >
            {item.hasSubmittedProposal ? 'Propozycja wysłana' : 'Złóż propozycję'}
          </Button>
        </div>
      </div>
    </article>
  );
}

function ProposalModal({
  listing,
  draft,
  errors,
  isSubmitting,
  onChange,
  onSubmit,
  onClose,
}: {
  listing: AgentListingMarketItem;
  draft: ListingAgentProposalFormValues;
  errors: ListingAgentProposalFormErrors;
  isSubmitting: boolean;
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
              Propozycja współpracy
            </p>
            <h2 className="mt-1 font-heading text-xl font-semibold">
              {listing.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {[listing.address.city, listing.address.district]
                .filter(Boolean)
                .join(', ') || 'Lokalizacja niedostępna'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
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
            disabled={isSubmitting}
            onChange={onChange}
            onSubmit={onSubmit}
            onCancel={onClose}
          />
        </div>
      </section>
    </div>
  );
}

function validateProposalForm(
  values: ListingAgentProposalFormValues,
): ListingAgentProposalFormErrors {
  const errors: ListingAgentProposalFormErrors = {};
  const services = values.services
    .split(/[\n,]/)
    .map((service) => service.trim())
    .filter(Boolean);
  const commissionValue = Number(values.commissionValue);
  const proposedPrice = Number(values.proposedPrice);
  const minimumContractMonths = Number(values.minimumContractMonths);

  if (values.commissionType !== 'none') {
    if (!values.commissionValue.trim()) {
      errors.commissionValue = 'Podaj wartość wynagrodzenia.';
    } else if (!Number.isFinite(commissionValue) || commissionValue < 0) {
      errors.commissionValue = 'Podaj poprawną wartość wynagrodzenia.';
    } else if (values.commissionType === 'percentage' && commissionValue > 100) {
      errors.commissionValue = 'Prowizja procentowa nie może przekraczać 100%.';
    }
  }

  if (
    values.minimumContractMonths.trim() &&
    (!Number.isInteger(minimumContractMonths) || minimumContractMonths < 0)
  ) {
    errors.minimumContractMonths = 'Podaj pełną liczbę miesięcy.';
  }

  if (services.length === 0) {
    errors.services = 'Podaj co najmniej jedną usługę.';
  }

  if (
    values.proposedPrice.trim() &&
    (!Number.isFinite(proposedPrice) || proposedPrice < 0)
  ) {
    errors.proposedPrice = 'Podaj poprawną proponowaną cenę.';
  }

  if (values.message.trim().length < 20) {
    errors.message = 'Wiadomość musi mieć co najmniej 20 znaków.';
  }

  if (values.validUntil) {
    const selectedDate = new Date(`${values.validUntil}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(selectedDate.getTime()) || selectedDate <= today) {
      errors.validUntil = 'Data ważności musi być w przyszłości.';
    }
  }

  return errors;
}

function MarketErrorState({
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
        {isPlanBlocked ? 'Funkcja dostępna w płatnym planie' : 'Nie udało się pobrać rynku ofert'}
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
