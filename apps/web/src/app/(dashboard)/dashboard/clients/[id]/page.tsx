'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Calendar,
  MessageSquareText,
  Wallet,
  Info,
  Sparkles,
  MapPin,
  Home,
  Ruler,
  BedDouble,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ActionEmptyState,
  ContactAction,
  DetailCard,
  RelationCard,
} from '@/components/common';
import { ActivityHistoryCard } from '@/components/activity/activity-history-card';
import { ActivityTimeline } from '@/components/activity/activity-timeline';
import { MessageTemplateDialog } from '@/components/messages/message-template-dialog';
import { useAuth } from '@/contexts/auth-context';
import { useConfirm } from '@/contexts/confirm-context';
import { useToast } from '@/contexts/toast-context';
import { useActivityHistory } from '@/hooks/use-activity-history';
import { useActivityTimeline } from '@/hooks/use-activity-timeline';
import { useAppointments } from '@/hooks/use-appointments';
import { ClientStatusBadge } from '@/components/clients/client-status-badge';
import { ClientNotes } from '@/components/clients/client-notes';
import { ClientPreferencesCard } from '@/components/clients/client-preferences';
import {
  CLIENT_HISTORY_FIELD_LABELS,
  fetchClientActivity,
  fetchClientHistory,
  getRollbackStatusChange,
} from '@/lib/activity';
import { buildPhoneHref } from '@/lib/contact-links';
import { buildNewAppointmentUrl } from '@/lib/dashboard-links';
import {
  formatDisplayTime,
  formatDisplayDateNumeric,
  formatDisplayTimeRange,
} from '@/lib/date-format';
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TYPE_LABELS,
  type Appointment,
} from '@/lib/appointments';
import {
  fetchClient,
  fetchClientMatchingListings,
  dismissClientMatchingListing,
  deleteClient,
  rollbackClientStatus,
  updateClient,
  type Client,
  type ClientPreference,
  type ClientStatus,
  type MatchingListingResult,
  CLIENT_STATUS_LABELS,
  CLIENT_SOURCE_LABELS,
  SOURCE_BADGE_VARIANT,
  clientFullName,
  clientInitials,
  formatBudgetRange,
  getClientStatusActions,
} from '@/lib/clients';
import {
  buildAgentMessageTemplateContext,
  MessageTemplateType,
  type MessageTemplateContext,
} from '@/lib/message-templates';
import {
  formatPrice,
  PROPERTY_TYPE_LABELS as LISTING_PROPERTY_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
  type PropertyType as ListingPropertyType,
  type TransactionType,
} from '@/lib/listings';

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { error: showErrorToast, success: showSuccessToast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRollingBackStatus, setIsRollingBackStatus] = useState(false);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [matchingListings, setMatchingListings] = useState<
    MatchingListingResult[]
  >([]);
  const [isMatchingListingsLoading, setIsMatchingListingsLoading] =
    useState(true);
  const [matchingListingsError, setMatchingListingsError] = useState<
    string | null
  >(null);
  const [dismissingMatchingListingIds, setDismissingMatchingListingIds] =
    useState<Set<string>>(() => new Set());
  const {
    items: historyItems,
    isLoading: isHistoryLoading,
    error: historyError,
    refresh: refreshHistory,
  } = useActivityHistory(params.id, fetchClientHistory);
  const {
    items: activityItems,
    isLoading: isActivityLoading,
    isLoadingMore: isActivityLoadingMore,
    error: activityError,
    total: activityTotal,
    hasMore: hasMoreActivity,
    refresh: refreshActivity,
    loadMore: loadMoreActivity,
  } = useActivityTimeline(params.id, fetchClientActivity);
  const rollbackChange = getRollbackStatusChange(
    historyItems,
    client?.status ?? '',
  );
  const relatedAppointmentsFilters = useMemo(
    () => ({
      clientId: params.id,
      from: new Date().toISOString(),
      page: 1,
      limit: 5,
      sortBy: 'startTime' as const,
      sortOrder: 'ASC' as const,
    }),
    [params.id],
  );
  const {
    appointments: relatedAppointments,
    isLoading: isRelatedAppointmentsLoading,
    error: relatedAppointmentsError,
  } = useAppointments(relatedAppointmentsFilters);
  const agentMessageContext = useMemo(
    () => buildAgentMessageTemplateContext(user),
    [user],
  );
  const messageContext = useMemo<MessageTemplateContext>(
    () =>
      client
        ? buildClientMessageContext(
            client,
            relatedAppointments[0] ?? null,
            agentMessageContext,
          )
        : agentMessageContext,
    [agentMessageContext, client, relatedAppointments],
  );

  useEffect(() => {
    if (!params.id) return;
    setIsLoading(true);
    fetchClient(params.id)
      .then(setClient)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Nie znaleziono klienta'),
      )
      .finally(() => setIsLoading(false));
  }, [params.id]);

  useEffect(() => {
    if (!params.id) return;

    let isCancelled = false;
    setIsMatchingListingsLoading(true);
    setMatchingListingsError(null);

    fetchClientMatchingListings(params.id)
      .then((items) => {
        if (!isCancelled) {
          setMatchingListings(items);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setMatchingListings([]);
          setMatchingListingsError(
            err instanceof Error
              ? err.message
              : 'Nie udało się pobrać dopasowanych ofert',
          );
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsMatchingListingsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [params.id]);

  const refreshClientActivity = useCallback(() => {
    void refreshHistory();
    void refreshActivity();
  }, [refreshActivity, refreshHistory]);

  const handleDismissMatchingListing = useCallback(
    async (listingId: string) => {
      if (!client) return;

      setDismissingMatchingListingIds((current) => {
        const next = new Set(current);
        next.add(listingId);
        return next;
      });

      try {
        await dismissClientMatchingListing(client.id, listingId);
        setMatchingListings((items) =>
          items.filter((item) => item.listing.id !== listingId),
        );
        showSuccessToast({
          title: 'Dopasowanie ukryte',
          description:
            'Oferta nie będzie już widoczna w dopasowaniach klienta.',
        });
      } catch (err) {
        showErrorToast({
          title: 'Nie udało się ukryć dopasowania',
          description:
            err instanceof Error ? err.message : 'Spróbuj ponownie za chwilę.',
        });
      } finally {
        setDismissingMatchingListingIds((current) => {
          const next = new Set(current);
          next.delete(listingId);
          return next;
        });
      }
    },
    [client, showErrorToast, showSuccessToast],
  );

  const handleDelete = useCallback(async () => {
    if (!client) return;
    const confirmed = await confirm({
      title: 'Usunąć klienta?',
      description: 'Tej operacji nie można cofnąć.',
      confirmLabel: 'Usuń klienta',
      cancelLabel: 'Anuluj',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      await deleteClient(client.id);
      router.push('/dashboard/clients');
    } catch (err) {
      showErrorToast({
        title: 'Nie udało się usunąć klienta',
        description:
          err instanceof Error ? err.message : 'Spróbuj ponownie za chwilę.',
      });
    }
  }, [client, confirm, router, showErrorToast]);

  const handleStatusChange = useCallback(
    async (newStatus: ClientStatus) => {
      if (!client) return;

      const confirmed = await confirm({
        title: 'Zmienić status klienta?',
        description: `Status zostanie zmieniony z „${CLIENT_STATUS_LABELS[client.status]}” na „${CLIENT_STATUS_LABELS[newStatus]}”.`,
        confirmLabel: 'Zmień status',
        cancelLabel: 'Anuluj',
      });

      if (!confirmed) return;

      try {
        const updated = await updateClient(client.id, { status: newStatus });
        setClient(updated);
        refreshClientActivity();
      } catch (err) {
        showErrorToast({
          title: 'Nie udało się zmienić statusu',
          description:
            err instanceof Error ? err.message : 'Spróbuj ponownie za chwilę.',
        });
      }
    },
    [client, confirm, refreshClientActivity, showErrorToast],
  );

  const handleStatusRollback = useCallback(async () => {
    if (
      !client ||
      !rollbackChange ||
      typeof rollbackChange.oldValue !== 'string'
    ) {
      return;
    }

    const previousStatus = rollbackChange.oldValue as ClientStatus;
    const confirmed = await confirm({
      title: 'Cofnąć ostatnią zmianę statusu?',
      description: `Status klienta wróci z „${CLIENT_STATUS_LABELS[client.status]}” do „${CLIENT_STATUS_LABELS[previousStatus]}”.`,
      confirmLabel: 'Cofnij status',
      cancelLabel: 'Anuluj',
    });

    if (!confirmed) return;

    try {
      setIsRollingBackStatus(true);
      const updated = await rollbackClientStatus(client.id);
      setClient(updated);
      refreshClientActivity();
      showSuccessToast({
        title: 'Status klienta cofnięty',
        description: `Przywrócono status „${CLIENT_STATUS_LABELS[updated.status]}”.`,
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
    client,
    confirm,
    refreshClientActivity,
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

  if (error || !client) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć do listy
        </Link>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive">
            {error ?? 'Nie znaleziono klienta'}
          </p>
        </div>
      </div>
    );
  }

  const budgetRange = formatBudgetRange(client.budgetMin, client.budgetMax);
  const statusActions = getClientStatusActions(client.status);
  const scheduleAppointmentUrl = buildNewAppointmentUrl({
    clientId: client.id,
    clientLabel: clientFullName(client),
  });
  const primaryAppointment = relatedAppointments[0] ?? null;
  const initialMessageTemplate = primaryAppointment
    ? MessageTemplateType.APPOINTMENT_CONFIRMATION
    : MessageTemplateType.VIEWING_FOLLOW_UP;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć do listy klientów
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
            {clientInitials(client)}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-2xl font-bold text-foreground">
                {clientFullName(client)}
              </h1>
              <ClientStatusBadge status={client.status} />
              <Badge variant={SOURCE_BADGE_VARIANT[client.source]}>
                {CLIENT_SOURCE_LABELS[client.source]}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground">
              Kontakt, preferencje i aktywność klienta w jednym miejscu.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsMessageDialogOpen(true)}
            className="gap-1.5 rounded-xl"
          >
            <MessageSquareText className="h-3.5 w-3.5" />
            Wiadomość
          </Button>
          <Link href={scheduleAppointmentUrl}>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
              <Calendar className="h-3.5 w-3.5" />
              Spotkanie
            </Button>
          </Link>
          <Link href={`/dashboard/clients/${client.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
              <Pencil className="h-3.5 w-3.5" />
              Edytuj
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="gap-1.5 rounded-xl"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Usuń
          </Button>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — details & notes */}
        <div className="space-y-6 lg:col-span-2">
          {/* Budget card */}
          <DetailCard title="Budżet" icon={Wallet}>
            {budgetRange !== '—' ? (
              <p className="font-heading text-2xl font-bold text-primary">
                {budgetRange}
              </p>
            ) : (
              <ActionEmptyState
                action={
                  <Link href={`/dashboard/clients/${client.id}/edit`}>
                    <Button variant="outline" size="sm" className="rounded-xl">
                      Uzupełnij budżet
                    </Button>
                  </Link>
                }
              >
                Budżet klienta nie został jeszcze uzupełniony.
              </ActionEmptyState>
            )}
          </DetailCard>

          {/* General notes */}
          <DetailCard title="Informacje dodatkowe" icon={Info}>
            {client.notes ? (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {client.notes}
              </p>
            ) : (
              <ActionEmptyState
                action={
                  <Link href={`/dashboard/clients/${client.id}/edit`}>
                    <Button variant="outline" size="sm" className="rounded-xl">
                      Dodaj informacje
                    </Button>
                  </Link>
                }
              >
                Brak dodatkowych informacji o kliencie.
              </ActionEmptyState>
            )}
          </DetailCard>

          {/* Preferences */}
          <ClientPreferencesCard preference={client.preference} />

          <MatchingListingsCard
            client={client}
            listings={matchingListings}
            isLoading={isMatchingListingsLoading}
            error={matchingListingsError}
            dismissingListingIds={dismissingMatchingListingIds}
            onDismissListing={handleDismissMatchingListing}
          />

          {/* Notes timeline */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <ClientNotes
              clientId={client.id}
              onHistoryChanged={refreshClientActivity}
            />
          </div>

          <ActivityTimeline
            items={activityItems}
            isLoading={isActivityLoading}
            isLoadingMore={isActivityLoadingMore}
            error={activityError}
            onRefresh={refreshActivity}
            onLoadMore={loadMoreActivity}
            hasMore={hasMoreActivity}
            total={activityTotal}
          />
        </div>

        {/* Right column — sidebar */}
        <div className="space-y-6">
          <DetailCard title="Kontakt" icon={Mail}>
            <div className="grid gap-3">
              <ContactAction
                icon={Mail}
                label="Email"
                value={client.email}
                href={client.email ? `mailto:${client.email}` : undefined}
              />
              <ContactAction
                icon={Phone}
                label="Telefon"
                value={client.phone}
                href={client.phone ? buildPhoneHref(client.phone) : undefined}
              />
            </div>
          </DetailCard>

          <DetailCard title="Powiązania" icon={Calendar}>
            <ClientRelationsContent
              appointments={relatedAppointments}
              isLoading={isRelatedAppointmentsLoading}
              error={relatedAppointmentsError}
              scheduleAppointmentUrl={scheduleAppointmentUrl}
            />
          </DetailCard>

          {/* Status management */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-heading text-base font-semibold text-foreground">
              Zarządzanie statusem
            </h2>
            <div className="mt-4 space-y-2">
              {rollbackChange &&
                typeof rollbackChange.oldValue === 'string' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-start gap-2 rounded-xl"
                    onClick={handleStatusRollback}
                    disabled={isRollingBackStatus}
                  >
                    {isRollingBackStatus
                      ? 'Cofanie statusu...'
                      : `Cofnij do: ${CLIENT_STATUS_LABELS[rollbackChange.oldValue as ClientStatus]}`}
                  </Button>
                )}
              {statusActions.map((action) => (
                <Button
                  key={action.status}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 rounded-xl"
                  onClick={() => handleStatusChange(action.status)}
                >
                  {action.label}
                </Button>
              ))}
              {statusActions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Brak dostępnych akcji dla tego statusu.
                </p>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-heading text-base font-semibold text-foreground">
              Informacje
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <ClientStatusBadge status={client.status} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Źródło</dt>
                <dd className="text-foreground">
                  {CLIENT_SOURCE_LABELS[client.source]}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Utworzono</dt>
                <dd className="text-foreground">
                  {formatDisplayDateNumeric(client.createdAt)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Ostatnia zmiana</dt>
                <dd className="text-foreground">
                  {formatDisplayDateNumeric(client.updatedAt)}
                </dd>
              </div>
            </dl>
          </div>

          <ActivityHistoryCard
            entityType="client"
            items={historyItems}
            isLoading={isHistoryLoading}
            error={historyError}
            onRefresh={refreshHistory}
            fieldLabels={CLIENT_HISTORY_FIELD_LABELS}
          />
        </div>
      </div>

      <MessageTemplateDialog
        isOpen={isMessageDialogOpen}
        title={`Wiadomość do: ${clientFullName(client)}`}
        initialTemplateType={initialMessageTemplate}
        context={messageContext}
        onClose={() => setIsMessageDialogOpen(false)}
      />
    </div>
  );
}

function buildClientMessageContext(
  client: Client,
  appointment: Appointment | null,
  agentContext: MessageTemplateContext,
): MessageTemplateContext {
  return {
    ...agentContext,
    clientName: clientFullName(client),
    listingTitle: appointment?.listing?.title,
    listingAddress: appointment?.listing?.address
      ? formatAppointmentListingAddress(appointment.listing.address)
      : appointment?.location,
    appointmentDate: appointment
      ? formatDisplayDateNumeric(appointment.startTime)
      : null,
    appointmentTime: appointment
      ? formatDisplayTime(appointment.startTime)
      : null,
    documentList:
      '- dokument potwierdzający własność\n- świadectwo energetyczne, jeśli jest dostępne\n- rzut lokalu, jeśli jest dostępny',
  };
}

function formatAppointmentListingAddress(
  address: NonNullable<NonNullable<Appointment['listing']>['address']>,
): string {
  return [address.street, address.postalCode, address.city, address.district]
    .filter(Boolean)
    .join(', ');
}

function MatchingListingsCard({
  client,
  listings,
  isLoading,
  error,
  dismissingListingIds,
  onDismissListing,
}: {
  client: Client;
  listings: MatchingListingResult[];
  isLoading: boolean;
  error: string | null;
  dismissingListingIds: Set<string>;
  onDismissListing: (listingId: string) => void;
}) {
  const hasPreferences = hasClientMatchingPreferences(client.preference);

  return (
    <DetailCard title="Pasujące oferty" icon={Sparkles}>
      {!hasPreferences ? (
        <ActionEmptyState
          action={
            <Link href={`/dashboard/clients/${client.id}/edit`}>
              <Button variant="outline" size="sm" className="rounded-xl">
                Uzupełnij preferencje
              </Button>
            </Link>
          }
        >
          Uzupełnij preferencje klienta, żeby dopasowania były trafne i
          łatwiejsze do obronienia w rozmowie.
        </ActionEmptyState>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">
          Szukam pasujących aktywnych ofert...
        </p>
      ) : error ? (
        <ActionEmptyState>
          Nie udało się pobrać dopasowanych ofert. Spróbuj odświeżyć widok.
        </ActionEmptyState>
      ) : listings.length === 0 ? (
        <ActionEmptyState>
          Brak aktywnych ofert spełniających aktualne preferencje klienta.
        </ActionEmptyState>
      ) : (
        <div className="space-y-3">
          {listings.slice(0, 5).map((item) => (
            <MatchingListingItem
              key={item.listing.id}
              client={client}
              match={item}
              isDismissing={dismissingListingIds.has(item.listing.id)}
              onDismiss={() => onDismissListing(item.listing.id)}
            />
          ))}
          {listings.length > 5 ? (
            <p className="text-xs text-muted-foreground">
              Pokazano 5 z {listings.length} najlepszych dopasowań.
            </p>
          ) : null}
        </div>
      )}
    </DetailCard>
  );
}

function MatchingListingItem({
  client,
  match,
  isDismissing,
  onDismiss,
}: {
  client: Client;
  match: MatchingListingResult;
  isDismissing: boolean;
  onDismiss: () => void;
}) {
  const { listing } = match;
  const scheduleUrl = buildNewAppointmentUrl({
    clientId: client.id,
    clientLabel: clientFullName(client),
    listingId: listing.id,
    listingLabel: listing.title,
  });
  const address = formatMatchingListingAddress(listing.address);

  return (
    <div className="rounded-xl border border-border/70 bg-muted/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/listings/${listing.id}`}
              className="font-medium text-foreground hover:text-primary"
            >
              {listing.title}
            </Link>
            <Badge variant="success">{Math.round(match.score)}%</Badge>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Home className="h-3.5 w-3.5" />
              {getListingPropertyLabel(listing.propertyType)}
            </span>
            <span>{getTransactionTypeLabel(listing.transactionType)}</span>
            {address ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {address}
              </span>
            ) : null}
            {listing.areaM2 ? (
              <span className="inline-flex items-center gap-1">
                <Ruler className="h-3.5 w-3.5" />
                {formatArea(listing.areaM2)}
              </span>
            ) : null}
            {listing.rooms ? (
              <span className="inline-flex items-center gap-1">
                <BedDouble className="h-3.5 w-3.5" />
                {listing.rooms} pok.
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {match.reasons.map((reason) => (
              <Badge
                key={`${listing.id}-${reason.code}`}
                variant={getMatchingReasonBadgeVariant(reason.type)}
              >
                {reason.label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <p className="font-heading text-lg font-semibold text-foreground">
            {formatPrice(listing.price, listing.currency)}
          </p>
          <Link href={scheduleUrl}>
            <Button variant="outline" size="sm" className="rounded-xl">
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
    </div>
  );
}

function hasClientMatchingPreferences(
  preference: ClientPreference | null | undefined,
): boolean {
  if (!preference) return false;
  return Boolean(
    preference.propertyType ||
    preference.minArea ||
    preference.maxPrice ||
    preference.preferredCity ||
    preference.minRooms,
  );
}

function formatMatchingListingAddress(
  address: MatchingListingResult['listing']['address'],
): string | null {
  if (!address) return null;
  const parts = [address.city, address.district].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

function formatArea(value: number | string): string {
  const area = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (!Number.isFinite(area)) return `${value} m²`;
  return `${new Intl.NumberFormat('pl-PL', {
    maximumFractionDigits: 1,
  }).format(area)} m²`;
}

function getListingPropertyLabel(value: string): string {
  return (
    LISTING_PROPERTY_TYPE_LABELS[value as ListingPropertyType] ??
    'Typ nieruchomości'
  );
}

function getTransactionTypeLabel(value: string): string {
  return TRANSACTION_TYPE_LABELS[value as TransactionType] ?? 'Transakcja';
}

function getMatchingReasonBadgeVariant(
  type: MatchingListingResult['reasons'][number]['type'],
): 'success' | 'muted' | 'warning' {
  if (type === 'positive') return 'success';
  if (type === 'negative') return 'warning';
  return 'muted';
}

function ClientRelationsContent({
  appointments,
  isLoading,
  error,
  scheduleAppointmentUrl,
}: {
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
  scheduleAppointmentUrl: string;
}) {
  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Ładowanie powiązanych spotkań...
      </p>
    );
  }

  if (error) {
    return (
      <ActionEmptyState>
        Nie udało się pobrać powiązanych spotkań. Spróbuj odświeżyć widok.
      </ActionEmptyState>
    );
  }

  return (
    <div className="space-y-3">
      <RelationCard
        href={scheduleAppointmentUrl}
        title="Zaplanuj spotkanie z klientem"
        description="Formularz spotkania otworzy się z przypisanym klientem."
      />

      {appointments.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Najbliższe spotkania
          </p>
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
      ) : (
        <ActionEmptyState>
          Brak nadchodzących spotkań z tym klientem.
        </ActionEmptyState>
      )}
    </div>
  );
}
