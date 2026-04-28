'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AppointmentForm } from '@/components/calendar/appointment-form';

export default function NewAppointmentPage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/dashboard/calendar"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć do kalendarza
      </Link>

      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Nowe spotkanie
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Zaplanuj nowe spotkanie z klientem
        </p>
      </div>

      {/* Form */}
      <AppointmentForm />
    </div>
  );
}
