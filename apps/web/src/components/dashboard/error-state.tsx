'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DashboardErrorState({
  title,
  description,
  actionLabel = 'Spróbuj ponownie',
  onRetry,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onRetry: () => void;
}) {
  return (
    <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h2 className="mt-3 text-sm font-semibold text-destructive">{title}</h2>
      <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
        {description}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4 gap-1.5"
        onClick={onRetry}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        {actionLabel}
      </Button>
    </section>
  );
}
