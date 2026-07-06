'use client';

import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type DashboardViewMode = 'cards' | 'list';

export function DashboardViewModeToggle({
  value,
  onChange,
}: {
  value: DashboardViewMode;
  onChange: (value: DashboardViewMode) => void;
}) {
  return (
    <div
      className="inline-flex items-center rounded-lg border border-border bg-card p-0.5"
      aria-label="Tryb widoku"
    >
      <Button
        type="button"
        variant={value === 'cards' ? 'default' : 'ghost'}
        size="sm"
        className="gap-1.5"
        onClick={() => onChange('cards')}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Karty
      </Button>
      <Button
        type="button"
        variant={value === 'list' ? 'default' : 'ghost'}
        size="sm"
        className="gap-1.5"
        onClick={() => onChange('list')}
      >
        <List className="h-3.5 w-3.5" />
        Lista
      </Button>
    </div>
  );
}
