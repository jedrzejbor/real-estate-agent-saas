'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  MapPin,
  BedDouble,
  Bath,
  Maximize,
  Building,
  Calendar,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActivityHistoryCard } from '@/components/activity/activity-history-card';
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
  PROPERTY_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
  LISTING_STATUS_LABELS,
  formatPrice,
  formatArea,
} from '@/lib/listings';

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { confirm } = useConfirm();
  const { error: showErrorToast, success: showSuccessToast } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
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
        description: `Status zostanie zmieniony z „${LISTING_STATUS_LABELS[listing.status]}” na „${LISTING_STATUS_LABELS[newStatus]}”.`,
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
    if (!listing || !rollbackChange || typeof rollbackChange.oldValue !== 'string') {
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

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Price card */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">Cena</p>
            <p className="mt-1 font-heading text-3xl font-bold text-primary">
              {formatPrice(listing.price, listing.currency)}
            </p>
            {listing.areaM2 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {formatPrice(
                  Number(listing.price) / Number(listing.areaM2),
                  listing.currency,
                )}
                /m²
              </p>
            )}
          </div>

          {/* Parameters */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Parametry
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
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
              {listing.plotAreaM2 && (
                <DetailItem
                  icon={<Maximize className="h-4 w-4" />}
                  label="Powierzchnia działki"
                  value={formatArea(listing.plotAreaM2)}
                />
              )}
              {listing.areaM2 && (
                <DetailItem
                  icon={<Maximize className="h-4 w-4" />}
                  label="Powierzchnia"
                  value={formatArea(listing.areaM2)}
                />
              )}
              {listing.rooms && (
                <DetailItem
                  icon={<BedDouble className="h-4 w-4" />}
                  label="Pokoje"
                  value={String(listing.rooms)}
                />
              )}
              {listing.bathrooms !== undefined && listing.bathrooms !== null && (
                <DetailItem
                  icon={<Bath className="h-4 w-4" />}
                  label="Łazienki"
                  value={String(listing.bathrooms)}
                />
              )}
              {listing.floor !== undefined && listing.floor !== null && (
                <DetailItem
                  icon={<Building className="h-4 w-4" />}
                  label="Piętro"
                  value={
                    listing.totalFloors
                      ? `${listing.floor} / ${listing.totalFloors}`
                      : String(listing.floor)
                  }
                />
              )}
              {listing.yearBuilt && (
                <DetailItem
                  icon={<Calendar className="h-4 w-4" />}
                  label="Rok budowy"
                  value={String(listing.yearBuilt)}
                />
              )}
            </div>
          </div>

          {/* Description */}
          {listing.description && (
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Opis
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {listing.description}
              </p>
            </div>
          )}
        </div>

        {/* Right column - sidebar */}
        <div className="space-y-6">
          <ListingPublicationPanel
            listing={listing}
            onListingChange={setListing}
            density="compact"
          />

          {/* Status management */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h2 className="font-heading text-base font-semibold text-foreground">
              Zarządzanie statusem
            </h2>
            <div className="mt-4 space-y-2">
              {rollbackChange && typeof rollbackChange.oldValue === 'string' && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start gap-2 rounded-xl"
                  onClick={handleStatusRollback}
                  disabled={isRollingBackStatus}
                >
                  {isRollingBackStatus
                    ? 'Cofanie statusu...'
                    : `Cofnij do: ${LISTING_STATUS_LABELS[rollbackChange.oldValue as ListingStatus]}`}
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
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h2 className="font-heading text-base font-semibold text-foreground">
              Informacje
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <ListingStatusBadge status={listing.status} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Utworzono</dt>
                <dd className="text-foreground">
                  {new Date(listing.createdAt).toLocaleDateString('pl-PL')}
                </dd>
              </div>
              {listing.publishedAt && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Opublikowano</dt>
                  <dd className="text-foreground">
                    {new Date(listing.publishedAt).toLocaleDateString('pl-PL')}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Ostatnia zmiana</dt>
                <dd className="text-foreground">
                  {new Date(listing.updatedAt).toLocaleDateString('pl-PL')}
                </dd>
              </div>
            </dl>
          </div>

          {/* Address card */}
          {address && (
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <h2 className="font-heading text-base font-semibold text-foreground">
                Lokalizacja
              </h2>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                {address.street && <p>{address.street}</p>}
                <p>
                  {[address.postalCode, address.city]
                    .filter(Boolean)
                    .join(' ')}
                </p>
                {address.district && <p>{address.district}</p>}
                {address.voivodeship && <p>{address.voivodeship}</p>}
              </div>
            </div>
          )}

          <ActivityHistoryCard
            entityType="listing"
            items={historyItems}
            isLoading={isHistoryLoading}
            error={historyError}
            onRefresh={refreshHistory}
            fieldLabels={LISTING_HISTORY_FIELD_LABELS}
          />
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──

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
