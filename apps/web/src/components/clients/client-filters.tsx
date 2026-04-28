'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { InlineSelect } from '@/components/ui/inline-select';
import {
  ClientSource,
  ClientStatus,
  CLIENT_SOURCE_LABELS,
  CLIENT_STATUS_LABELS,
  type ClientFilters,
} from '@/lib/clients';

interface ClientFiltersBarProps {
  filters: ClientFilters;
  onFilterChange: <K extends keyof ClientFilters>(
    key: K,
    value: ClientFilters[K],
  ) => void;
  onReset: () => void;
}

/** Filter bar for clients list page. */
export function ClientFiltersBar({
  filters,
  onFilterChange,
  onReset,
}: ClientFiltersBarProps) {
  const hasActiveFilters =
    filters.source ||
    filters.status ||
    filters.search ||
    filters.budgetMin ||
    filters.budgetMax;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Szukaj klientów..."
            value={filters.search ?? ''}
            onChange={(e) =>
              onFilterChange('search', e.target.value || undefined)
            }
            className="h-9 rounded-xl pl-9"
          />
        </div>

        {/* Source */}
        <InlineSelect
          size="sm"
          value={filters.source ?? ''}
          onChange={(v) =>
            onFilterChange(
              'source',
              (v || undefined) as ClientSource | undefined,
            )
          }
          placeholder="Źródło"
          options={Object.entries(CLIENT_SOURCE_LABELS).map(
            ([value, label]) => ({ value, label }),
          )}
        />

        {/* Status */}
        <InlineSelect
          size="sm"
          value={filters.status ?? ''}
          onChange={(v) =>
            onFilterChange(
              'status',
              (v || undefined) as ClientStatus | undefined,
            )
          }
          placeholder="Status"
          options={Object.entries(CLIENT_STATUS_LABELS).map(
            ([value, label]) => ({ value, label }),
          )}
        />

        {/* Reset */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Wyczyść
          </Button>
        )}
      </div>
    </div>
  );
}


