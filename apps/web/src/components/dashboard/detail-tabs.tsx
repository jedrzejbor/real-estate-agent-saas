'use client';

import type { ElementType, ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';

export interface DashboardDetailTab<TId extends string> {
  id: TId;
  label: string;
  description: string;
  icon: ElementType;
  badge?: string;
}

export function DashboardDetailTabs<TId extends string>({
  tabs,
  selectedTab,
  ariaLabel,
  fallbackBadge,
  onSelect,
  children,
}: {
  tabs: DashboardDetailTab<TId>[];
  selectedTab: DashboardDetailTab<TId>;
  ariaLabel: string;
  fallbackBadge?: string;
  onSelect: (id: TId) => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/20 p-2">
        <div
          className="grid gap-2 md:grid-cols-2 xl:grid-cols-4"
          role="tablist"
          aria-label={ariaLabel}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedTab.id === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelect(tab.id)}
                className={`min-h-20 rounded-xl border px-3 py-3 text-left transition-colors ${
                  isActive
                    ? 'border-primary bg-card text-foreground shadow-sm'
                    : 'border-transparent bg-transparent text-muted-foreground hover:bg-card/70 hover:text-foreground'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">{tab.label}</span>
                  </div>
                  {tab.badge ? (
                    <Badge variant="outline" className="rounded-full">
                      {tab.badge}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-xs leading-5">{tab.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-b border-border px-5 py-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Aktywny widok
            </p>
            <h2 className="mt-1 font-heading text-xl font-semibold text-foreground">
              {selectedTab.label}
            </h2>
          </div>
          <Badge variant="secondary" className="w-fit rounded-full">
            {selectedTab.badge ?? fallbackBadge ?? 'Szczegóły'}
          </Badge>
        </div>
      </div>

      <div className="min-h-[560px] bg-background p-5">{children}</div>
    </section>
  );
}
