'use client';

import {
  useEffect,
  useState,
  use,
  type ElementType,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  MapPin,
  Clock,
  User,
  Home,
  StickyNote,
  CalendarDays,
  Mail,
  Phone,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ActionEmptyState,
  AddressLink,
  ContactAction,
  DetailCard,
  InfoTile,
  RelationCard,
} from '@/components/common';
import { useConfirm } from '@/contexts/confirm-context';
import { useToast } from '@/contexts/toast-context';
import {
  type Appointment,
  type AppointmentListingAddress,
  fetchAppointment,
  deleteAppointment,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_STATUS_LABELS,
  TYPE_COLORS,
  STATUS_BADGE_VARIANT,
} from '@/lib/appointments';
import { CLIENT_STATUS_LABELS } from '@/lib/clients';
import { buildPhoneHref } from '@/lib/contact-links';
import {
  formatDisplayDateNumeric,
  formatDisplayTimeRange,
} from '@/lib/date-format';
import {
  LISTING_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
  formatArea,
  formatPrice,
} from '@/lib/listings';

interface AppointmentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AppointmentDetailPage({
  params,
}: AppointmentDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { confirm } = useConfirm();
  const { error: showErrorToast } = useToast();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAppointment(id)
      .then((data) => {
        if (!cancelled) setAppointment(data);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Błąd ładowania');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Usunąć spotkanie?',
      description: 'Tej operacji nie można cofnąć.',
      confirmLabel: 'Usuń spotkanie',
      cancelLabel: 'Anuluj',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteAppointment(id);
      router.push('/dashboard/calendar');
      router.refresh();
    } catch (err) {
      showErrorToast({
        title: 'Nie udało się usunąć spotkania',
        description:
          err instanceof Error ? err.message : 'Spróbuj ponownie za chwilę.',
      });
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/calendar"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć do kalendarza
        </Link>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive">
            {error || 'Spotkanie nie znalezione'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/dashboard/calendar"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć do kalendarza
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-foreground">
              {appointment.title}
            </h1>
            <Badge variant={STATUS_BADGE_VARIANT[appointment.status]}>
              {APPOINTMENT_STATUS_LABELS[appointment.status]}
            </Badge>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[appointment.type]}`}
            >
              {APPOINTMENT_TYPE_LABELS[appointment.type]}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href={`/dashboard/calendar/${id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
              <Pencil className="h-3.5 w-3.5" />
              Edytuj
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl text-destructive hover:bg-destructive/5"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isDeleting ? 'Usuwanie...' : 'Usuń'}
          </Button>
        </div>
      </div>

      {/* Details */}
      <div className="grid auto-rows-fr items-stretch gap-6 lg:grid-cols-2">
        {/* Info Card */}
        <DetailCard title="Szczegóły spotkania">
          <div className="space-y-3">
            <DetailRow icon={CalendarDays} label="Data">
              <span className="text-sm font-medium text-foreground">
                {formatDisplayDateNumeric(appointment.startTime)}
              </span>
            </DetailRow>

            <DetailRow icon={Clock} label="Godzina">
              <span className="text-sm font-medium text-foreground">
                {formatDisplayTimeRange(
                  appointment.startTime,
                  appointment.endTime,
                )}
              </span>
            </DetailRow>

            {appointment.location && (
              <DetailRow icon={MapPin} label="Lokalizacja">
                <AddressLink address={appointment.location} />
              </DetailRow>
            )}
          </div>
        </DetailCard>

        {/* Notes Card */}
        <DetailCard title="Notatki" icon={StickyNote}>
          {appointment.notes ? (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {appointment.notes}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground/60">
              Brak notatek
            </p>
          )}
        </DetailCard>

        <DetailCard title="Klient" icon={User}>
          {appointment.client ? (
            <ClientSummary client={appointment.client} />
          ) : appointment.clientId ? (
            <RelationCard
              href={`/dashboard/clients/${appointment.clientId}`}
              title="Przypisany klient"
              description="Szczegóły klienta nie zostały zwrócone przez API."
            />
          ) : (
            <ActionEmptyState>
              Spotkanie nie ma przypisanego klienta.
            </ActionEmptyState>
          )}
        </DetailCard>

        <DetailCard title="Oferta" icon={Home}>
          {appointment.listing ? (
            <ListingSummary listing={appointment.listing} />
          ) : appointment.listingId ? (
            <RelationCard
              href={`/dashboard/listings/${appointment.listingId}`}
              title="Przypisana oferta"
              description="Szczegóły oferty nie zostały zwrócone przez API."
            />
          ) : (
            <ActionEmptyState>
              Spotkanie nie ma przypisanej oferty.
            </ActionEmptyState>
          )}
        </DetailCard>
      </div>
    </div>
  );
}

function ClientSummary({ client }: { client: Appointment['client'] }) {
  if (!client) return null;

  const fullName = `${client.firstName} ${client.lastName}`.trim();
  const statusLabel = client.status
    ? CLIENT_STATUS_LABELS[client.status]
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/dashboard/clients/${client.id}`}
            className="font-heading text-lg font-semibold text-primary hover:underline"
          >
            {fullName || 'Klient bez nazwy'}
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">Profil klienta</p>
        </div>
        {statusLabel ? <Badge variant="secondary">{statusLabel}</Badge> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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
    </div>
  );
}

function ListingSummary({ listing }: { listing: Appointment['listing'] }) {
  if (!listing) return null;

  const address = formatListingAddress(listing.address);
  const metaItems = [
    listing.propertyType ? PROPERTY_TYPE_LABELS[listing.propertyType] : null,
    listing.transactionType
      ? TRANSACTION_TYPE_LABELS[listing.transactionType]
      : null,
    listing.areaM2 ? formatArea(listing.areaM2) : null,
    listing.rooms ? `${listing.rooms} pok.` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/dashboard/listings/${listing.id}`}
            className="font-heading text-lg font-semibold text-primary hover:underline"
          >
            {listing.title}
          </Link>
          {address ? (
            <p className="mt-1 text-sm text-muted-foreground">{address}</p>
          ) : null}
        </div>
        {listing.status ? (
          <Badge variant="secondary">
            {LISTING_STATUS_LABELS[listing.status]}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <InfoTile
          icon={Tag}
          label="Cena"
          value={
            listing.price !== undefined && listing.price !== null
              ? formatPrice(listing.price, listing.currency ?? 'PLN')
              : null
          }
        />
        <InfoTile icon={Home} label="Parametry" value={metaItems.join(' / ')} />
        <InfoTile
          icon={MapPin}
          label="Adres"
          value={address ? <AddressLink address={address} /> : null}
        />
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: ElementType;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function formatListingAddress(
  address?: AppointmentListingAddress | null,
): string | null {
  if (!address) return null;

  const parts = [address.street, address.postalCode, address.city]
    .filter(Boolean)
    .join(', ');

  return address.district ? `${parts} (${address.district})` : parts || null;
}
