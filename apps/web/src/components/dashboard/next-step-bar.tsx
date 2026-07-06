'use client';

import Link from 'next/link';
import type { ElementType } from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DashboardNextStep {
  title: string;
  description: string;
  actionLabel: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: ElementType;
  dueLabel?: string;
}

export function DashboardNextStepBar({ step }: { step: DashboardNextStep }) {
  const Icon = step.icon ?? Clock;

  return (
    <section className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase text-primary">
                Następny krok
              </p>
              {step.dueLabel ? (
                <span className="rounded-full border border-primary/20 bg-card px-2 py-0.5 text-xs text-muted-foreground">
                  {step.dueLabel}
                </span>
              ) : null}
            </div>
            <h2 className="mt-1 text-sm font-semibold text-foreground">
              {step.title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {step.description}
            </p>
          </div>
        </div>

        {step.actionHref ? (
          <Button
            className="w-full gap-1.5 rounded-xl sm:w-auto"
            render={<Link href={step.actionHref} />}
          >
            {step.actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            type="button"
            className="w-full gap-1.5 rounded-xl sm:w-auto"
            onClick={step.onAction}
          >
            {step.actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </section>
  );
}
