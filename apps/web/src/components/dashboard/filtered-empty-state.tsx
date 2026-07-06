'use client';

import type { ElementType, ReactNode } from 'react';
import {
  ActiveFilterChips,
  type ActiveFilterChip,
} from '@/components/dashboard/active-filter-chips';
import { OnboardingEmptyState } from '@/components/dashboard/onboarding-empty-state';

export function DashboardFilteredEmptyState({
  icon,
  title,
  description,
  filteredTitle = 'Brak wyników',
  filteredDescription = 'Nie znaleziono rekordów dla aktywnych filtrów. Usuń wybrane filtry albo wyczyść je wszystkie.',
  filters,
  onClearFilters,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
  analyticsId,
  children,
}: {
  icon: ElementType;
  title: string;
  description: string;
  filteredTitle?: string;
  filteredDescription?: string;
  filters: ActiveFilterChip[];
  onClearFilters: () => void;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  analyticsId?: string;
  children?: ReactNode;
}) {
  const hasFilters = filters.length > 0;

  return (
    <OnboardingEmptyState
      icon={icon}
      title={hasFilters ? filteredTitle : title}
      description={hasFilters ? filteredDescription : description}
      actionHref={hasFilters ? undefined : actionHref}
      actionLabel={hasFilters ? undefined : actionLabel}
      secondaryHref={hasFilters ? undefined : secondaryHref}
      secondaryLabel={hasFilters ? undefined : secondaryLabel}
      compact={hasFilters}
      analyticsId={analyticsId}
    >
      {hasFilters ? (
        <ActiveFilterChips filters={filters} onClearAll={onClearFilters} />
      ) : (
        children
      )}
    </OnboardingEmptyState>
  );
}
