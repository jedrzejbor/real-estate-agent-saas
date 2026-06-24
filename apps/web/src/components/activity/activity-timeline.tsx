'use client';

import Link from 'next/link';
import {
  CalendarCheck,
  ClipboardList,
  History,
  MessageSquareText,
  RefreshCw,
  StickyNote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ActionEmptyState } from '@/components/common';
import {
  type ActivityTimelineItem,
  type ActivityTimelineItemType,
} from '@/lib/activity';
import { formatDisplayDateNumeric, formatDisplayTime } from '@/lib/date-format';

const TIMELINE_TYPE_LABELS: Record<ActivityTimelineItemType, string> = {
  activity: 'Zmiana',
  note: 'Notatka',
  appointment: 'Spotkanie',
  task: 'Zadanie',
  public_lead: 'Zapytanie',
};

const TIMELINE_TYPE_ICONS = {
  activity: History,
  note: StickyNote,
  appointment: CalendarCheck,
  task: ClipboardList,
  public_lead: MessageSquareText,
} satisfies Record<ActivityTimelineItemType, typeof History>;

export function ActivityTimeline({
  items,
  isLoading,
  error,
  onRefresh,
}: {
  items: ActivityTimelineItem[];
  isLoading: boolean;
  error: string | null;
  onRefresh?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground">
            Aktywność
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Spotkania, notatki, follow-upy i zmiany klienta w jednej osi czasu.
          </p>
        </div>
        {onRefresh && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Odśwież aktywność"
            className="h-9 w-9 rounded-xl"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
          </Button>
        )}
      </div>

      <div className="mt-5">
        <ActivityTimelineContent
          items={items}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  );
}

function ActivityTimelineContent({
  items,
  isLoading,
  error,
}: {
  items: ActivityTimelineItem[];
  isLoading: boolean;
  error: string | null;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-xl bg-muted/40"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ActionEmptyState>
        Nie udało się pobrać aktywności. Spróbuj odświeżyć widok.
      </ActionEmptyState>
    );
  }

  if (items.length === 0) {
    return (
      <ActionEmptyState>
        Brak aktywności, dodaj notatkę albo zaplanuj spotkanie.
      </ActionEmptyState>
    );
  }

  return (
    <ol className="relative space-y-4 before:absolute before:bottom-3 before:left-4 before:top-3 before:w-px before:bg-border">
      {items.map((item) => (
        <li key={item.id} className="relative flex gap-3">
          <TimelineIcon type={item.type} />
          <TimelineItemBody item={item} />
        </li>
      ))}
    </ol>
  );
}

function TimelineIcon({ type }: { type: ActivityTimelineItemType }) {
  const Icon = TIMELINE_TYPE_ICONS[type];

  return (
    <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
      <Icon className="h-4 w-4" />
    </span>
  );
}

function TimelineItemBody({ item }: { item: ActivityTimelineItem }) {
  const content = (
    <div className="min-w-0 flex-1 rounded-xl border border-border/70 bg-muted/10 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-muted/20">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-lg">
              {TIMELINE_TYPE_LABELS[item.type]}
            </Badge>
            <p className="font-medium text-foreground">{item.title}</p>
          </div>
          {item.description && (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          )}
          {item.actor?.name && (
            <p className="text-xs text-muted-foreground">
              Autor: {item.actor.name}
            </p>
          )}
        </div>
        <time
          dateTime={item.createdAt}
          className="shrink-0 text-left text-xs font-medium text-muted-foreground sm:text-right"
        >
          {formatDisplayDateNumeric(item.createdAt)}
          <br />
          {formatDisplayTime(item.createdAt)}
        </time>
      </div>
    </div>
  );

  if (!item.href) {
    return content;
  }

  return (
    <Link href={item.href} className="min-w-0 flex-1">
      {content}
    </Link>
  );
}
