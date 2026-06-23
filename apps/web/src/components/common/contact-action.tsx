'use client';

import type { ElementType } from 'react';

import { CopyButton } from '@/components/common/copy-button';
import { cn } from '@/lib/utils';

interface ContactActionProps {
  icon: ElementType;
  label: string;
  value?: string | null;
  href?: string;
  className?: string;
}

export function ContactAction({
  icon: Icon,
  label,
  value,
  href,
  className,
}: ContactActionProps) {
  const displayValue = value?.trim();

  return (
    <div
      className={cn(
        'flex min-h-16 items-start gap-3 rounded-xl border border-border bg-muted/20 p-3',
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {displayValue && href ? (
          <a
            href={href}
            className="mt-0.5 inline-flex min-w-0 max-w-full items-center gap-1 break-all text-sm font-medium text-primary hover:underline"
          >
            <span className="min-w-0 break-all">{displayValue}</span>
          </a>
        ) : (
          <p className="mt-0.5 break-words text-sm font-medium text-foreground">
            {displayValue || 'Brak danych'}
          </p>
        )}
      </div>
      {displayValue ? <CopyButton value={displayValue} label={label} /> : null}
    </div>
  );
}
