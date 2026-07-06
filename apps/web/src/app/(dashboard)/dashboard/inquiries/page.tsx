'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CalendarPlus,
  ExternalLink,
  ImageIcon,
  Inbox,
  Mail,
  MessageSquareText,
  Phone,
  RefreshCw,
  Search,
  UserPlus,
  UserRound,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ContactAction, RelationCard } from '@/components/common';
import { DashboardPageHeader } from '@/components/dashboard/page-header';
import { MessageTemplateDialog } from '@/components/messages/message-template-dialog';
import { InlineSelect } from '@/components/ui/inline-select';
import { Input } from '@/components/ui/input';
import { OnboardingEmptyState } from '@/components/dashboard/onboarding-empty-state';
import { ClientPagination } from '@/components/clients/client-pagination';
import { useAuth } from '@/contexts/auth-context';
import { usePublicInquiries } from '@/hooks/use-public-inquiries';
import { formatRelativeTime } from '@/lib/dashboard';
import {
  PUBLIC_LEAD_SOURCE_LABELS,
  PUBLIC_LEAD_STATUS_BADGE_VARIANT,
  PUBLIC_LEAD_STATUS_LABELS,
  PublicLeadStatus,
  type PublicInquiry,
  type PublicInquiryFilters,
  type PublicLeadSource,
} from '@/lib/public-inquiries';
import { buildPhoneHref } from '@/lib/contact-links';
import {
  buildNewAppointmentUrl,
  buildNewClientUrl,
} from '@/lib/dashboard-links';
import { fetchListings, type Listing } from '@/lib/listings';
import {
  buildAgentMessageTemplateContext,
  MessageTemplateType,
  type MessageTemplateContext,
} from '@/lib/message-templates';

const DEFAULT_FILTERS: PublicInquiryFilters = {
  page: 1,
  limit: 12,
  sortBy: 'createdAt',
  sortOrder: 'DESC',
};

export default function PublicInquiriesPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const initialFilters = useMemo<PublicInquiryFilters>(
    () => ({
      ...DEFAULT_FILTERS,
      listingId: searchParams.get('listingId') ?? undefined,
      status: parsePublicLeadStatus(searchParams.get('status')),
    }),
    [searchParams],
  );
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
  } = usePublicInquiries(initialFilters);

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
  const agentMessageContext = useMemo(
    () => buildAgentMessageTemplateContext(user),
    [user],
  );

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Zapytania publiczne"
        description="Monitoruj leady z publicznych stron ofert i ich powiązanie z CRM."
        icon={Inbox}
        actions={
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
        }
      />

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
              <PublicInquiryCard
                key={inquiry.id}
                inquiry={inquiry}
                agentMessageContext={agentMessageContext}
              />
            ))}
          </div>

          {meta && <ClientPagination meta={meta} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}

function parsePublicLeadStatus(
  value: string | null,
): PublicLeadStatus | undefined {
  if (!value) return undefined;
  return Object.values(PublicLeadStatus).includes(value as PublicLeadStatus)
    ? (value as PublicLeadStatus)
    : undefined;
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

function PublicInquiryCard({
  inquiry,
  agentMessageContext,
}: {
  inquiry: PublicInquiry;
  agentMessageContext: MessageTemplateContext;
}) {
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const statusVariant = PUBLIC_LEAD_STATUS_BADGE_VARIANT[inquiry.status];
  const primaryImage = inquiry.listing?.primaryImage;
  const convertedClientName = inquiry.convertedClient
    ? `${inquiry.convertedClient.firstName} ${inquiry.convertedClient.lastName}`.trim()
    : null;
  const newClientUrl = buildNewClientUrl({
    fullName: inquiry.fullName,
    email: inquiry.email,
    phone: inquiry.phone,
    notes: buildInquiryClientNotes(inquiry),
  });
  const appointmentUrl = buildNewAppointmentUrl({
    clientId: inquiry.convertedClient?.id,
    clientLabel: convertedClientName ?? undefined,
    listingId: inquiry.listing?.id,
    listingLabel: inquiry.listing?.title,
  });
  const messageContext = useMemo(
    () => ({
      ...agentMessageContext,
      clientName: inquiry.fullName,
      listingTitle: inquiry.listing?.title,
      leadMessage: inquiry.message,
    }),
    [
      agentMessageContext,
      inquiry.fullName,
      inquiry.listing?.title,
      inquiry.message,
    ],
  );

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row">
          <div className="h-28 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:w-36">
            {primaryImage ? (
              <img
                src={primaryImage.url}
                alt={primaryImage.altText || inquiry.listing?.title || 'Oferta'}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImageIcon className="h-7 w-7" />
              </div>
            )}
          </div>

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

            <div className="grid gap-3 md:grid-cols-2">
              <ContactAction
                icon={Mail}
                label="Email"
                value={inquiry.email}
                href={inquiry.email ? `mailto:${inquiry.email}` : undefined}
              />
              <ContactAction
                icon={Phone}
                label="Telefon"
                value={inquiry.phone}
                href={inquiry.phone ? buildPhoneHref(inquiry.phone) : undefined}
              />
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              {inquiry.listing ? (
                <RelationCard
                  href={`/dashboard/listings/${inquiry.listing.id}`}
                  title={inquiry.listing.title}
                  description="Oferta powiązana z zapytaniem"
                />
              ) : null}

              {inquiry.convertedClient ? (
                <RelationCard
                  href={`/dashboard/clients/${inquiry.convertedClient.id}`}
                  title={convertedClientName || 'Klient CRM'}
                  description="Klient utworzony z tego zapytania"
                />
              ) : (
                <RelationCard
                  href={newClientUrl}
                  title="Utwórz klienta z zapytania"
                  description="Dane kontaktowe i notatka zostaną wstępnie uzupełnione."
                />
              )}
            </div>

            {inquiry.marketingConsent ? (
              <p className="text-xs text-muted-foreground">
                Klient wyraził zgodę marketingową.
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsMessageDialogOpen(true)}
            className="gap-2"
          >
            <MessageSquareText className="h-4 w-4" />
            Wiadomość
          </Button>

          {inquiry.convertedClient ? (
            <Link href={appointmentUrl}>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarPlus className="h-4 w-4" />
                Spotkanie
              </Button>
            </Link>
          ) : (
            <Link href={newClientUrl}>
              <Button variant="outline" size="sm" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Utwórz klienta
              </Button>
            </Link>
          )}

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

      <MessageTemplateDialog
        isOpen={isMessageDialogOpen}
        title={`Wiadomość do: ${inquiry.fullName}`}
        initialTemplateType={MessageTemplateType.LEAD_RESPONSE}
        context={messageContext}
        onClose={() => setIsMessageDialogOpen(false)}
      />
    </article>
  );
}

function buildInquiryClientNotes(inquiry: PublicInquiry): string {
  const parts = [
    `Źródło: zapytanie publiczne (${PUBLIC_LEAD_SOURCE_LABELS[inquiry.source]}).`,
    inquiry.listing ? `Oferta: ${inquiry.listing.title}.` : null,
    inquiry.message ? `Wiadomość: ${inquiry.message}` : null,
    inquiry.utmCampaign ? `Kampania UTM: ${inquiry.utmCampaign}.` : null,
  ].filter(Boolean);

  return truncateNote(parts.join('\n'), 900);
}

function truncateNote(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trim()}…`;
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  if (hasFilters) {
    return (
      <OnboardingEmptyState
        icon={Search}
        title="Brak zapytań dla filtrów"
        description="Zmień filtry albo wyczyść wyszukiwanie."
        compact
        analyticsId="public_inquiries_filtered_empty"
      />
    );
  }

  return (
    <OnboardingEmptyState
      icon={Inbox}
      title="Brak publicznych zapytań"
      description="Nowe formularze z opublikowanych ofert pojawią się tutaj."
      actionHref="/dashboard/listings"
      actionLabel="Przejdź do ofert"
      analyticsId="public_inquiries_empty"
    >
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        <MessageSquareText className="h-4 w-4 shrink-0" />
        Zapytania powstają automatycznie po wysłaniu formularza.
      </div>
    </OnboardingEmptyState>
  );
}
