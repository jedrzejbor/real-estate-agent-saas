'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Mail, Phone, Plus, UserRound, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardPageHeader } from '@/components/dashboard/page-header';
import {
  DashboardViewModeToggle,
  type DashboardViewMode,
} from '@/components/dashboard/view-mode-toggle';
import { OnboardingEmptyState } from '@/components/dashboard/onboarding-empty-state';
import { ClientCard } from '@/components/clients/client-card';
import { ClientCsvImport } from '@/components/clients/client-csv-import';
import { ClientFiltersBar } from '@/components/clients/client-filters';
import { ClientPagination } from '@/components/clients/client-pagination';
import { ClientStatusBadge } from '@/components/clients/client-status-badge';
import { PlanLimitStatusBanner } from '@/components/growth/plan-limit-status-banner';
import { useAuth } from '@/contexts/auth-context';
import { useClients } from '@/hooks/use-clients';
import {
  ClientSource,
  ClientStatus,
  CLIENT_PREFERENCE_TRANSACTION_TYPE_LABELS,
  CLIENT_SOURCE_LABELS,
  PROPERTY_TYPE_LABELS,
  SOURCE_BADGE_VARIANT,
  clientFullName,
  clientInitials,
  formatBudgetRange,
  formatRelativeDate,
  type Client,
  type ClientFilters,
} from '@/lib/clients';

const CLIENT_DEFAULT_FILTERS: ClientFilters = {
  page: 1,
  limit: 12,
  sortBy: 'createdAt',
  sortOrder: 'DESC',
};

const CLIENT_QUICK_FILTERS: Array<{
  id: string;
  label: string;
  description: string;
  filters: Partial<ClientFilters>;
}> = [
  {
    id: 'new',
    label: 'Nowi',
    description: 'Do pierwszego kontaktu',
    filters: { status: ClientStatus.NEW },
  },
  {
    id: 'active',
    label: 'Aktywni',
    description: 'Bieżąca obsługa',
    filters: { status: ClientStatus.ACTIVE },
  },
  {
    id: 'negotiating',
    label: 'Negocjacje',
    description: 'Najbliżej decyzji',
    filters: { status: ClientStatus.NEGOTIATING },
  },
  {
    id: 'website',
    label: 'WWW',
    description: 'Leady ze strony',
    filters: { source: ClientSource.WEBSITE },
  },
];

export default function ClientsPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<DashboardViewMode>('cards');
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
      <DashboardPageHeader
        title="Klienci"
        description="Zarządzaj swoimi klientami i ich preferencjami"
        icon={Users}
        actions={
          <Link href="/dashboard/clients/new">
            <Button size="lg" className="w-full gap-2 rounded-xl sm:w-auto">
              <Plus className="h-4 w-4" />
              Dodaj klienta
            </Button>
          </Link>
        }
      />

      {user ? (
        <PlanLimitStatusBanner
          user={user}
          resources={['clients']}
          source="clients_page_limit_state"
        />
      ) : null}

      <ClientCsvImport onImported={refresh} />

      {/* Filters */}
      <ClientFiltersBar
        filters={filters}
        onFilterChange={updateFilter}
        onReset={() => setFilters(CLIENT_DEFAULT_FILTERS)}
      />

      <ClientOperationsToolbar
        filters={filters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onApplyQuickFilter={(quickFilters) =>
          setFilters({
            ...CLIENT_DEFAULT_FILTERS,
            ...quickFilters,
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
            !!filters.search ||
            !!filters.source ||
            !!filters.status ||
            !!filters.budgetMin ||
            !!filters.budgetMax
          }
        />
      ) : viewMode === 'list' ? (
        <>
          <ClientTable clients={clients} />
          {meta && <ClientPagination meta={meta} onPageChange={setPage} />}
        </>
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

function ClientOperationsToolbar({
  filters,
  viewMode,
  onViewModeChange,
  onApplyQuickFilter,
}: {
  filters: ClientFilters;
  viewMode: DashboardViewMode;
  onViewModeChange: (mode: DashboardViewMode) => void;
  onApplyQuickFilter: (filters: Partial<ClientFilters>) => void;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {CLIENT_QUICK_FILTERS.map((item) => {
          const isActive = Object.entries(item.filters).every(
            ([key, value]) => filters[key as keyof ClientFilters] === value,
          );

          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onApplyQuickFilter(item.filters)}
              className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                isActive
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="block text-xs font-semibold">{item.label}</span>
              <span className="block text-[0.68rem]">{item.description}</span>
            </button>
          );
        })}
      </div>
      <DashboardViewModeToggle value={viewMode} onChange={onViewModeChange} />
    </section>
  );
}

function ClientTable({ clients }: { clients: Client[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="border-b border-border bg-muted/30 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Klient</th>
              <th className="px-4 py-3 text-left font-semibold">Kontakt</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Źródło</th>
              <th className="px-4 py-3 text-left font-semibold">Preferencje</th>
              <th className="px-4 py-3 text-right font-semibold">Akcja</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {clients.map((client) => {
              const preference = client.preference;
              const preferenceSummary = [
                preference?.propertyType
                  ? PROPERTY_TYPE_LABELS[preference.propertyType]
                  : null,
                preference?.transactionType
                  ? CLIENT_PREFERENCE_TRANSACTION_TYPE_LABELS[
                      preference.transactionType
                    ]
                  : null,
                preference?.preferredCity,
              ]
                .filter(Boolean)
                .join(' · ');

              return (
                <tr key={client.id} className="hover:bg-muted/20">
                  <td className="max-w-[260px] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {clientInitials(client)}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/clients/${client.id}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {clientFullName(client)}
                        </Link>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <UserRound className="h-3 w-3" />
                          Dodany {formatRelativeDate(client.createdAt)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div className="space-y-1">
                      {client.email ? (
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" />
                          {client.email}
                        </span>
                      ) : null}
                      {client.phone ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          {client.phone}
                        </span>
                      ) : null}
                      {!client.email && !client.phone ? 'Brak kontaktu' : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ClientStatusBadge status={client.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={SOURCE_BADGE_VARIANT[client.source]}>
                      {CLIENT_SOURCE_LABELS[client.source]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">
                      {formatBudgetRange(client.budgetMin, client.budgetMax)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {preferenceSummary || 'Brak preferencji'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      render={<Link href={`/dashboard/clients/${client.id}`} />}
                    >
                      Otwórz
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  if (hasFilters) {
    return (
      <OnboardingEmptyState
        icon={Users}
        title="Brak wyników"
        description="Zmień filtry albo wyczyść wyszukiwanie."
        compact
        analyticsId="clients_filtered_empty"
      />
    );
  }

  return (
    <OnboardingEmptyState
      icon={Users}
      title="Dodaj pierwszego klienta"
      description="Dodaj kontakt ręcznie albo zaimportuj CSV."
      actionHref="/dashboard/clients/new"
      actionLabel="Dodaj klienta"
      analyticsId="clients_empty"
    >
      <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Import CSV jest dostępny nad filtrami.
      </div>
    </OnboardingEmptyState>
  );
}
