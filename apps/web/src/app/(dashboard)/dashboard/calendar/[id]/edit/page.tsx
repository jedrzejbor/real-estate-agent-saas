'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AppointmentForm } from '@/components/calendar/appointment-form';
import { type Appointment, fetchAppointment } from '@/lib/appointments';

interface EditAppointmentPageProps {
  params: Promise<{ id: string }>;
}

export default function EditAppointmentPage({
  params,
}: EditAppointmentPageProps) {
  const { id } = use(params);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <Link
        href={`/dashboard/calendar/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć do szczegółów
      </Link>

      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Edytuj spotkanie
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Zaktualizuj dane spotkania
        </p>
      </div>

      <AppointmentForm appointment={appointment} />
    </div>
  );
}
