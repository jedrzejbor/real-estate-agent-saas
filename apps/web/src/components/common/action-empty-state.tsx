import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface ActionEmptyStateProps {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function ActionEmptyState({
  children,
  action,
  className,
}: ActionEmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground',
        className,
      )}
    >
      <div>{children}</div>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
