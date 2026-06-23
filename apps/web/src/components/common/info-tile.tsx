import type { ElementType, ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface InfoTileProps {
  icon: ElementType;
  label: string;
  value?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function InfoTile({
  icon: Icon,
  label,
  value,
  action,
  className,
}: InfoTileProps) {
  return (
    <div
      className={cn(
        'min-h-20 rounded-xl border border-border bg-muted/20 p-3',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-medium text-foreground">
        {value || 'Brak danych'}
      </div>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
