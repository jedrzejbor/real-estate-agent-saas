'use client';

import Link from 'next/link';
import type { ElementType, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OnboardingEmptyStateProps {
  icon: ElementType;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  children?: ReactNode;
  compact?: boolean;
  surface?: boolean;
  className?: string;
}

export function OnboardingEmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
  children,
  compact = false,
  surface = true,
  className,
}: OnboardingEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white text-center',
        !surface && 'border-0 bg-transparent',
        compact ? 'px-4 py-8' : 'px-6 py-14',
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>

      {children ? (
        <div className="mt-4 w-full max-w-lg text-left">{children}</div>
      ) : null}

      {actionHref && actionLabel ? (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link href={actionHref}>
            <Button className="w-full gap-2 rounded-xl sm:w-auto">
              {actionLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link href={secondaryHref}>
              <Button variant="outline" className="w-full rounded-xl sm:w-auto">
                {secondaryLabel}
              </Button>
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
