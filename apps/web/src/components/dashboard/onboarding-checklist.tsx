'use client';

import Link from 'next/link';
import type { ElementType } from 'react';
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Home,
  RadioTower,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  getDashboardOnboardingChecklist,
  type DashboardOnboardingStep,
} from '@/lib/onboarding';
import type { DashboardStats } from '@/lib/dashboard';
import { cn } from '@/lib/utils';

const STEP_ICON_MAP: Record<DashboardOnboardingStep['id'], ElementType> = {
  listing: Home,
  client: Users,
  appointment: CalendarCheck,
  publish: RadioTower,
  share: Share2,
};

interface OnboardingChecklistProps {
  stats: DashboardStats;
}

export function OnboardingChecklist({ stats }: OnboardingChecklistProps) {
  const checklist = getDashboardOnboardingChecklist(stats);
  const nextReadyStep = checklist.steps.find((step) => step.state === 'ready');

  return (
    <Card className="rounded-2xl border border-border shadow-sm">
      <CardHeader className="border-b border-border/70 pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="brand">Checklist startowa</Badge>
              <Badge variant="outline">
                {checklist.completedCount}/{checklist.totalCount} kroków
              </Badge>
            </div>
            <CardTitle className="mt-3 text-xl">
              Doprowadź workspace do pierwszej wartości
            </CardTitle>
            <CardDescription className="mt-1 max-w-2xl">
              Zacznij od trzech podstawowych kroków CRM. Publikację oferty i udostępnianie linku dołożymy w kolejnych sprintach.
            </CardDescription>
          </div>

          {nextReadyStep?.href ? (
            <Link href={nextReadyStep.href}>
              <Button className="gap-2 rounded-xl">
                {nextReadyStep.ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Rdzeń checklisty masz już za sobą
            </div>
          )}
        </div>

        <div className="mt-5">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${checklist.completionPercentage}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Postęp checklisty: {checklist.completionPercentage}%
          </p>
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        <div className="grid gap-4 xl:grid-cols-2">
          {checklist.steps.map((step) => (
            <ChecklistStepCard key={step.id} step={step} />
          ))}
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 text-sm text-muted-foreground">
          <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            F2.1 projektuje checklistę i osadza ją w dashboardzie. Trwały onboarding state, progres i nudges dołożymy w kolejnym zadaniu F2.2.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ChecklistStepCard({ step }: { step: DashboardOnboardingStep }) {
  const Icon = STEP_ICON_MAP[step.id];

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-colors',
        step.state === 'completed' && 'border-emerald-200 bg-emerald-50/50',
        step.state === 'ready' && 'border-border bg-white',
        step.state === 'upcoming' && 'border-border/80 bg-muted/25',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
              step.state === 'completed' && 'bg-emerald-100 text-emerald-600',
              step.state === 'ready' && 'bg-primary/10 text-primary',
              step.state === 'upcoming' && 'bg-muted text-muted-foreground',
            )}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">{step.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {step.description}
            </p>
          </div>
        </div>

        <ChecklistStepBadge state={step.state} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{step.helperText}</p>

        {step.href && step.state !== 'upcoming' ? (
          <Link href={step.href}>
            <Button
              variant={step.state === 'completed' ? 'outline' : 'default'}
              size="sm"
              className="rounded-xl"
            >
              {step.ctaLabel}
            </Button>
          </Link>
        ) : (
          <Button variant="outline" size="sm" className="rounded-xl" disabled>
            {step.ctaLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

function ChecklistStepBadge({
  state,
}: {
  state: DashboardOnboardingStep['state'];
}) {
  if (state === 'completed') {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Gotowe
      </Badge>
    );
  }

  if (state === 'ready') {
    return <Badge variant="warning">Do zrobienia</Badge>;
  }

  return <Badge variant="outline">Wkrótce</Badge>;
}
