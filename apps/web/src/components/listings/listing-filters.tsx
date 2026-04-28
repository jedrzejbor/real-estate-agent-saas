'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { InlineSelect } from '@/components/ui/inline-select';
import {
  PropertyType,
  ListingStatus,
  TransactionType,
  PROPERTY_TYPE_LABELS,
  LISTING_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
  type ListingFilters,
} from '@/lib/listings';

interface ListingFiltersBarProps {
  filters: ListingFilters;
  onFilterChange: <K extends keyof ListingFilters>(
    key: K,
    value: ListingFilters[K],
  ) => void;
  onReset: () => void;
}

/** Filter bar for listings list page. */
export function ListingFiltersBar({
  filters,
  onFilterChange,
  onReset,
}: ListingFiltersBarProps) {
  const hasActiveFilters =
    filters.propertyType ||
    filters.status ||
    filters.transactionType ||
    filters.city ||
    filters.priceMin ||
    filters.priceMax ||
    filters.search;

  return (
    <div className="space-y-3">
      {/* Row 1: Search + primary filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Szukaj ofert..."
            value={filters.search ?? ''}
            onChange={(e) => onFilterChange('search', e.target.value || undefined)}
            className="h-9 rounded-xl pl-9"
          />
        </div>

        {/* Property type */}
        <InlineSelect
          size="sm"
          value={filters.propertyType ?? ''}
          onChange={(v) =>
            onFilterChange(
              'propertyType',
              (v || undefined) as PropertyType | undefined,
            )
          }
          placeholder="Typ nieruchomości"
          options={Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />

        {/* Transaction type */}
        <InlineSelect
          size="sm"
          value={filters.transactionType ?? ''}
          onChange={(v) =>
            onFilterChange(
              'transactionType',
              (v || undefined) as TransactionType | undefined,
            )
          }
          placeholder="Typ transakcji"
          options={Object.entries(TRANSACTION_TYPE_LABELS).map(
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
              (v || undefined) as ListingStatus | undefined,
            )
          }
          placeholder="Status"
          options={Object.entries(LISTING_STATUS_LABELS).map(
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


