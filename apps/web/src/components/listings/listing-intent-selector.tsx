'use client';

import * as React from 'react';
import { Check, HandCoins, KeyRound } from 'lucide-react';
import {
  LISTING_INTENT_SECTIONS,
  buildIntentOptionId,
  type ListingIntentOption,
  type ListingIntentSelection,
} from '@/lib/listing-intent-options';
import { cn } from '@/lib/utils';

export interface ListingIntentSelectorProps {
  value?: ListingIntentSelection | null;
  onChange: (selection: ListingIntentSelection) => void;
  className?: string;
  disabled?: boolean;
}

const SECTION_ICONS = {
  sale: HandCoins,
  rent: KeyRound,
} as const;

export function ListingIntentSelector({
  value,
  onChange,
  className,
  disabled = false,
}: ListingIntentSelectorProps) {
  const selectedId = value
    ? buildIntentOptionId(value.transactionType, value.propertyType)
    : null;

  return (
    <div className={cn('grid gap-4 lg:grid-cols-2', className)}>
      {LISTING_INTENT_SECTIONS.map((section) => {
        const Icon = SECTION_ICONS[section.id];

        return (
          <section
            key={section.id}
            aria-labelledby={`listing-intent-${section.id}`}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center justify-center gap-3 py-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2
                id={`listing-intent-${section.id}`}
                className="font-heading text-xl font-semibold text-foreground"
              >
                {section.title}
              </h2>
            </div>

            <div className="mt-4 grid gap-2">
              {section.options.map((option) => (
                <IntentOptionButton
                  key={option.id}
                  option={option}
                  selected={option.id === selectedId}
                  disabled={disabled}
                  onSelect={onChange}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function IntentOptionButton({
  option,
  selected,
  disabled,
  onSelect,
}: {
  option: ListingIntentOption;
  selected: boolean;
  disabled: boolean;
  onSelect: (selection: ListingIntentSelection) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={() =>
        onSelect({
          transactionType: option.transactionType,
          propertyType: option.propertyType,
        })
      }
      className={cn(
        'group flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-transparent bg-muted/60 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors outline-none',
        'hover:border-primary/30 hover:bg-primary/5',
        'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        'disabled:pointer-events-none disabled:opacity-50',
        selected && 'border-primary/40 bg-primary/10 text-primary',
      )}
    >
      <span className="min-w-0">{option.label}</span>
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-transparent transition-colors',
          selected && 'border-primary bg-primary text-primary-foreground',
        )}
        aria-hidden="true"
      >
        <Check className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}
