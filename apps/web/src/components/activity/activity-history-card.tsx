import { History, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ACTIVITY_ACTION_LABELS,
  formatActivityActor,
  formatActivityValue,
  type ActivityEntityType,
  type ActivityHistoryItem,
} from '@/lib/activity';

interface ActivityHistoryCardProps {
  entityType: ActivityEntityType;
  items: ActivityHistoryItem[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  fieldLabels: Record<string, string>;
}

export function ActivityHistoryCard({
  entityType,
  items,
  isLoading,
  error,
  onRefresh,
  fieldLabels,
}: ActivityHistoryCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-base font-semibold text-foreground">
            Historia zmian
          </h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="gap-1.5 rounded-xl"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Odśwież
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Brak zapisanej historii zmian.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border/80 bg-muted/20 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {item.description ?? ACTIVITY_ACTION_LABELS[item.action]}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatActivityActor(item)} •{' '}
                    {new Date(item.createdAt).toLocaleString('pl-PL')}
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                  {ACTIVITY_ACTION_LABELS[item.action]}
                </span>
              </div>

              {item.changes.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {item.changes.map((change, index) => (
                    <li key={`${item.id}-${change.field}-${index}`} className="text-sm">
                      <span className="font-medium text-foreground">
                        {fieldLabels[change.field] ?? change.field}
                      </span>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
                        <span className="rounded-md bg-white px-2 py-1 text-xs">
                          {formatActivityValue(
                            change.field,
                            change.oldValue,
                            entityType,
                          )}
                        </span>
                        <span>→</span>
                        <span className="rounded-md bg-white px-2 py-1 text-xs text-foreground">
                          {formatActivityValue(
                            change.field,
                            change.newValue,
                            entityType,
                          )}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
