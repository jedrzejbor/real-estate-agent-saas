'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Circle,
  ClipboardList,
  ExternalLink,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardPageHeader } from '@/components/dashboard/page-header';
import { useToast } from '@/contexts/toast-context';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  fetchTasks,
  getTaskContextHref,
  getTaskContextLabel,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  TaskStatus,
  updateTask,
  type Task,
} from '@/lib/tasks';
import { cn } from '@/lib/utils';

type TaskFilter = 'todo' | 'done' | 'all';

const TASK_FILTERS: Array<{ id: TaskFilter; label: string }> = [
  { id: 'todo', label: 'Do zrobienia' },
  { id: 'done', label: 'Wykonane' },
  { id: 'all', label: 'Wszystkie' },
];

export default function TasksPage() {
  const router = useRouter();
  const { success: showSuccessToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeFilter, setActiveFilter] = useState<TaskFilter>('todo');
  const [isLoading, setIsLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedAtMs, setLoadedAtMs] = useState(0);

  async function loadTasks(filter = activeFilter) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchTasks({
        status:
          filter === 'all'
            ? undefined
            : filter === 'todo'
              ? TaskStatus.TODO
              : TaskStatus.DONE,
        limit: 100,
        sortBy: 'dueAt',
        sortOrder: 'ASC',
      });
      setTasks(response.data);
      setLoadedAtMs(Date.now());
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTasks(activeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  async function toggleTaskStatus(task: Task) {
    const nextStatus =
      task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;

    setUpdatingTaskId(task.id);
    setError(null);
    try {
      const updated = await updateTask(task.id, { status: nextStatus });
      setTasks((current) => {
        const next = current.map((item) =>
          item.id === updated.id ? updated : item,
        );

        if (activeFilter === 'all') return next;
        return next.filter((item) =>
          activeFilter === 'todo'
            ? item.status === TaskStatus.TODO
            : item.status === TaskStatus.DONE,
        );
      });
      showSuccessToast({
        title:
          nextStatus === TaskStatus.DONE
            ? 'Zadanie oznaczone jako wykonane'
            : 'Zadanie przywrócone',
        description:
          nextStatus === TaskStatus.DONE
            ? 'Dobra kolejność pracy jest zachowana. Możesz przejść do kontekstu zadania albo zostać na liście.'
            : 'Zadanie wróciło na listę do zrobienia.',
        duration: 7000,
        action: {
          label: 'Otwórz kontekst',
          onClick: () => router.push(getTaskContextHref(updated)),
        },
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUpdatingTaskId(null);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Zadania"
        description="Jedno miejsce dla follow-upów i operacyjnych zadań CRM powiązanych ze spotkaniami, klientami i ofertami."
        icon={ClipboardList}
        actions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit gap-1.5 rounded-xl"
          onClick={() => void loadTasks()}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          Odśwież
        </Button>
        }
      />

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {TASK_FILTERS.map((filter) => {
            const isActive = activeFilter === filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {filter.label}
                {isActive ? (
                  <Badge variant="default">{tasks.length}</Badge>
                ) : null}
              </button>
            );
          })}
        </div>

        {error ? (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Nie udało się pobrać zadań.</p>
              <p className="mt-1 opacity-90">{error}</p>
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-5 grid gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-xl border border-border bg-muted/30"
              />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
            Brak zadań dla wybranego filtra.
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                loadedAtMs={loadedAtMs}
                isUpdating={updatingTaskId === task.id}
                onToggle={() => void toggleTaskStatus(task)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TaskRow({
  task,
  loadedAtMs,
  isUpdating,
  onToggle,
}: {
  task: Task;
  loadedAtMs: number;
  isUpdating: boolean;
  onToggle: () => void;
}) {
  const isDone = task.status === TaskStatus.DONE;
  const isOverdue =
    task.status === TaskStatus.TODO &&
    task.dueAt !== null &&
    task.dueAt !== undefined &&
    loadedAtMs > 0 &&
    new Date(task.dueAt).getTime() < loadedAtMs;
  const contextHref = getTaskContextHref(task);

  return (
    <article className="rounded-xl border border-border bg-background p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={
                isDone ? 'success' : isOverdue ? 'destructive' : 'warning'
              }
            >
              {isOverdue ? 'Po terminie' : TASK_STATUS_LABELS[task.status]}
            </Badge>
            <Badge variant="secondary">{TASK_TYPE_LABELS[task.type]}</Badge>
            <Badge variant="outline">
              {TASK_PRIORITY_LABELS[task.priority]}
            </Badge>
          </div>

          <div>
            <h2
              className={cn(
                'font-heading text-base font-semibold text-foreground',
                isDone && 'text-muted-foreground line-through',
              )}
            >
              {task.title}
            </h2>
            {task.description ? (
              <p className="mt-1 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {task.description}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" />
              {task.dueAt ? formatTaskDueAt(task.dueAt) : 'Bez terminu'}
            </span>
            <Link
              href={contextHref}
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              {getTaskContextLabel(task)}
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <Button
          type="button"
          variant={isDone ? 'outline' : 'default'}
          size="sm"
          className="w-full justify-between rounded-xl lg:w-48"
          onClick={onToggle}
          disabled={isUpdating}
        >
          {isUpdating
            ? 'Zapisywanie...'
            : isDone
              ? 'Przywróć'
              : 'Oznacz wykonane'}
          {isDone ? (
            <RotateCcw className="h-4 w-4" />
          ) : isUpdating ? (
            <Circle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </article>
  );
}

function formatTaskDueAt(value: string): string {
  return new Date(value).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
