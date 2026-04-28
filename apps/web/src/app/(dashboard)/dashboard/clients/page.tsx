'use client';

import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClientCard } from '@/components/clients/client-card';
import { ClientFiltersBar } from '@/components/clients/client-filters';
import { ClientPagination } from '@/components/clients/client-pagination';
import { useClients } from '@/hooks/use-clients';

export default function ClientsPage() {
  const {
    clients,
    meta,
    isLoading,
    error,
    filters,
    updateFilter,
    setFilters,
    setPage,
  } = useClients();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Klienci
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Zarządzaj swoimi klientami i ich preferencjami
          </p>
        </div>
        <Link href="/dashboard/clients/new">
          <Button size="lg" className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" />
            Dodaj klienta
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <ClientFiltersBar
        filters={filters}
        onFilterChange={updateFilter}
        onReset={() =>
          setFilters({
            page: 1,
            limit: 12,
            sortBy: 'createdAt',
            sortOrder: 'DESC',
          })
        }
      />

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          hasFilters={
            !!filters.search || !!filters.source || !!filters.status
          }
        />
      ) : (
        <>
          {/* Grid */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {clients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>

          {/* Pagination */}
          {meta && <ClientPagination meta={meta} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white py-16">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Users className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-heading text-lg font-semibold text-foreground">
        {hasFilters ? 'Brak wyników' : 'Brak klientów'}
      </h3>
      <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
        {hasFilters
          ? 'Zmień kryteria wyszukiwania lub wyczyść filtry.'
          : 'Dodaj swojego pierwszego klienta, aby rozpocząć zarządzanie CRM.'}
      </p>
      {!hasFilters && (
        <Link href="/dashboard/clients/new" className="mt-6">
          <Button className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" />
            Dodaj pierwszego klienta
          </Button>
        </Link>
      )}
    </div>
  );
}
