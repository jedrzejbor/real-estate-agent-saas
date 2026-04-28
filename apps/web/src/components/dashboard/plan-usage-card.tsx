'use client';

import { Badge } from '@/components/ui/badge';
import {
  getUsagePercentage,
  isUsageExceeded,
  isUsageWarning,
} from '@/lib/auth';
import { getRemainingLimit } from '@/lib/plan';

interface PlanUsageCardProps {
  label: string;
  usage: number;
  limit: number | null;
  helper: string;
  description?: string;
}

export function PlanUsageCard({
  label,
  usage,
  limit,
  helper,
  description,
}: PlanUsageCardProps) {
  const percentage = getUsagePercentage(usage, limit);
  const warning = isUsageWarning(usage, limit);
  const exceeded = isUsageExceeded(usage, limit);
  const remaining = getRemainingLimit(usage, limit);

  return (
    <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        </div>
        {exceeded ? (
          <Badge variant="destructive">Limit</Badge>
        ) : warning ? (
          <Badge variant="warning">80%+</Badge>
        ) : (
          <Badge variant="success">OK</Badge>
        )}
      </div>

      <p className="mt-3 text-lg font-semibold text-foreground">
        {usage}
        {limit !== null ? ` / ${limit}` : ''}
      </p>

      {percentage !== null ? (
        <>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-border/70">
            <div
              className={
                exceeded
                  ? 'h-full bg-destructive'
                  : warning
                    ? 'h-full bg-amber-500'
                    : 'h-full bg-primary'
              }
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Wykorzystanie: {percentage}%
            {remaining !== null ? ` · Pozostało: ${remaining}` : ''}
          </p>
        </>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Brak limitu</p>
      )}

      {description ? (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}
