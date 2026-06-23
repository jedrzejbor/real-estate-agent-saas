'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ClientForm } from '@/components/clients/client-form';
import type { CreateClientFormData } from '@/lib/clients';

export default function NewClientPage() {
  const searchParams = useSearchParams();
  const initialValues: Partial<CreateClientFormData> = {
    firstName: searchParams.get('firstName') ?? undefined,
    lastName: searchParams.get('lastName') ?? undefined,
    email: searchParams.get('email') ?? undefined,
    phone: searchParams.get('phone') ?? undefined,
    notes: searchParams.get('notes') ?? undefined,
  };

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
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Nowy klient
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Wypełnij dane nowego klienta i jego preferencje
        </p>
      </div>

      {/* Form */}
      <ClientForm initialValues={initialValues} />
    </div>
  );
}
