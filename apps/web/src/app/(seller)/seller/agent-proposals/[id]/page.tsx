'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Home,
  Loader2,
  MessageSquareText,
  Send,
  XCircle,
} from 'lucide-react';
import { Logo } from '@/components/common/logo';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { AGENT_DASHBOARD_PATH, isPrivateSellerUser } from '@/lib/auth';
import { APP_NAME } from '@/lib/brand';
import { getApiErrorMessage } from '@/lib/api-client';
import { formatPrice } from '@/lib/listings';
import {
  acceptSellerListingAgentProposal,
  createListingAgentProposalMessage,
  fetchListingAgentProposalMessages,
  fetchSellerListingAgentProposal,
  rejectSellerListingAgentProposal,
  type ListingAgentProposal,
  type ListingAgentProposalMessage,
  type ListingAgentProposalStatus,
} from '@/lib/listing-agent-proposals';
import { cn } from '@/lib/utils';

export default function SellerAgentProposalDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const isPrivateSeller = user ? isPrivateSellerUser(user) : false;
  const [proposal, setProposal] = useState<ListingAgentProposal | null>(null);
  const [messages, setMessages] = useState<ListingAgentProposalMessage[]>([]);
  const [messageBody, setMessageBody] = useState('');
  const [isFetching, setIsFetching] = useState(true);
  const [isDeciding, setIsDeciding] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canDecide = proposal?.status === 'sent' || proposal?.status === 'updated';
  const canMessage = proposal
    ? ['sent', 'updated', 'accepted'].includes(proposal.status)
    : false;
  const agentName = useMemo(
    () => (proposal ? getAgentDisplayName(proposal) : ''),
    [proposal],
  );

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!isPrivateSeller) {
      router.replace(AGENT_DASHBOARD_PATH);
    }
  }, [isLoading, isPrivateSeller, router, user]);

  useEffect(() => {
    if (isLoading || !user || !isPrivateSeller) return;

    let cancelled = false;

    async function loadProposal() {
      setIsFetching(true);
      setError(null);

      try {
        const [proposalResult, messageResult] = await Promise.all([
          fetchSellerListingAgentProposal(params.id),
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
          setError(getApiErrorMessage(loadError));
        }
      } finally {
        if (!cancelled) {
          setIsFetching(false);
        }
      }
    }

    void loadProposal();

    return () => {
      cancelled = true;
    };
  }, [isLoading, isPrivateSeller, params.id, user]);

  async function acceptProposal() {
    if (!proposal) return;

    setIsDeciding(true);

    try {
      const updated = await acceptSellerListingAgentProposal(proposal.id);
      setProposal(updated);
      showSuccessToast({
        title: 'Propozycja zaakceptowana',
        description: 'Agent otrzyma powiadomienie o Twojej decyzji.',
      });
    } catch (acceptError) {
      showErrorToast({
        title: 'Nie udało się zaakceptować propozycji',
        description: getApiErrorMessage(acceptError),
      });
    } finally {
      setIsDeciding(false);
    }
  }

  async function rejectProposal() {
    if (!proposal) return;

    setIsDeciding(true);

    try {
      const updated = await rejectSellerListingAgentProposal(proposal.id);
      setProposal(updated);
      showSuccessToast({
        title: 'Propozycja odrzucona',
        description: 'Agent otrzyma powiadomienie o Twojej decyzji.',
      });
    } catch (rejectError) {
      showErrorToast({
        title: 'Nie udało się odrzucić propozycji',
        description: getApiErrorMessage(rejectError),
      });
    } finally {
      setIsDeciding(false);
    }
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!proposal || !messageBody.trim()) return;

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

  if (isLoading || isFetching || !user || !isPrivateSeller) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (error || !proposal) {
    return (
      <SellerProposalShell>
        <section className="rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <XCircle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-heading text-2xl font-semibold">
            Nie udało się pobrać propozycji
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {error ?? 'Propozycja jest niedostępna.'}
          </p>
        </section>
      </SellerProposalShell>
    );
  }

  const status = SELLER_AGENT_PROPOSAL_STATUS_COPY[proposal.status];

  return (
    <SellerProposalShell>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
            >
              {status.label}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(proposal.createdAt)}
            </span>
          </div>

          <h1 className="mt-4 font-heading text-3xl font-bold leading-tight">
            {agentName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {proposal.agent?.agency?.name ?? 'Agent niezależny'} ·{' '}
            {proposal.listing?.title ?? 'Ogłoszenie niedostępne'}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ProposalMetric
              label="Prowizja"
              value={formatProposalCommission(proposal)}
            />
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
                  ? formatPrice(Number(proposal.proposedPrice), 'PLN')
                  : 'brak'
              }
            />
          </div>

          <DetailBlock title="Wiadomość agenta" value={proposal.message} />
          <DetailBlock title="Plan marketingowy" value={proposal.marketingPlan} />
          <DetailBlock title="Opinia o cenie" value={proposal.valuationOpinion} />
          <DetailBlock title="Dostępność" value={proposal.availability} />

          {proposal.services.length > 0 ? (
            <section className="mt-6">
              <h2 className="font-heading text-lg font-semibold">
                Zakres usług
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {proposal.services.map((service) => (
                  <span
                    key={service}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </section>
          ) : null}
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-heading text-lg font-semibold">Decyzja</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {status.description}
            </p>
            {canDecide ? (
              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  disabled={isDeciding}
                  onClick={acceptProposal}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60"
                >
                  {isDeciding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Akceptuj
                </button>
                <button
                  type="button"
                  disabled={isDeciding}
                  onClick={rejectProposal}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted disabled:cursor-wait disabled:opacity-60"
                >
                  {isDeciding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Odrzuć
                </button>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-heading text-lg font-semibold">Ogłoszenie</h2>
            <p className="mt-2 text-sm font-medium">
              {proposal.listing?.title ?? 'Ogłoszenie niedostępne'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {[proposal.listing?.city, proposal.listing?.district]
                .filter(Boolean)
                .join(', ') || 'Lokalizacja niedostępna'}
            </p>
          </section>
        </aside>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageSquareText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-semibold">
              Rozmowa z agentem
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Doprecyzuj warunki współpracy przed decyzją.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {messages.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/20 p-5 text-center text-sm text-muted-foreground">
              Nie ma jeszcze wiadomości w tej rozmowie.
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
        </div>

        <form onSubmit={sendMessage} className="mt-5 grid gap-3">
          <textarea
            value={messageBody}
            onChange={(event) => setMessageBody(event.target.value)}
            rows={4}
            maxLength={4000}
            disabled={!canMessage || isSendingMessage}
            placeholder={
              canMessage
                ? 'Napisz wiadomość do agenta...'
                : 'Rozmowa jest zamknięta dla tej propozycji.'
            }
            className="w-full min-w-0 resize-y rounded-xl border border-border/80 bg-card px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!canMessage || !messageBody.trim() || isSendingMessage}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSendingMessage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Wyślij
            </button>
          </div>
        </form>
      </section>
    </SellerProposalShell>
  );
}

function SellerProposalShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/seller" aria-label={`Panel właściciela ${APP_NAME}`}>
            <Logo size="sm" />
          </Link>
          <Link
            href="/seller"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Panel
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
        {children}
      </div>
    </main>
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

function MessageBubble({ message }: { message: ListingAgentProposalMessage }) {
  const isOwner = message.senderRole === 'owner';

  return (
    <article
      className={cn(
        'max-w-[85%] rounded-2xl border px-4 py-3 text-sm shadow-sm',
        isOwner
          ? 'ml-auto border-primary/20 bg-primary/10'
          : 'border-border bg-muted/30',
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{isOwner ? 'Ty' : 'Agent'}</span>
        <span>{formatDateTime(message.createdAt)}</span>
      </div>
      <p className="whitespace-pre-line leading-6">{message.body}</p>
    </article>
  );
}

const SELLER_AGENT_PROPOSAL_STATUS_COPY: Record<
  ListingAgentProposalStatus,
  { label: string; description: string; className: string }
> = {
  draft: {
    label: 'Szkic',
    description: 'Agent nie wysłał jeszcze tej propozycji.',
    className: 'bg-muted text-muted-foreground',
  },
  sent: {
    label: 'Nowa',
    description: 'Propozycja czeka na Twoją decyzję.',
    className: 'bg-blue-100 text-blue-900',
  },
  updated: {
    label: 'Zaktualizowana',
    description: 'Agent zmienił warunki propozycji.',
    className: 'bg-amber-100 text-amber-900',
  },
  accepted: {
    label: 'Zaakceptowana',
    description: 'Wybrano tego agenta do współpracy.',
    className: 'bg-emerald-100 text-emerald-900',
  },
  rejected: {
    label: 'Odrzucona',
    description: 'Ta propozycja została odrzucona.',
    className: 'bg-red-100 text-red-900',
  },
  withdrawn: {
    label: 'Wycofana',
    description: 'Agent wycofał propozycję.',
    className: 'bg-stone-200 text-stone-800',
  },
  expired: {
    label: 'Wygasła',
    description: 'Termin ważności propozycji minął.',
    className: 'bg-stone-200 text-stone-800',
  },
  closed: {
    label: 'Zamknięta',
    description: 'Nabór dla tej propozycji został zamknięty.',
    className: 'bg-stone-200 text-stone-800',
  },
};

function getAgentDisplayName(proposal: ListingAgentProposal): string {
  const name = [proposal.agent?.firstName, proposal.agent?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return name || 'Agent nieruchomości';
}

function formatProposalCommission(proposal: ListingAgentProposal): string {
  if (proposal.commissionType === 'none') return 'brak';
  if (proposal.commissionValue === null || proposal.commissionValue === undefined) {
    return 'do ustalenia';
  }

  const value = Number(proposal.commissionValue);
  if (!Number.isFinite(value)) return 'do ustalenia';

  if (proposal.commissionType === 'percentage') {
    return `${value.toLocaleString('pl-PL')}%`;
  }

  if (proposal.commissionType === 'fixed') {
    return formatPrice(value, 'PLN');
  }

  return `${value.toLocaleString('pl-PL')} + warunki`;
}

function formatProposalExclusivity(proposal: ListingAgentProposal): string {
  switch (proposal.exclusivity) {
    case 'exclusive':
      return 'na wyłączność';
    case 'open':
      return 'otwarta';
    case 'flexible':
      return 'elastyczna';
    default:
      return 'do ustalenia';
  }
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
