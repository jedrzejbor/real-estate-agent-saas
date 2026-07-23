'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  MessageSquareText,
} from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/page-header';
import { AgentListingMarketplaceAccessState } from '@/components/dashboard/agent-listing-marketplace-access-state';
import { ListingAgentProposalChat } from '@/components/listings/listing-agent-proposal-chat';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { getApiErrorMessage, isFeatureAccessDeniedApiError } from '@/lib/api-client';
import { isAgentUser } from '@/lib/auth';
import {
  createListingAgentProposalMessage,
  fetchAgentListingAgentProposal,
  fetchListingAgentProposalMessages,
  type ListingAgentProposal,
  type ListingAgentProposalMessage,
  type ListingAgentProposalStatus,
} from '@/lib/listing-agent-proposals';
import { formatPrice } from '@/lib/listings';
import { cn } from '@/lib/utils';

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
    description: 'Właściciel widzi najnowsze warunki współpracy.',
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

export default function AgentProposalDetailPage() {
  const params = useParams<{ id: string }>();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { error: showErrorToast } = useToast();
  const [proposal, setProposal] = useState<ListingAgentProposal | null>(null);
  const [messages, setMessages] = useState<ListingAgentProposalMessage[]>([]);
  const [messageBody, setMessageBody] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlanBlocked, setIsPlanBlocked] = useState(false);
  const canMessage = proposal
    ? ['sent', 'updated', 'accepted'].includes(proposal.status)
    : false;
  const isAgent = user ? isAgentUser(user) : false;
  const pageTitle = useMemo(
    () => proposal?.listing?.title ?? 'Szczegóły propozycji',
    [proposal],
  );

  useEffect(() => {
    if (isAuthLoading || !user || !isAgent) return;

    let cancelled = false;

    async function loadProposal() {
      setIsLoading(true);
      setError(null);
      setIsPlanBlocked(false);

      try {
        const [proposalResult, messageResult] = await Promise.all([
          fetchAgentListingAgentProposal(params.id),
          fetchListingAgentProposalMessages(params.id, {
            page: 1,
            limit: 100,
          }),
        ]);

        if (!cancelled) {
          setProposal(proposalResult);
          setMessages(messageResult.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setIsPlanBlocked(isFeatureAccessDeniedApiError(loadError));
          setError(getApiErrorMessage(loadError));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProposal();

    return () => {
      cancelled = true;
    };
  }, [isAgent, isAuthLoading, params.id, user]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!proposal || !messageBody.trim()) {
      return;
    }

    setIsSendingMessage(true);

    try {
      const created = await createListingAgentProposalMessage(
        proposal.id,
        messageBody,
      );
      setMessages((current) => [...current, created]);
      setMessageBody('');
    } catch (sendError) {
      showErrorToast({
        title: 'Nie udało się wysłać wiadomości',
        description: getApiErrorMessage(sendError),
      });
    } finally {
      setIsSendingMessage(false);
    }
  }

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && !isAgent) {
    return (
      <div className="space-y-6">
        <DashboardPageHeader
          title="Szczegóły propozycji"
          description="Dostęp do rozmów o propozycjach jest ograniczony do kont agentów."
          icon={MessageSquareText}
        />
        <AgentListingMarketplaceAccessState
          variant="role"
          message="Szczegóły propozycji i czat z właścicielem są dostępne tylko dla kont agentów nieruchomości."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="space-y-6">
        <DashboardPageHeader
          title="Szczegóły propozycji"
          description="Nie udało się pobrać danych propozycji."
          icon={MessageSquareText}
        />
        <AgentListingMarketplaceAccessState
          variant={isPlanBlocked ? 'plan' : 'error'}
          message={error ?? 'Propozycja jest niedostępna.'}
        />
      </div>
    );
  }

  const status = STATUS_COPY[proposal.status];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DashboardPageHeader
          title="Szczegóły propozycji"
          description={pageTitle}
          icon={MessageSquareText}
        />
        <Link
          href="/dashboard/agent-proposals"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć
        </Link>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold',
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
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {formatDate(proposal.createdAt)}
              </span>
            </div>

            <h1 className="mt-4 font-heading text-3xl font-bold leading-tight">
              {proposal.listing?.title ?? 'Oferta niedostępna'}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {status.description}
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {formatListingLocation(proposal)}
            </p>
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

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ProposalMetric
            label="Umowa"
            value={formatProposalExclusivity(proposal)}
          />
          <ProposalMetric
            label="Minimalny czas"
            value={
              proposal.minimumContractMonths
                ? `${proposal.minimumContractMonths} mies.`
                : 'do ustalenia'
            }
          />
          <ProposalMetric
            label="Wycena"
            value={
              proposal.proposedPrice
                ? formatPrice(
                    Number(proposal.proposedPrice),
                    proposal.listing?.currency ?? 'PLN',
                  )
                : 'brak'
            }
          />
          <ProposalMetric
            label="Aktualizacja"
            value={formatDate(proposal.updatedAt)}
          />
        </div>

        <DetailBlock title="Twoja wiadomość" value={proposal.message} />
        <DetailBlock title="Plan marketingowy" value={proposal.marketingPlan} />
        <DetailBlock title="Opinia o cenie" value={proposal.valuationOpinion} />
        <DetailBlock title="Dostępność" value={proposal.availability} />

        {proposal.services.length > 0 ? (
          <section className="mt-6">
            <h2 className="font-heading text-lg font-semibold">Zakres usług</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {proposal.services.map((service) => (
                <span
                  key={service}
                  className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                >
                  {service}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          {proposal.listing?.slug ? (
            <Link
              href={`/oferty/${proposal.listing.slug}`}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted"
            >
              Zobacz ofertę
            </Link>
          ) : null}
        </div>
      </section>

      <ListingAgentProposalChat
        title="Rozmowa z właścicielem"
        description="Doprecyzuj warunki współpracy przed decyzją właściciela."
        messages={messages}
        currentUserRole="agent"
        messageBody={messageBody}
        canMessage={canMessage}
        isSendingMessage={isSendingMessage}
        enabledPlaceholder="Napisz wiadomość do właściciela..."
        disabledPlaceholder="Rozmowa jest zamknięta dla tej propozycji."
        onMessageBodyChange={setMessageBody}
        onSubmit={sendMessage}
      />
    </div>
  );
}

function ProposalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function DetailBlock({
  title,
  value,
}: {
  title: string;
  value: string | null;
}) {
  if (!value) return null;

  return (
    <section className="mt-6">
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">
        {value}
      </p>
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

function formatProposalExclusivity(proposal: ListingAgentProposal): string {
  if (proposal.exclusivity === 'exclusive') {
    return 'na wyłączność';
  }

  if (proposal.exclusivity === 'open') {
    return 'otwarta';
  }

  if (proposal.exclusivity === 'flexible') {
    return 'elastyczna';
  }

  return 'do ustalenia';
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}
