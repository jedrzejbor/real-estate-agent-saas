'use client';

import type { ReactNode } from 'react';
import { CalendarRange, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { InlineSelect } from '@/components/ui/inline-select';
import {
  PROPERTY_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
  type PropertyType,
  type TransactionType,
} from '@/lib/listings';
import { type ReportsFilters } from '@/lib/reports';

interface ReportsFilterBarProps {
  filters: ReportsFilters;
  canSelectAgent: boolean;
  agents: { value: string; label: string }[];
  onChange: <K extends keyof ReportsFilters>(
    key: K,
    value: ReportsFilters[K] | undefined,
  ) => void;
}

const GROUP_BY_OPTIONS = [
  { value: 'day', label: 'Dziennie' },
  { value: 'week', label: 'Tygodniowo' },
  { value: 'month', label: 'Miesięcznie' },
] as const;

export function ReportsFilterBar({
  filters,
  canSelectAgent,
  agents,
  onChange,
}: ReportsFilterBarProps) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
        <Filter className="h-4 w-4 text-primary" />
        Filtry globalne raportów
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <DateField
          label="Data od"
          value={filters.dateFrom}
          onChange={(value) => onChange('dateFrom', value)}
        />
        <DateField
          label="Data do"
          value={filters.dateTo}
          onChange={(value) => onChange('dateTo', value)}
        />

        <SelectField label="Grupowanie">
          <InlineSelect
            value={filters.groupBy}
            onChange={(value) => onChange('groupBy', value as ReportsFilters['groupBy'])}
            placeholder="Grupowanie"
            options={GROUP_BY_OPTIONS.map((option) => ({ ...option }))}
          />
        </SelectField>

        {canSelectAgent && (
          <SelectField label="Agent">
            <InlineSelect
              value={filters.agentId ?? ''}
              onChange={(value) => onChange('agentId', value || undefined)}
              placeholder="Cały zespół"
              options={agents}
            />
          </SelectField>
        )}

        <SelectField label="Typ nieruchomości">
          <InlineSelect
            value={filters.propertyType ?? ''}
            onChange={(value) =>
              onChange('propertyType', (value || undefined) as PropertyType | undefined)
            }
            placeholder="Wszystkie typy"
            options={Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </SelectField>

        <SelectField label="Typ transakcji">
          <InlineSelect
            value={filters.transactionType ?? ''}
            onChange={(value) =>
              onChange(
                'transactionType',
                (value || undefined) as TransactionType | undefined,
              )
            }
            placeholder="Wszystkie transakcje"
            options={Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </SelectField>
      </div>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <CalendarRange className="h-3.5 w-3.5" />
        {label}
      </span>
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl"
      />
    </label>
  );
}

function SelectField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
