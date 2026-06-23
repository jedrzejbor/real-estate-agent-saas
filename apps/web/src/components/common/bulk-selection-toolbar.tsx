'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BulkSelectionToolbarProps {
  allSelected: boolean;
  selectedCount: number;
  totalCount: number;
  disabled?: boolean;
  isDeleting?: boolean;
  selectAllLabel?: string;
  clearLabel?: string;
  deleteLabel?: string;
  deletingLabel?: string;
  onToggleAll: () => void;
  onClear: () => void;
  onDeleteSelected: () => void;
}

export function BulkSelectionToolbar({
  allSelected,
  selectedCount,
  totalCount,
  disabled = false,
  isDeleting = false,
  selectAllLabel = 'Zaznacz wszystkie',
  clearLabel = 'Wyczyść',
  deleteLabel = 'Usuń zaznaczone',
  deletingLabel = 'Usuwanie...',
  onToggleAll,
  onClear,
  onDeleteSelected,
}: BulkSelectionToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleAll}
            disabled={disabled || totalCount === 0}
            className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
          />
          {selectAllLabel}
        </label>
        <span className="text-sm text-muted-foreground">
          Zaznaczono {selectedCount} z {totalCount}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {selectedCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onClear}
            disabled={disabled}
            className="rounded-xl"
          >
            {clearLabel}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="destructive"
          onClick={onDeleteSelected}
          disabled={disabled || selectedCount === 0}
          className="gap-2 rounded-xl"
        >
          <Trash2 className="h-4 w-4" />
          {isDeleting
            ? deletingLabel
            : selectedCount > 0
              ? `${deleteLabel} (${selectedCount})`
              : deleteLabel}
        </Button>
      </div>
    </div>
  );
}
