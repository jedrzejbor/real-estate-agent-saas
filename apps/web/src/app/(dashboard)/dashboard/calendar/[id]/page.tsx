'use client';

import { useEffect, useState, use } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useConfirm } from '@/contexts/confirm-context';
import { useToast } from '@/contexts/toast-context';
import {
  type Appointment,
  fetchAppointment,
  deleteAppointment,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_STATUS_LABELS,
  TYPE_COLORS,
  STATUS_BADGE_VARIANT,
  formatAppointmentDate,
  formatTimeRange,
} from '@/lib/appointments';

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
    setIsLoading(true);
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
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-bold text-foreground">
              {appointment.title}
            </h1>
            <Badge variant={STATUS_BADGE_VARIANT[appointment.status]}>
              {APPOINTMENT_STATUS_LABELS[appointment.status]}
            </Badge>
          </div>
          <span
            className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[appointment.type]}`}
          >
            {APPOINTMENT_TYPE_LABELS[appointment.type]}
          </span>
        </div>
        <div className="flex items-center gap-2">
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
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Info Card */}
        <div className="space-y-4 rounded-2xl border border-border bg-white p-6">
          <h2 className="font-heading text-base font-semibold text-foreground">
            Szczegóły spotkania
          </h2>

          <div className="space-y-3">
            <DetailRow icon={Clock} label="Termin">
              <span className="text-sm text-foreground">
                {formatAppointmentDate(appointment.startTime)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatTimeRange(appointment.startTime, appointment.endTime)}
              </span>
            </DetailRow>

            {appointment.location && (
              <DetailRow icon={MapPin} label="Lokalizacja">
                <span className="text-sm text-foreground">
                  {appointment.location}
                </span>
              </DetailRow>
            )}

            {appointment.client && (
              <DetailRow icon={User} label="Klient">
                <Link
                  href={`/dashboard/clients/${appointment.client.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  {appointment.client.firstName} {appointment.client.lastName}
                </Link>
              </DetailRow>
            )}

            {appointment.listing && (
              <DetailRow icon={Home} label="Oferta">
                <Link
                  href={`/dashboard/listings/${appointment.listing.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  {appointment.listing.title}
                </Link>
              </DetailRow>
            )}
          </div>
        </div>

        {/* Notes Card */}
        <div className="space-y-4 rounded-2xl border border-border bg-white p-6">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
            <StickyNote className="h-4 w-4 text-muted-foreground" />
            Notatki
          </h2>
          {appointment.notes ? (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {appointment.notes}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground/60">
              Brak notatek
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {children}
      </div>
    </div>
  );
}
