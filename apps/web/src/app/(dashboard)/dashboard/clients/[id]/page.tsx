'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Calendar,
  Wallet,
  Info,
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
import { useConfirm } from '@/contexts/confirm-context';
import { useToast } from '@/contexts/toast-context';
import { useActivityHistory } from '@/hooks/use-activity-history';
import { ClientStatusBadge } from '@/components/clients/client-status-badge';
import { ClientNotes } from '@/components/clients/client-notes';
import { ClientPreferencesCard } from '@/components/clients/client-preferences';
import {
  CLIENT_HISTORY_FIELD_LABELS,
  fetchClientHistory,
  getRollbackStatusChange,
} from '@/lib/activity';
import { buildPhoneHref } from '@/lib/contact-links';
import { buildNewAppointmentUrl } from '@/lib/dashboard-links';
import { formatDisplayDateNumeric } from '@/lib/date-format';
import {
  fetchClient,
  deleteClient,
  rollbackClientStatus,
  updateClient,
  type Client,
  type ClientStatus,
  CLIENT_STATUS_LABELS,
  CLIENT_SOURCE_LABELS,
  SOURCE_BADGE_VARIANT,
  clientFullName,
  clientInitials,
  formatBudgetRange,
  getClientStatusActions,
} from '@/lib/clients';

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { confirm } = useConfirm();
  const { error: showErrorToast, success: showSuccessToast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRollingBackStatus, setIsRollingBackStatus] = useState(false);
  const {
    items: historyItems,
    isLoading: isHistoryLoading,
    error: historyError,
    refresh: refreshHistory,
  } = useActivityHistory(params.id, fetchClientHistory);
  const rollbackChange = getRollbackStatusChange(
    historyItems,
    client?.status ?? '',
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
        void refreshHistory();
      } catch (err) {
        showErrorToast({
          title: 'Nie udało się zmienić statusu',
          description:
            err instanceof Error ? err.message : 'Spróbuj ponownie za chwilę.',
        });
      }
    },
    [client, confirm, refreshHistory, showErrorToast],
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
      await refreshHistory();
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
    refreshHistory,
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

          {/* Notes timeline */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <ClientNotes
              clientId={client.id}
              onHistoryChanged={refreshHistory}
            />
          </div>
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
            <div className="space-y-3">
              <RelationCard
                href={scheduleAppointmentUrl}
                title="Zaplanuj spotkanie z klientem"
                description="Formularz spotkania otworzy się z przypisanym klientem."
              />
              <ActionEmptyState>
                Powiązane oferty i historia spotkań pojawią się tutaj po
                dopisaniu pierwszej aktywności dla klienta.
              </ActionEmptyState>
            </div>
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
    </div>
  );
}
