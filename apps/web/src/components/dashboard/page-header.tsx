'use client';

import type { ComponentProps, ElementType, ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type HeaderBadge = {
  label: string;
  variant?: ComponentProps<typeof Badge>['variant'];
};

export function DashboardPageHeader({
  title,
  description,
  icon: Icon,
  badge,
  actions,
  className,
}: {
  title: string;
  description?: ReactNode;
  icon?: ElementType;
  badge?: HeaderBadge;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {Icon ? <Icon className="h-5 w-5 shrink-0 text-primary" /> : null}
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {title}
          </h1>
          {badge ? (
            <Badge variant={badge.variant ?? 'outline'} className="rounded-full">
              {badge.label}
            </Badge>
          ) : null}
        </div>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
