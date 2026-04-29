'use client';

import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingEmptyState } from '@/components/dashboard/onboarding-empty-state';
import { ClientCard } from '@/components/clients/client-card';
import { ClientCsvImport } from '@/components/clients/client-csv-import';
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
    refresh,
  } = useClients();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Klienci
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Zarządzaj swoimi klientami i ich preferencjami
          </p>
        </div>
        <Link href="/dashboard/clients/new">
          <Button size="lg" className="w-full gap-2 rounded-xl sm:w-auto">
            <Plus className="h-4 w-4" />
            Dodaj klienta
          </Button>
        </Link>
      </div>

      <ClientCsvImport onImported={refresh} />

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
          hasFilters={!!filters.search || !!filters.source || !!filters.status}
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
  if (hasFilters) {
    return (
      <OnboardingEmptyState
        icon={Users}
        title="Brak wyników"
        description="Nie znaleźliśmy klientów dla wybranych filtrów. Wyczyść kryteria albo zmień wyszukiwanie, żeby wrócić do pełnej listy."
        compact
        analyticsId="clients_filtered_empty"
      />
    );
  }

  return (
    <OnboardingEmptyState
      icon={Users}
      title="Zbuduj pierwszą bazę klientów"
      description="Dodaj klienta ręcznie albo zaimportuj CSV. Dzięki temu checklisty, pipeline i raport Klienci od razu pokażą pierwszą wartość."
      actionHref="/dashboard/clients/new"
      actionLabel="Dodaj klienta"
      analyticsId="clients_empty"
    >
      <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Import CSV znajdziesz nad filtrami na tej stronie. Przyda się, gdy masz
        już listę kontaktów z arkusza lub poprzedniego CRM.
      </div>
    </OnboardingEmptyState>
  );
}
