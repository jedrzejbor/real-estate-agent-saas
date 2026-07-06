'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  Pencil,
  Trash2,
  MapPin,
  BedDouble,
  Bath,
  Maximize,
  Building,
  Calendar,
  ClipboardList,
  Eye,
  FileText,
  Layers,
  WalletCards,
  Handshake,
  RadioTower,
  MessageSquareText,
  UserRound,
  Mail,
  Phone,
  Sparkles,
  Send,
  EyeOff,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AddressLink } from '@/components/common';
import { DashboardDetailHeader } from '@/components/dashboard/detail-header';
import {
  DashboardNextStepBar,
  type DashboardNextStep,
} from '@/components/dashboard/next-step-bar';
import { ActivityHistoryCard } from '@/components/activity/activity-history-card';
import { ActivityTimeline } from '@/components/activity/activity-timeline';
import { ListingDocumentsPanel } from '@/components/listings/listing-documents-panel';
import { ListingPublicationPanel } from '@/components/listings/listing-publication-panel';
import { MessageTemplateDialog } from '@/components/messages/message-template-dialog';
import { useConfirm } from '@/contexts/confirm-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { useActivityHistory } from '@/hooks/use-activity-history';
import { useActivityTimeline } from '@/hooks/use-activity-timeline';
import { useAppointments } from '@/hooks/use-appointments';
import { usePublicInquiries } from '@/hooks/use-public-inquiries';
import { ListingStatusBadge } from '@/components/listings/listing-status-badge';
import {
  fetchListingActivity,
  fetchListingHistory,
  getRollbackStatusChange,
  LISTING_HISTORY_FIELD_LABELS,
  type ActivityHistoryItem,
} from '@/lib/activity';
import { buildPhoneHref } from '@/lib/contact-links';
import { buildNewAppointmentUrl } from '@/lib/dashboard-links';
import {
  formatDisplayDateNumeric,
  formatDisplayTimeRange,
} from '@/lib/date-format';
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TYPE_LABELS,
  type Appointment,
} from '@/lib/appointments';
import {
  fetchListing,
  fetchListingMatchingClients,
  dismissListingMatchingClient,
  deleteListing,
  rollbackListingStatus,
  updateListing,
  type Listing,
  type ListingMatchingClientResult,
  type ListingStatus,
  ListingStatus as LS,
  ListingPublicationStatus,
  PROPERTY_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
  LISTING_STATUS_LABELS,
  LISTING_PUBLICATION_STATUS_LABELS,
  LISTING_COMMISSION_TYPE_LABELS,
  formatPrice,
  formatArea,
  formatListingCommission,
} from '@/lib/listings';
import {
  CLIENT_SOURCE_LABELS,
  CLIENT_STATUS_LABELS,
  formatBudgetRange,
  type ClientSource,
  type ClientStatus,
} from '@/lib/clients';
import {
  fetchTransactions,
  formatTransactionMoney,
  TRANSACTION_STATUS_LABELS,
  type Transaction,
} from '@/lib/transactions';
import {
  PUBLIC_LEAD_STATUS_LABELS,
  PublicLeadStatus,
  type PublicInquiry,
} from '@/lib/public-inquiries';
import {
  buildAgentMessageTemplateContext,
  MessageTemplateType,
  type MessageTemplateContext,
} from '@/lib/message-templates';
import { AnalyticsEventName, trackAnalyticsEvent } from '@/lib/analytics';

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { error: showErrorToast, success: showSuccessToast } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [listingTransactions, setListingTransactions] = useState<Transaction[]>(
    [],
  );
  const [activeTab, setActiveTab] = useState<ListingDetailTabId>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRollingBackStatus, setIsRollingBackStatus] = useState(false);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [matchingClients, setMatchingClients] = useState<
    ListingMatchingClientResult[]
  >([]);
  const [isMatchingClientsLoading, setIsMatchingClientsLoading] =
    useState(true);
  const [matchingClientsError, setMatchingClientsError] = useState<
    string | null
  >(null);
  const [dismissingMatchingClientIds, setDismissingMatchingClientIds] =
    useState<Set<string>>(() => new Set());
  const [matchingClientMessageTarget, setMatchingClientMessageTarget] =
    useState<ListingMatchingClientResult | null>(null);
  const [initialMessageTemplate, setInitialMessageTemplate] =
    useState<MessageTemplateType>(MessageTemplateType.DOCUMENT_REQUEST);
  const {
    items: historyItems,
    isLoading: isHistoryLoading,
    error: historyError,
    refresh: refreshHistory,
  } = useActivityHistory(params.id, fetchListingHistory);
  const {
    items: activityItems,
    isLoading: isActivityLoading,
    isLoadingMore: isActivityLoadingMore,
    error: activityError,
    total: activityTotal,
    hasMore: hasMoreActivity,
    refresh: refreshActivity,
    loadMore: loadMoreActivity,
  } = useActivityTimeline(params.id, fetchListingActivity);
  const rollbackChange = getRollbackStatusChange(
    historyItems,
    listing?.status ?? '',
  );
  const listingAppointmentsFilters = useMemo(
    () => ({
      listingId: params.id,
      from: new Date().toISOString(),
      page: 1,
      limit: 5,
      sortBy: 'startTime' as const,
      sortOrder: 'ASC' as const,
    }),
    [params.id],
  );
  const {
    appointments: listingAppointments,
    isLoading: isListingAppointmentsLoading,
    error: listingAppointmentsError,
  } = useAppointments(listingAppointmentsFilters);
  const listingInquiriesFilters = useMemo(
    () => ({
      listingId: params.id,
      page: 1,
      limit: 5,
      sortBy: 'createdAt' as const,
      sortOrder: 'DESC' as const,
    }),
    [params.id],
  );
  const {
    inquiries: listingInquiries,
    isLoading: isListingInquiriesLoading,
    error: listingInquiriesError,
  } = usePublicInquiries(listingInquiriesFilters);
  const agentMessageContext = useMemo(
    () => buildAgentMessageTemplateContext(user),
    [user],
  );
  const listingMessageContext = useMemo<MessageTemplateContext>(
    () =>
      listing
        ? buildListingMessageContext(
            listing,
            formatDashboardListingAddress(listing.address),
            agentMessageContext,
            historyItems,
          )
        : agentMessageContext,
    [agentMessageContext, historyItems, listing],
  );
  const matchingClientMessageContext = useMemo<MessageTemplateContext>(
    () =>
      listing && matchingClientMessageTarget
        ? buildMatchingClientMessageContext(
            listing,
            matchingClientMessageTarget,
            formatDashboardListingAddress(listing.address),
            agentMessageContext,
            historyItems,
          )
        : agentMessageContext,
    [agentMessageContext, historyItems, listing, matchingClientMessageTarget],
  );

  useEffect(() => {
    if (!params.id) return;
    setIsLoading(true);
    Promise.all([
      fetchListing(params.id),
      fetchTransactions({ listingId: params.id, limit: 10 }),
    ])
      .then(([listingResponse, transactionsResponse]) => {
        setListing(listingResponse);
        setListingTransactions(transactionsResponse.data);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Nie znaleziono oferty'),
      )
      .finally(() => setIsLoading(false));
  }, [params.id]);

  useEffect(() => {
    if (!params.id) return;

    let isCancelled = false;
    setIsMatchingClientsLoading(true);
    setMatchingClientsError(null);

    fetchListingMatchingClients(params.id)
      .then((items) => {
        if (!isCancelled) {
          setMatchingClients(items);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setMatchingClients([]);
          setMatchingClientsError(
            err instanceof Error
              ? err.message
              : 'Nie udało się pobrać pasujących klientów',
          );
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsMatchingClientsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [params.id]);

  useEffect(() => {
    const tab = parseListingDetailTabId(tabParam);
    if (tab) {
      setActiveTab(tab);
    }
  }, [tabParam]);

  const refreshListingActivity = useCallback(() => {
    void refreshHistory();
    void refreshActivity();
  }, [refreshActivity, refreshHistory]);

  const handleListingChange = useCallback(
    (updated: Listing) => {
      setListing(updated);
      refreshListingActivity();
    },
    [refreshListingActivity],
  );

  const handleDismissMatchingClient = useCallback(
    async (clientId: string) => {
      if (!listing) return;

      setDismissingMatchingClientIds((current) => {
        const next = new Set(current);
        next.add(clientId);
        return next;
      });

      try {
        await dismissListingMatchingClient(listing.id, clientId);
        setMatchingClients((items) =>
          items.filter((item) => item.client.id !== clientId),
        );
        showSuccessToast({
          title: 'Dopasowanie ukryte',
          description: 'Klient nie będzie już widoczny w dopasowaniach oferty.',
        });
      } catch (err) {
        showErrorToast({
          title: 'Nie udało się ukryć dopasowania',
          description:
            err instanceof Error ? err.message : 'Spróbuj ponownie za chwilę.',
        });
      } finally {
        setDismissingMatchingClientIds((current) => {
          const next = new Set(current);
          next.delete(clientId);
          return next;
        });
      }
    },
    [listing, showErrorToast, showSuccessToast],
  );

  const openListingMessageDialog = useCallback(
    (templateType: MessageTemplateType) => {
      setInitialMessageTemplate(templateType);
      setIsMessageDialogOpen(true);
    },
    [],
  );

  const handleDelete = useCallback(async () => {
    if (!listing) return;
    const confirmed = await confirm({
      title: 'Usunąć ofertę?',
      description: 'Tej operacji nie można cofnąć.',
      confirmLabel: 'Usuń ofertę',
      cancelLabel: 'Anuluj',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      await deleteListing(listing.id);
      router.push('/dashboard/listings');
    } catch (err) {
      showErrorToast({
        title: 'Nie udało się usunąć oferty',
        description:
          err instanceof Error ? err.message : 'Spróbuj ponownie za chwilę.',
      });
    }
  }, [confirm, listing, router, showErrorToast]);

  const handleStatusChange = useCallback(
    async (newStatus: ListingStatus) => {
      if (!listing) return;

      const confirmed = await confirm({
        title: 'Zmienić status oferty?',
        description: getStatusChangeConfirmationDescription(listing, newStatus),
        confirmLabel: 'Zmień status',
        cancelLabel: 'Anuluj',
      });

      if (!confirmed) return;

      try {
        const updated = await updateListing(listing.id, {
          status: newStatus,
        });
        setListing(updated);
        refreshListingActivity();
      } catch (err) {
        showErrorToast({
          title: 'Nie udało się zmienić statusu',
          description:
            err instanceof Error ? err.message : 'Spróbuj ponownie za chwilę.',
        });
      }
    },
    [confirm, listing, refreshListingActivity, showErrorToast],
  );

  const handleStatusRollback = useCallback(async () => {
    if (
      !listing ||
      !rollbackChange ||
      typeof rollbackChange.oldValue !== 'string'
    ) {
      return;
    }

    const previousStatus = rollbackChange.oldValue as ListingStatus;
    const confirmed = await confirm({
      title: 'Cofnąć ostatnią zmianę statusu?',
      description: `Status oferty wróci z „${LISTING_STATUS_LABELS[listing.status]}” do „${LISTING_STATUS_LABELS[previousStatus]}”.`,
      confirmLabel: 'Cofnij status',
      cancelLabel: 'Anuluj',
    });

    if (!confirmed) return;

    try {
      setIsRollingBackStatus(true);
      const updated = await rollbackListingStatus(listing.id);
      setListing(updated);
      refreshListingActivity();
      showSuccessToast({
        title: 'Status oferty cofnięty',
        description: `Przywrócono status „${LISTING_STATUS_LABELS[updated.status]}”.`,
      });
    } catch (err) {
      showErrorToast({
        title: 'Nie udało się cofnąć statusu',
        description:
          err instanceof Error ? err.message : 'Spróbuj ponownie za chwilę.',
      });
    } finally {
      setIsRollingBackStatus(false);
    }
  }, [
    confirm,
    listing,
    refreshListingActivity,
    rollbackChange,
    showErrorToast,
    showSuccessToast,
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/listings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć do listy
        </Link>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive">
            {error ?? 'Nie znaleziono oferty'}
          </p>
        </div>
      </div>
    );
  }

  const { address } = listing;
  const listingAddress = formatDashboardListingAddress(address);

  // Available status transitions
  const statusActions = getStatusActions(listing.status);
  const tabs = getListingDetailTabs(listing);
  const selectedTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0]!;
  const isActiveButUnpublished =
    listing.status === LS.ACTIVE &&
    listing.publicationStatus !== ListingPublicationStatus.PUBLISHED;
  const nextStep = getListingNextStep({
    listing,
    listingAddress,
    isActiveButUnpublished,
    inquiries: listingInquiries,
    appointments: listingAppointments,
    matchingClients,
    onOpenPublication: () => setActiveTab('publication'),
    onOpenMessage: () => {
      setInitialMessageTemplate(MessageTemplateType.DOCUMENT_REQUEST);
      setIsMessageDialogOpen(true);
    },
  });
  const listingActionButtonClass =
    'w-full justify-start gap-1.5 rounded-xl sm:w-auto sm:justify-center';
  const listingActionLinkClass = 'w-full sm:w-auto';

  return (
    <div className="space-y-6">
      <DashboardDetailHeader
        backHref="/dashboard/listings"
        backLabel="Wróć do listy ofert"
        title={listing.title}
        badges={
          <>
            <ListingStatusBadge status={listing.status} />
            <ListingPublicationBadge status={listing.publicationStatus} />
          </>
        }
        description={
          <>
            {listingAddress ? (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0" />
                <AddressLink address={listingAddress} />
              </div>
            ) : null}
            <ListingMessageRecipientSummary listing={listing} />
          </>
        }
        actions={
          <>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <Button
              type="button"
              size="sm"
              onClick={() =>
                openListingMessageDialog(MessageTemplateType.DOCUMENT_REQUEST)
              }
              className={listingActionButtonClass}
            >
              <MessageSquareText className="h-3.5 w-3.5" />
              Wiadomość
            </Button>
            <Link
              href={`/dashboard/listings/${listing.id}/owner-report`}
              className={listingActionLinkClass}
            >
              <Button
                variant="outline"
                size="sm"
                className={listingActionButtonClass}
              >
                <FileText className="h-3.5 w-3.5" />
                Raport właściciela
              </Button>
            </Link>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                openListingMessageDialog(MessageTemplateType.PRICE_CHANGE)
              }
              className={listingActionButtonClass}
            >
              <WalletCards className="h-3.5 w-3.5" />
              Zmiana ceny
            </Button>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <Link
              href={buildNewAppointmentUrl({
                listingId: listing.id,
                listingLabel: listing.title,
                location: listingAddress,
              })}
              className={listingActionLinkClass}
            >
              <Button
                variant="outline"
                size="sm"
                className={listingActionButtonClass}
              >
                <Calendar className="h-3.5 w-3.5" />
                Spotkanie
              </Button>
            </Link>
            <Link
              href={`/dashboard/transactions?listingId=${listing.id}`}
              className={listingActionLinkClass}
            >
              <Button
                variant="outline"
                size="sm"
                className={listingActionButtonClass}
              >
                <Handshake className="h-3.5 w-3.5" />
                Utwórz transakcję
              </Button>
            </Link>
            <Link
              href={`/dashboard/listings/${listing.id}/edit`}
              className={listingActionLinkClass}
            >
              <Button
                variant="outline"
                size="sm"
                className={listingActionButtonClass}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edytuj
              </Button>
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className={listingActionButtonClass}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Usuń
            </Button>
          </div>
          </>
        }
      />

      <DashboardNextStepBar step={nextStep} />

      {isActiveButUnpublished ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-status-warning/25 bg-status-warning-bg p-4 text-status-warning sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <RadioTower className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                Oferta jest aktywna, ale nie jest widoczna publicznie.
              </p>
              <p className="mt-1 text-sm opacity-90">
                Opublikuj ją w zakładce publikacji, aby pojawiła się na stronie
                /oferty.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('publication')}
            className="w-full rounded-xl border-status-warning/30 bg-card text-foreground hover:bg-muted sm:w-auto"
          >
            Przejdź do publikacji
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ListingSummaryCard
          label="Cena"
          value={formatPrice(listing.price, listing.currency)}
          subtitle={
            listing.areaM2
              ? `${formatPrice(
                  Number(listing.price) / Number(listing.areaM2),
                  listing.currency,
                )}/m²`
              : 'Cena ofertowa'
          }
          icon={WalletCards}
        />
        <ListingSummaryCard
          label="Prowizja agenta"
          value={formatListingCommission(listing)}
          subtitle={getCommissionDescription(listing)}
          icon={WalletCards}
        />
        <ListingSummaryCard
          label="Wyświetlenia publiczne"
          value={String(listing.publicViewCount ?? 0)}
          subtitle="Liczone z publicznej strony oferty"
          icon={Eye}
        />
        <ListingSummaryCard
          label="Ostatnia zmiana"
          value={formatDisplayDateNumeric(listing.updatedAt)}
          subtitle={`Utworzono ${formatDisplayDateNumeric(listing.createdAt)}`}
          icon={Calendar}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/20 p-2">
          <div
            className="grid gap-2 md:grid-cols-2 xl:grid-cols-4"
            role="tablist"
            aria-label="Widok szczegółów oferty"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = selectedTab.id === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-20 rounded-xl border px-3 py-3 text-left transition-colors ${
                    isActive
                      ? 'border-primary bg-card text-foreground shadow-sm'
                      : 'border-transparent bg-transparent text-muted-foreground hover:bg-card/70 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">{tab.label}</span>
                    </div>
                    {tab.badge ? (
                      <Badge variant="outline" className="rounded-full">
                        {tab.badge}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs leading-5">{tab.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-b border-border px-5 py-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Aktywny widok
              </p>
              <h2 className="mt-1 font-heading text-xl font-semibold text-foreground">
                {selectedTab.label}
              </h2>
            </div>
            <Badge variant="secondary" className="w-fit rounded-full">
              {selectedTab.badge ?? LISTING_STATUS_LABELS[listing.status]}
            </Badge>
          </div>
        </div>

        <div className="min-h-[560px] bg-background p-5">
          {selectedTab.id === 'overview' ? (
            <ListingOverviewContent
              listing={listing}
              statusActions={statusActions}
              rollbackLabel={
                rollbackChange && typeof rollbackChange.oldValue === 'string'
                  ? LISTING_STATUS_LABELS[
                      rollbackChange.oldValue as ListingStatus
                    ]
                  : null
              }
              isRollingBackStatus={isRollingBackStatus}
              transactions={listingTransactions}
              appointments={listingAppointments}
              isAppointmentsLoading={isListingAppointmentsLoading}
              appointmentsError={listingAppointmentsError}
              inquiries={listingInquiries}
              isInquiriesLoading={isListingInquiriesLoading}
              inquiriesError={listingInquiriesError}
              matchingClients={matchingClients}
              isMatchingClientsLoading={isMatchingClientsLoading}
              matchingClientsError={matchingClientsError}
              dismissingMatchingClientIds={dismissingMatchingClientIds}
              onStatusChange={handleStatusChange}
              onStatusRollback={handleStatusRollback}
              onProposeListing={setMatchingClientMessageTarget}
              onDismissMatchingClient={handleDismissMatchingClient}
            />
          ) : null}

          {selectedTab.id === 'publication' ? (
            <ListingPublicationPanel
              listing={listing}
              onListingChange={handleListingChange}
            />
          ) : null}

          {selectedTab.id === 'documents' ? (
            <ListingDocumentsPanel
              listingId={listing.id}
              onActivityChanged={refreshActivity}
            />
          ) : null}

          {selectedTab.id === 'history' ? (
            <div className="space-y-5">
              <ActivityTimeline
                items={activityItems}
                isLoading={isActivityLoading}
                isLoadingMore={isActivityLoadingMore}
                error={activityError}
                onRefresh={refreshActivity}
                onLoadMore={loadMoreActivity}
                hasMore={hasMoreActivity}
                total={activityTotal}
                title="Aktywność oferty"
                description="Publikacja, zapytania, spotkania, dokumenty i aktywność publiczna w jednej osi czasu."
                emptyState="Brak aktywności, opublikuj ofertę albo zaplanuj spotkanie."
              />

              <ActivityHistoryCard
                entityType="listing"
                items={historyItems}
                isLoading={isHistoryLoading}
                error={historyError}
                onRefresh={refreshHistory}
                fieldLabels={LISTING_HISTORY_FIELD_LABELS}
              />
            </div>
          ) : null}
        </div>
      </section>

      <MessageTemplateDialog
        isOpen={isMessageDialogOpen}
        title={`Wiadomość: ${listing.title}`}
        initialTemplateType={initialMessageTemplate}
        context={listingMessageContext}
        onClose={() => setIsMessageDialogOpen(false)}
      />

      <MessageTemplateDialog
        isOpen={Boolean(matchingClientMessageTarget)}
        title={`Propozycja oferty: ${
          matchingClientMessageTarget
            ? formatMatchingClientName(matchingClientMessageTarget.client)
            : ''
        }`}
        initialTemplateType={MessageTemplateType.LEAD_RESPONSE}
        context={matchingClientMessageContext}
        onClose={() => setMatchingClientMessageTarget(null)}
      />
    </div>
  );
}

// ── Helpers ──

type ListingDetailTabId = 'overview' | 'publication' | 'documents' | 'history';

interface ListingDetailTab {
  id: ListingDetailTabId;
  label: string;
  description: string;
  icon: typeof ClipboardList;
  badge?: string;
}

function parseListingDetailTabId(
  value: string | null,
): ListingDetailTabId | null {
  return value === 'overview' ||
    value === 'publication' ||
    value === 'documents' ||
    value === 'history'
    ? value
    : null;
}

function ListingMessageRecipientSummary({ listing }: { listing: Listing }) {
  const recipient = listing.messageRecipient;

  if (!recipient) {
    return (
      <div className="flex w-fit items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground">
        <UserRound className="h-3.5 w-3.5" />
        Odbiorca wiadomości nie jest przypisany.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
        <UserRound className="h-3.5 w-3.5 text-primary" />
        {recipient.name ?? recipient.email ?? 'Właściciel'}
      </span>
      <Badge variant="outline" className="rounded-full">
        Właściciel
      </Badge>
      {recipient.email ? (
        <a
          href={`mailto:${recipient.email}`}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          <Mail className="h-3.5 w-3.5" />
          {recipient.email}
        </a>
      ) : null}
      {recipient.phone ? (
        <a
          href={buildPhoneHref(recipient.phone)}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          <Phone className="h-3.5 w-3.5" />
          {recipient.phone}
        </a>
      ) : null}
    </div>
  );
}

function buildListingMessageContext(
  listing: Listing,
  listingAddress: string | null,
  agentContext: MessageTemplateContext,
  historyItems: ActivityHistoryItem[],
): MessageTemplateContext {
  const previousPrice = getPreviousListingPrice(historyItems, listing.currency);

  return {
    ...agentContext,
    clientName: listing.messageRecipient?.name,
    listingTitle: listing.title,
    listingAddress,
    price: formatPrice(listing.price, listing.currency),
    previousPrice,
    documentList: [
      '- umowa pośrednictwa',
      '- dokument potwierdzający własność',
      '- świadectwo energetyczne, jeśli jest dostępne',
      '- rzut lokalu, jeśli jest dostępny',
    ].join('\n'),
  };
}

function buildMatchingClientMessageContext(
  listing: Listing,
  match: ListingMatchingClientResult,
  listingAddress: string | null,
  agentContext: MessageTemplateContext,
  historyItems: ActivityHistoryItem[],
): MessageTemplateContext {
  return {
    ...buildListingMessageContext(
      listing,
      listingAddress,
      agentContext,
      historyItems,
    ),
    clientName: formatMatchingClientName(match.client),
    leadMessage:
      'Propozycja przygotowana na podstawie preferencji klienta w CRM.',
  };
}

function formatMatchingClientName(
  client: ListingMatchingClientResult['client'],
): string {
  return [client.firstName, client.lastName].filter(Boolean).join(' ').trim();
}

function getClientStatusLabel(status: string): string {
  return CLIENT_STATUS_LABELS[status as ClientStatus] ?? status;
}

function getClientSourceLabel(source: string): string {
  return CLIENT_SOURCE_LABELS[source as ClientSource] ?? source;
}

function getMatchingReasonBadgeVariant(
  type: ListingMatchingClientResult['reasons'][number]['type'],
): 'success' | 'muted' | 'warning' {
  if (type === 'positive') return 'success';
  if (type === 'negative') return 'warning';
  return 'muted';
}

function getPreviousListingPrice(
  historyItems: ActivityHistoryItem[],
  currency: string,
): string | null {
  for (const item of historyItems) {
    const priceChange = item.changes.find(
      (change) =>
        change.field === 'price' && isPriceHistoryValue(change.oldValue),
    );

    if (priceChange && isPriceHistoryValue(priceChange.oldValue)) {
      return formatPrice(priceChange.oldValue, currency);
    }
  }

  return null;
}

function isPriceHistoryValue(value: unknown): value is number | string {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0;
  }

  return false;
}

function ListingSummaryCard({
  label,
  value,
  subtitle,
  icon: Icon,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: typeof WalletCards;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 truncate font-heading text-xl font-bold text-foreground">
            {value}
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ListingPublicationBadge({
  status,
}: {
  status: ListingPublicationStatus;
}) {
  const variant =
    status === ListingPublicationStatus.PUBLISHED
      ? 'success'
      : status === ListingPublicationStatus.UNPUBLISHED
        ? 'warning'
        : 'secondary';

  return (
    <Badge variant={variant}>
      Publicznie: {LISTING_PUBLICATION_STATUS_LABELS[status]}
    </Badge>
  );
}

function ListingOverviewContent({
  listing,
  statusActions,
  rollbackLabel,
  isRollingBackStatus,
  transactions,
  appointments,
  isAppointmentsLoading,
  appointmentsError,
  inquiries,
  isInquiriesLoading,
  inquiriesError,
  matchingClients,
  isMatchingClientsLoading,
  matchingClientsError,
  dismissingMatchingClientIds,
  onStatusChange,
  onStatusRollback,
  onProposeListing,
  onDismissMatchingClient,
}: {
  listing: Listing;
  statusActions: StatusAction[];
  rollbackLabel: string | null;
  isRollingBackStatus: boolean;
  transactions: Transaction[];
  appointments: Appointment[];
  isAppointmentsLoading: boolean;
  appointmentsError: string | null;
  inquiries: PublicInquiry[];
  isInquiriesLoading: boolean;
  inquiriesError: string | null;
  matchingClients: ListingMatchingClientResult[];
  isMatchingClientsLoading: boolean;
  matchingClientsError: string | null;
  dismissingMatchingClientIds: Set<string>;
  onStatusChange: (status: ListingStatus) => void;
  onStatusRollback: () => void;
  onProposeListing: (match: ListingMatchingClientResult) => void;
  onDismissMatchingClient: (clientId: string) => void;
}) {
  const listingAddress = formatDashboardListingAddress(listing.address);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
      <div className="space-y-5">
        <ListingParametersCard listing={listing} />
        <ListingDescriptionCard listing={listing} />
      </div>
      <div className="space-y-5">
        <ListingStatusActionsCard
          statusActions={statusActions}
          rollbackLabel={rollbackLabel}
          isRollingBackStatus={isRollingBackStatus}
          onStatusChange={onStatusChange}
          onStatusRollback={onStatusRollback}
        />
        <ListingMatchingClientsCard
          listing={listing}
          listingAddress={listingAddress}
          matches={matchingClients}
          isLoading={isMatchingClientsLoading}
          error={matchingClientsError}
          dismissingClientIds={dismissingMatchingClientIds}
          onProposeListing={onProposeListing}
          onDismissClient={onDismissMatchingClient}
        />
        <ListingTransactionsCard transactions={transactions} />
        <ListingAppointmentsCard
          listing={listing}
          listingAddress={listingAddress}
          appointments={appointments}
          isLoading={isAppointmentsLoading}
          error={appointmentsError}
        />
        <ListingInquiriesCard
          listingId={listing.id}
          inquiries={inquiries}
          isLoading={isInquiriesLoading}
          error={inquiriesError}
        />
        <ListingMetadataCard listing={listing} />
        <ListingLocationCard listing={listing} />
      </div>
    </div>
  );
}

function ListingAppointmentsCard({
  listing,
  listingAddress,
  appointments,
  isLoading,
  error,
}: {
  listing: Listing;
  listingAddress: string | null;
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
}) {
  const scheduleAppointmentUrl = buildNewAppointmentUrl({
    listingId: listing.id,
    listingLabel: listing.title,
    location: listingAddress,
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading text-base font-semibold text-foreground">
          Spotkania oferty
        </h3>
        <Link href={scheduleAppointmentUrl}>
          <Button variant="outline" size="sm" className="rounded-xl">
            Dodaj
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Ładowanie spotkań...
        </p>
      ) : error ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Nie udało się pobrać spotkań.
        </p>
      ) : appointments.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Brak nadchodzących spotkań dla tej oferty.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {appointments.map((appointment) => (
            <Link
              key={appointment.id}
              href={`/dashboard/calendar/${appointment.id}`}
              className="block rounded-xl border border-border/70 bg-muted/10 px-3 py-2 transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {appointment.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {APPOINTMENT_TYPE_LABELS[appointment.type]} ·{' '}
                    {APPOINTMENT_STATUS_LABELS[appointment.status]}
                  </p>
                </div>
                <p className="shrink-0 text-right text-xs font-medium text-foreground">
                  {formatDisplayDateNumeric(appointment.startTime)}
                  <br />
                  {formatDisplayTimeRange(
                    appointment.startTime,
                    appointment.endTime,
                  )}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ListingInquiriesCard({
  listingId,
  inquiries,
  isLoading,
  error,
}: {
  listingId: string;
  inquiries: PublicInquiry[];
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading text-base font-semibold text-foreground">
          Zapytania z oferty
        </h3>
        <Badge variant="secondary" className="rounded-full">
          {inquiries.length}
        </Badge>
      </div>

      {isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Ładowanie zapytań...
        </p>
      ) : error ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Nie udało się pobrać zapytań.
        </p>
      ) : inquiries.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Ta oferta nie ma jeszcze publicznych zapytań.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {inquiries.map((inquiry) => (
            <Link
              key={inquiry.id}
              href={`/dashboard/inquiries?listingId=${listingId}`}
              className="block rounded-xl border border-border/70 bg-muted/10 px-3 py-2 transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {inquiry.fullName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {inquiry.email ?? inquiry.phone ?? 'Brak kontaktu'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <Badge variant="outline" className="rounded-full">
                    {PUBLIC_LEAD_STATUS_LABELS[inquiry.status]}
                  </Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDisplayDateNumeric(inquiry.createdAt)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ListingTransactionsCard({
  transactions,
}: {
  transactions: Transaction[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading text-base font-semibold text-foreground">
          Transakcje oferty
        </h3>
        <Badge variant="secondary" className="rounded-full">
          {transactions.length}
        </Badge>
      </div>
      {transactions.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Ta oferta nie ma jeszcze transakcji w pipeline.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {transactions.map((transaction) => (
            <Link
              key={transaction.id}
              href={`/dashboard/transactions/${transaction.id}`}
              className="block rounded-xl border border-border/70 bg-muted/10 px-3 py-2 transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {transaction.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {TRANSACTION_STATUS_LABELS[transaction.status]}
                  </p>
                </div>
                <p className="shrink-0 text-xs font-medium text-foreground">
                  {formatTransactionMoney(
                    transaction.dealValue,
                    transaction.currency,
                  )}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ListingMatchingClientsCard({
  listing,
  listingAddress,
  matches,
  isLoading,
  error,
  dismissingClientIds,
  onProposeListing,
  onDismissClient,
}: {
  listing: Listing;
  listingAddress: string | null;
  matches: ListingMatchingClientResult[];
  isLoading: boolean;
  error: string | null;
  dismissingClientIds: Set<string>;
  onProposeListing: (match: ListingMatchingClientResult) => void;
  onDismissClient: (clientId: string) => void;
}) {
  if (listing.status !== LS.ACTIVE) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-heading text-base font-semibold text-foreground">
            Pasujący klienci
          </h3>
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Dopasowania klientów będą dostępne po ustawieniu oferty jako aktywnej.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading text-base font-semibold text-foreground">
          Pasujący klienci
        </h3>
        <Badge variant="secondary" className="rounded-full">
          {matches.length}
        </Badge>
      </div>

      {isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Szukam klientów pasujących do oferty...
        </p>
      ) : error ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Nie udało się pobrać pasujących klientów.
        </p>
      ) : matches.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Brak klientów spełniających obecne parametry oferty.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {matches.slice(0, 5).map((match) => (
            <ListingMatchingClientItem
              key={match.client.id}
              listing={listing}
              listingAddress={listingAddress}
              match={match}
              isDismissing={dismissingClientIds.has(match.client.id)}
              onProposeListing={onProposeListing}
              onDismiss={() => onDismissClient(match.client.id)}
            />
          ))}
          {matches.length > 5 ? (
            <p className="text-xs text-muted-foreground">
              Pokazano 5 z {matches.length} najlepszych dopasowań.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ListingMatchingClientItem({
  listing,
  listingAddress,
  match,
  isDismissing,
  onProposeListing,
  onDismiss,
}: {
  listing: Listing;
  listingAddress: string | null;
  match: ListingMatchingClientResult;
  isDismissing: boolean;
  onProposeListing: (match: ListingMatchingClientResult) => void;
  onDismiss: () => void;
}) {
  const { client } = match;
  const clientName = formatMatchingClientName(client);
  const scheduleUrl = buildNewAppointmentUrl({
    clientId: client.id,
    clientLabel: clientName,
    listingId: listing.id,
    listingLabel: listing.title,
    location: listingAddress,
  });
  const trackMatchingCta = (action: 'propose_listing' | 'schedule_viewing') => {
    trackAnalyticsEvent({
      name: AnalyticsEventName.MATCHING_CTA_CLICKED,
      properties: {
        action,
        clientId: client.id,
        listingId: listing.id,
        score: match.score,
        source: 'listing_profile',
      },
    });
  };

  return (
    <div className="rounded-xl border border-border/70 bg-muted/10 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/clients/${client.id}`}
              className="truncate text-sm font-medium text-foreground hover:text-primary"
            >
              {clientName}
            </Link>
            <Badge variant="success">{Math.round(match.score)}%</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {getClientStatusLabel(client.status)} ·{' '}
            {getClientSourceLabel(client.source)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Budżet: {formatBudgetRange(client.budgetMin, client.budgetMax)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {match.reasons.map((reason) => (
          <Badge
            key={`${client.id}-${reason.code}`}
            variant={getMatchingReasonBadgeVariant(reason.type)}
          >
            {reason.label}
          </Badge>
        ))}
      </div>

      <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
        {client.email ? (
          <a
            href={`mailto:${client.email}`}
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            <Mail className="h-3.5 w-3.5" />
            {client.email}
          </a>
        ) : null}
        {client.phone ? (
          <a
            href={buildPhoneHref(client.phone)}
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            <Phone className="h-3.5 w-3.5" />
            {client.phone}
          </a>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-start gap-1.5 rounded-xl"
          onClick={() => {
            trackMatchingCta('propose_listing');
            onProposeListing(match);
          }}
        >
          <Send className="h-3.5 w-3.5" />
          Zaproponuj ofertę
        </Button>
        <Link
          href={scheduleUrl}
          onClick={() => trackMatchingCta('schedule_viewing')}
        >
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-1.5 rounded-xl"
          >
            <Calendar className="h-3.5 w-3.5" />
            Zaplanuj prezentację
          </Button>
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="justify-start gap-1.5 rounded-xl text-muted-foreground hover:text-foreground"
          onClick={onDismiss}
          disabled={isDismissing}
        >
          <EyeOff className="h-3.5 w-3.5" />
          {isDismissing ? 'Ukrywanie...' : 'Ukryj'}
        </Button>
      </div>
    </div>
  );
}

function ListingParametersCard({ listing }: { listing: Listing }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h3 className="font-heading text-lg font-semibold text-foreground">
        Parametry
      </h3>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
        <DetailItem
          icon={<Building className="h-4 w-4" />}
          label="Typ"
          value={PROPERTY_TYPE_LABELS[listing.propertyType]}
        />
        <DetailItem
          icon={<Layers className="h-4 w-4" />}
          label="Transakcja"
          value={TRANSACTION_TYPE_LABELS[listing.transactionType]}
        />
        {listing.plotAreaM2 ? (
          <DetailItem
            icon={<Maximize className="h-4 w-4" />}
            label="Powierzchnia działki"
            value={formatArea(listing.plotAreaM2)}
          />
        ) : null}
        {listing.areaM2 ? (
          <DetailItem
            icon={<Maximize className="h-4 w-4" />}
            label="Powierzchnia"
            value={formatArea(listing.areaM2)}
          />
        ) : null}
        {listing.rooms ? (
          <DetailItem
            icon={<BedDouble className="h-4 w-4" />}
            label="Pokoje"
            value={String(listing.rooms)}
          />
        ) : null}
        {listing.bathrooms !== undefined && listing.bathrooms !== null ? (
          <DetailItem
            icon={<Bath className="h-4 w-4" />}
            label="Łazienki"
            value={String(listing.bathrooms)}
          />
        ) : null}
        {listing.floor !== undefined && listing.floor !== null ? (
          <DetailItem
            icon={<Building className="h-4 w-4" />}
            label="Piętro"
            value={
              listing.totalFloors
                ? `${listing.floor} / ${listing.totalFloors}`
                : String(listing.floor)
            }
          />
        ) : null}
        {listing.yearBuilt ? (
          <DetailItem
            icon={<Calendar className="h-4 w-4" />}
            label="Rok budowy"
            value={String(listing.yearBuilt)}
          />
        ) : null}
      </div>
    </div>
  );
}

function ListingDescriptionCard({ listing }: { listing: Listing }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h3 className="font-heading text-lg font-semibold text-foreground">
        Opis
      </h3>
      {listing.description ? (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {listing.description}
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Brak opisu roboczego dla tej oferty.
        </p>
      )}
    </div>
  );
}

function ListingStatusActionsCard({
  statusActions,
  rollbackLabel,
  isRollingBackStatus,
  onStatusChange,
  onStatusRollback,
}: {
  statusActions: StatusAction[];
  rollbackLabel: string | null;
  isRollingBackStatus: boolean;
  onStatusChange: (status: ListingStatus) => void;
  onStatusRollback: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h3 className="font-heading text-base font-semibold text-foreground">
        Zarządzanie statusem
      </h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {rollbackLabel ? (
          <Button
            variant="secondary"
            size="sm"
            className="justify-start gap-2 rounded-xl"
            onClick={onStatusRollback}
            disabled={isRollingBackStatus}
          >
            {isRollingBackStatus
              ? 'Cofanie statusu...'
              : `Cofnij do: ${rollbackLabel}`}
          </Button>
        ) : null}
        {statusActions.map((action) => (
          <Button
            key={action.status}
            variant="outline"
            size="sm"
            className="justify-start gap-2 rounded-xl"
            onClick={() => onStatusChange(action.status)}
          >
            {action.label}
          </Button>
        ))}
        {statusActions.length === 0 && !rollbackLabel ? (
          <p className="text-sm text-muted-foreground">
            Brak dostępnych akcji dla tego statusu.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ListingMetadataCard({ listing }: { listing: Listing }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h3 className="font-heading text-base font-semibold text-foreground">
        Informacje
      </h3>
      <dl className="mt-4 space-y-3 text-sm">
        <MetadataRow label="Status">
          <ListingStatusBadge status={listing.status} />
        </MetadataRow>
        <MetadataRow label="Utworzono">
          {formatDisplayDateNumeric(listing.createdAt)}
        </MetadataRow>
        {listing.publishedAt ? (
          <MetadataRow label="Opublikowano">
            {formatDisplayDateNumeric(listing.publishedAt)}
          </MetadataRow>
        ) : null}
        <MetadataRow label="Wyświetlenia">
          {listing.publicViewCount ?? 0}
        </MetadataRow>
        <MetadataRow label="Ostatnia zmiana">
          {formatDisplayDateNumeric(listing.updatedAt)}
        </MetadataRow>
      </dl>
    </div>
  );
}

function ListingLocationCard({ listing }: { listing: Listing }) {
  const address = listing.address;
  const listingAddress = formatDashboardListingAddress(address);

  if (!address) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h3 className="font-heading text-base font-semibold text-foreground">
        Lokalizacja
      </h3>
      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
        {listingAddress ? <AddressLink address={listingAddress} /> : null}
        {address.street ? <p className="pt-2">{address.street}</p> : null}
        <p>{[address.postalCode, address.city].filter(Boolean).join(' ')}</p>
        {address.district ? <p>{address.district}</p> : null}
        {address.voivodeship ? <p>{address.voivodeship}</p> : null}
      </div>
    </div>
  );
}

function formatDashboardListingAddress(
  address: Listing['address'] | null | undefined,
): string | null {
  if (!address) return null;

  const parts = [
    address.street,
    address.postalCode,
    address.city,
    address.district,
    address.voivodeship,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : null;
}

function getListingNextStep({
  listing,
  listingAddress,
  isActiveButUnpublished,
  inquiries,
  appointments,
  matchingClients,
  onOpenPublication,
  onOpenMessage,
}: {
  listing: Listing;
  listingAddress: string | null;
  isActiveButUnpublished: boolean;
  inquiries: PublicInquiry[];
  appointments: Appointment[];
  matchingClients: ListingMatchingClientResult[];
  onOpenPublication: () => void;
  onOpenMessage: () => void;
}): DashboardNextStep {
  const newInquiryCount = inquiries.filter(
    (inquiry) => inquiry.status === PublicLeadStatus.NEW,
  ).length;

  if (isActiveButUnpublished) {
    return {
      title: 'Opublikuj aktywną ofertę',
      description:
        'Oferta ma status aktywny, ale nie jest jeszcze widoczna publicznie. Publikacja odblokuje formularz kontaktowy i publiczny podgląd.',
      actionLabel: 'Przejdź do publikacji',
      onAction: onOpenPublication,
      icon: RadioTower,
      dueLabel: 'Wymaga uwagi',
    };
  }

  if (newInquiryCount > 0) {
    return {
      title: `Odpowiedz na ${newInquiryCount} nowe ${newInquiryCount === 1 ? 'zapytanie' : 'zapytania'}`,
      description:
        'Nowe leady z publicznej strony oferty wymagają szybkiego kontaktu, zanim stracą intencję zakupu lub najmu.',
      actionLabel: 'Otwórz zapytania',
      actionHref: `/dashboard/inquiries?listingId=${listing.id}&status=${PublicLeadStatus.NEW}`,
      icon: MessageSquareText,
      dueLabel: 'Teraz',
    };
  }

  if (appointments.length === 0) {
    return {
      title: 'Zaplanuj pierwszą prezentację',
      description:
        'Brak nadchodzących spotkań dla tej oferty. Dodaj prezentację albo follow-up, żeby oferta miała kolejny operacyjny krok.',
      actionLabel: 'Zaplanuj spotkanie',
      actionHref: buildNewAppointmentUrl({
        listingId: listing.id,
        listingLabel: listing.title,
        location: listingAddress ?? undefined,
      }),
      icon: Calendar,
      dueLabel: 'Plan pracy',
    };
  }

  if (matchingClients.length > 0) {
    const bestMatch = matchingClients[0]!;

    return {
      title: 'Sprawdź najlepiej dopasowanego klienta',
      description: `${bestMatch.client.firstName} ${bestMatch.client.lastName} ma dopasowanie ${bestMatch.score}%. Zweryfikuj, czy warto wysłać propozycję oferty.`,
      actionLabel: 'Otwórz klienta',
      actionHref: `/dashboard/clients/${bestMatch.client.id}`,
      icon: Sparkles,
      dueLabel: 'Szansa',
    };
  }

  return {
    title: 'Wyślij aktualizację do właściciela',
    description:
      'Podsumuj status oferty, aktywność publiczną i najbliższe działania, żeby właściciel miał jasny obraz pracy.',
    actionLabel: 'Przygotuj wiadomość',
    onAction: onOpenMessage,
    icon: Send,
    dueLabel: 'Komunikacja',
  };
}

function MetadataRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right text-foreground">{children}</dd>
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function getListingDetailTabs(listing: Listing): ListingDetailTab[] {
  return [
    {
      id: 'overview',
      label: 'Przegląd',
      description: 'Parametry, status, opis i podstawowe informacje.',
      icon: ClipboardList,
      badge: LISTING_STATUS_LABELS[listing.status],
    },
    {
      id: 'publication',
      label: 'Publikacja',
      description: 'Publiczna strona oferty, SEO i ustawienia widoczności.',
      icon: Eye,
      badge:
        listing.publicationStatus === ListingPublicationStatus.PUBLISHED
          ? 'Online'
          : 'Robocze',
    },
    {
      id: 'documents',
      label: 'Dokumenty',
      description: 'Checklisty, pliki i status kompletności dokumentów.',
      icon: FileText,
    },
    {
      id: 'history',
      label: 'Historia',
      description: 'Ostatnie zmiany i audyt pracy na tej ofercie.',
      icon: Activity,
    },
  ];
}

function getCommissionDescription(listing: Listing): string {
  if (!listing.commissionType || listing.commissionValue === null) {
    return 'Prywatne pole dashboardu. Ustaw prowizję w edycji oferty.';
  }

  const value = Number(listing.commissionValue);
  const formattedValue =
    listing.commissionType === 'percentage'
      ? `${value.toLocaleString('pl-PL')}% ceny`
      : formatPrice(value, listing.currency);

  return `${LISTING_COMMISSION_TYPE_LABELS[listing.commissionType]}: ${formattedValue}. Widoczne tylko w dashboardzie.`;
}

interface StatusAction {
  status: ListingStatus;
  label: string;
}

function getStatusActions(current: ListingStatus): StatusAction[] {
  const actions: StatusAction[] = [];
  switch (current) {
    case LS.DRAFT:
      actions.push({ status: LS.ACTIVE, label: 'Opublikuj ofertę' });
      break;
    case LS.ACTIVE:
      actions.push({ status: LS.RESERVED, label: 'Zarezerwuj' });
      actions.push({ status: LS.SOLD, label: 'Oznacz jako sprzedane' });
      actions.push({ status: LS.RENTED, label: 'Oznacz jako wynajęte' });
      actions.push({ status: LS.WITHDRAWN, label: 'Wycofaj' });
      break;
    case LS.RESERVED:
      actions.push({ status: LS.ACTIVE, label: 'Przywróć do aktywnych' });
      actions.push({ status: LS.SOLD, label: 'Oznacz jako sprzedane' });
      actions.push({ status: LS.RENTED, label: 'Oznacz jako wynajęte' });
      break;
    case LS.WITHDRAWN:
      actions.push({ status: LS.ACTIVE, label: 'Przywróć do aktywnych' });
      actions.push({ status: LS.ARCHIVED, label: 'Zarchiwizuj' });
      break;
    case LS.SOLD:
    case LS.RENTED:
      actions.push({ status: LS.ARCHIVED, label: 'Zarchiwizuj' });
      break;
    // archived — no actions
  }
  return actions;
}

function getStatusChangeConfirmationDescription(
  listing: Listing,
  nextStatus: ListingStatus,
): string {
  const baseDescription = `Status zostanie zmieniony z „${LISTING_STATUS_LABELS[listing.status]}” na „${LISTING_STATUS_LABELS[nextStatus]}”.`;

  if (
    listing.publicationStatus === ListingPublicationStatus.PUBLISHED &&
    nextStatus !== LS.ACTIVE
  ) {
    return `${baseDescription} Publiczna strona oferty zostanie automatycznie wyłączona.`;
  }

  return baseDescription;
}
