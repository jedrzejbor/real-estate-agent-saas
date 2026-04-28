'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ClientForm } from '@/components/clients/client-form';
import { fetchClient, type Client } from '@/lib/clients';

export default function EditClientPage() {
  const params = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    setIsLoading(true);
    fetchClient(params.id)
      .then(setClient)
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : 'Nie znaleziono klienta',
        ),
      )
      .finally(() => setIsLoading(false));
  }, [params.id]);

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

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href={`/dashboard/clients/${client.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć do profilu klienta
      </Link>

      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Edytuj klienta
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Zaktualizuj dane klienta i jego preferencje
        </p>
      </div>

      {/* Form */}
      <ClientForm client={client} />
    </div>
  );
}
