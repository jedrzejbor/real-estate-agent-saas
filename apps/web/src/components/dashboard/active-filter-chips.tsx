'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ActiveFilterChip {
  id: string;
  label: string;
  value: string;
  onRemove: () => void;
}

export function ActiveFilterChips({
  filters,
  onClearAll,
}: {
  filters: ActiveFilterChip[];
  onClearAll: () => void;
}) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <section
      className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2"
      aria-label="Aktywne filtry"
    >
      <span className="text-xs font-medium text-muted-foreground">
        Aktywne filtry:
      </span>
      {filters.map((filter) => (
        <button
          key={filter.id}
          type="button"
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground transition-colors hover:border-primary/40 hover:text-primary"
          onClick={filter.onRemove}
          aria-label={`Usuń filtr ${filter.label}: ${filter.value}`}
        >
          <span className="font-medium">{filter.label}:</span>
          <span className="truncate">{filter.value}</span>
          <X className="h-3 w-3 shrink-0" />
        </button>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-xs text-muted-foreground"
        onClick={onClearAll}
      >
        <X className="h-3.5 w-3.5" />
        Wyczyść wszystkie
      </Button>
    </section>
  );
}
