'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DESCRIPTION_ASSISTANT_MONTHLY_LIMIT,
  type DescriptionAssistantUsage,
  type ListingQualityReport,
} from '@/lib/listing-description-assistant';
import { cn } from '@/lib/utils';

interface ListingDescriptionAssistantProps {
  report: ListingQualityReport;
  usage: DescriptionAssistantUsage;
  onGenerate: () => void;
}

export function ListingDescriptionAssistant({
  report,
  usage,
  onGenerate,
}: ListingDescriptionAssistantProps) {
  const topHints = report.hints.slice(0, 4);
  const hasHints = topHints.length > 0;
  const isLimitReached = usage.remaining <= 0;

  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wand2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Generator opisu i jakość oferty
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Regułowy helper układa opis z wpisanych danych i podpowiada, co
              poprawić przed publikacją.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <Badge
            variant={
              report.score >= 85
                ? 'success'
                : report.score >= 65
                  ? 'warning'
                  : 'destructive'
            }
          >
            {report.label} · {report.score}/100
          </Badge>
          <span className="text-xs text-muted-foreground">
            {usage.remaining}/{DESCRIPTION_ASSISTANT_MONTHLY_LIMIT} użyć w tym
            miesiącu
          </span>
        </div>
      </div>

      {hasHints ? (
        <div className="mt-4 grid gap-2">
          {topHints.map((hint) => {
            const Icon =
              hint.severity === 'warning' ? AlertTriangle : Lightbulb;
            return (
              <div
                key={hint.id}
                className="flex gap-2 rounded-lg bg-white px-3 py-2 text-xs leading-5 ring-1 ring-border"
              >
                <Icon
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0',
                    hint.severity === 'warning'
                      ? 'text-amber-600'
                      : 'text-primary',
                  )}
                />
                <div>
                  <p className="font-medium text-foreground">{hint.title}</p>
                  <p className="text-muted-foreground">{hint.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 flex gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-900 ring-1 ring-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Oferta ma komplet najważniejszych informacji do publicznej
          prezentacji.
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={onGenerate}
        disabled={isLimitReached}
        className="mt-4 h-10 w-full gap-2 rounded-xl sm:w-auto"
      >
        <Sparkles className="h-4 w-4" />
        {isLimitReached ? 'Limit generatora wykorzystany' : 'Wygeneruj opis'}
      </Button>
    </div>
  );
}
