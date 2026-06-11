'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ActivityHistoryCard } from '@/components/activity/activity-history-card';
import { ListingDocumentsPanel } from '@/components/listings/listing-documents-panel';
import { ListingPublicationPanel } from '@/components/listings/listing-publication-panel';
import { useConfirm } from '@/contexts/confirm-context';
import { useToast } from '@/contexts/toast-context';
import { useActivityHistory } from '@/hooks/use-activity-history';
import { ListingStatusBadge } from '@/components/listings/listing-status-badge';
import {
  fetchListingHistory,
  getRollbackStatusChange,
  LISTING_HISTORY_FIELD_LABELS,
} from '@/lib/activity';
import {
  fetchListing,
  deleteListing,
  rollbackListingStatus,
  updateListing,
  type Listing,
  type ListingStatus,
  ListingStatus as LS,
  ListingPublicationStatus,
  PROPERTY_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
  LISTING_STATUS_LABELS,
  LISTING_COMMISSION_TYPE_LABELS,
  formatPrice,
  formatArea,
  formatListingCommission,
} from '@/lib/listings';

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { confirm } = useConfirm();
  const { error: showErrorToast, success: showSuccessToast } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [activeTab, setActiveTab] =
    useState<ListingDetailTabId>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRollingBackStatus, setIsRollingBackStatus] = useState(false);
  const {
    items: historyItems,
    isLoading: isHistoryLoading,
    error: historyError,
    refresh: refreshHistory,
  } = useActivityHistory(params.id, fetchListingHistory);
  const rollbackChange = getRollbackStatusChange(
    historyItems,
    listing?.status ?? '',
  );

  useEffect(() => {
    if (!params.id) return;
    setIsLoading(true);
    fetchListing(params.id)
      .then(setListing)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Nie znaleziono oferty'),
      )
      .finally(() => setIsLoading(false));
  }, [params.id]);

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
        void refreshHistory();
      } catch (err) {
        showErrorToast({
          title: 'Nie udało się zmienić statusu',
          description:
            err instanceof Error ? err.message : 'Spróbuj ponownie za chwilę.',
        });
      }
    },
    [confirm, listing, refreshHistory, showErrorToast],
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
      await refreshHistory();
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
  const locationParts = [
    address?.street,
    address?.district,
    address?.city,
    address?.voivodeship,
  ].filter(Boolean);

  // Available status transitions
  const statusActions = getStatusActions(listing.status);
  const tabs = getListingDetailTabs(listing);
  const selectedTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0]!;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/dashboard/listings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć do listy ofert
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-bold text-foreground">
              {listing.title}
            </h1>
            <ListingStatusBadge status={listing.status} />
          </div>
          {locationParts.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{locationParts.join(', ')}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/listings/${listing.id}/edit`}>
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
          value={new Date(listing.updatedAt).toLocaleDateString('pl-PL')}
          subtitle={`Utworzono ${new Date(listing.createdAt).toLocaleDateString('pl-PL')}`}
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
                      <span className="text-sm font-semibold">
                        {tab.label}
                      </span>
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
              onStatusChange={handleStatusChange}
              onStatusRollback={handleStatusRollback}
            />
          ) : null}

          {selectedTab.id === 'publication' ? (
            <ListingPublicationPanel
              listing={listing}
              onListingChange={setListing}
            />
          ) : null}

          {selectedTab.id === 'documents' ? (
            <ListingDocumentsPanel listingId={listing.id} />
          ) : null}

          {selectedTab.id === 'history' ? (
            <ActivityHistoryCard
              entityType="listing"
              items={historyItems}
              isLoading={isHistoryLoading}
              error={historyError}
              onRefresh={refreshHistory}
              fieldLabels={LISTING_HISTORY_FIELD_LABELS}
            />
          ) : null}
        </div>
      </section>
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

function ListingOverviewContent({
  listing,
  statusActions,
  rollbackLabel,
  isRollingBackStatus,
  onStatusChange,
  onStatusRollback,
}: {
  listing: Listing;
  statusActions: StatusAction[];
  rollbackLabel: string | null;
  isRollingBackStatus: boolean;
  onStatusChange: (status: ListingStatus) => void;
  onStatusRollback: () => void;
}) {
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
        <ListingMetadataCard listing={listing} />
        <ListingLocationCard listing={listing} />
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
            {isRollingBackStatus ? 'Cofanie statusu...' : `Cofnij do: ${rollbackLabel}`}
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
          {new Date(listing.createdAt).toLocaleDateString('pl-PL')}
        </MetadataRow>
        {listing.publishedAt ? (
          <MetadataRow label="Opublikowano">
            {new Date(listing.publishedAt).toLocaleDateString('pl-PL')}
          </MetadataRow>
        ) : null}
        <MetadataRow label="Wyświetlenia">
          {listing.publicViewCount ?? 0}
        </MetadataRow>
        <MetadataRow label="Ostatnia zmiana">
          {new Date(listing.updatedAt).toLocaleDateString('pl-PL')}
        </MetadataRow>
      </dl>
    </div>
  );
}

function ListingLocationCard({ listing }: { listing: Listing }) {
  const address = listing.address;

  if (!address) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h3 className="font-heading text-base font-semibold text-foreground">
        Lokalizacja
      </h3>
      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
        {address.street ? <p>{address.street}</p> : null}
        <p>{[address.postalCode, address.city].filter(Boolean).join(' ')}</p>
        {address.district ? <p>{address.district}</p> : null}
        {address.voivodeship ? <p>{address.voivodeship}</p> : null}
      </div>
    </div>
  );
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
