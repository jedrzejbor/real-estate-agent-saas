'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DashboardDetailHeader({
  backHref,
  backLabel,
  title,
  leading,
  badges,
  description,
  actions,
  className,
}: {
  backHref: string;
  backLabel: string;
  title: ReactNode;
  leading?: ReactNode;
  badges?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('space-y-4', className)}>
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="flex min-w-0 items-start gap-4">
          {leading ? <div className="shrink-0">{leading}</div> : null}
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 basis-full font-heading text-2xl font-bold text-foreground sm:basis-auto">
                {title}
              </h1>
              {badges}
            </div>
            {description ? (
              <div className="text-sm leading-6 text-muted-foreground">
                {description}
              </div>
            ) : null}
          </div>
        </div>

        {actions ? (
          <div className="flex w-full flex-col gap-2 lg:w-auto lg:max-w-[760px] lg:items-end">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
