'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Circle,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api-client';
import { fetchClients, type Client } from '@/lib/clients';
import {
  fetchListingDocuments,
  LISTING_DOCUMENT_CATEGORY_LABELS,
  LISTING_DOCUMENT_STATUS_LABELS,
  ListingCommissionType,
  ListingDocumentStatus,
  type ListingDocumentChecklist,
} from '@/lib/listings';
import {
  addTransactionTask,
  deleteTransactionTask,
  fetchTransaction,
  fetchTransactionEvents,
  fetchTransactionTasks,
  formatDeadlineDistance,
  formatTransactionCommission,
  formatTransactionMoney,
  getTransactionBlockingReasons,
  getTransactionDeadlines,
  TRANSACTION_PIPELINE_STATUSES,
  TRANSACTION_STATUS_LABELS,
  TransactionStatus,
  TransactionTaskPriority,
  TransactionTaskStatus,
  updateTransaction,
  updateTransactionSchema,
  updateTransactionTask,
  type Transaction,
  type TransactionEvent,
  type TransactionTask,
  type TransactionBlockingReason,
  type TransactionDeadline,
  type UpdateTransactionFormData,
} from '@/lib/transactions';
import { cn } from '@/lib/utils';

type FieldErrors = Partial<Record<keyof UpdateTransactionFormData, string>>;

export default function TransactionDetailPage() {
  const params = useParams<{ id: string }>();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [events, setEvents] = useState<TransactionEvent[]>([]);
  const [documentChecklist, setDocumentChecklist] =
    useState<ListingDocumentChecklist | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState<UpdateTransactionFormData | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);

  async function loadData() {
    setIsLoading(true);
    setError(null);

    try {
      const transactionResponse = await fetchTransaction(params.id);
      const [
        clientsResponse,
        eventsResponse,
        documentsResponse,
        tasksResponse,
      ] =
        await Promise.all([
          fetchClients({ limit: 100, sortBy: 'lastName', sortOrder: 'ASC' }),
          fetchTransactionEvents(params.id),
          fetchListingDocuments(transactionResponse.listingId),
          fetchTransactionTasks(params.id),
        ]);

      setTransaction({ ...transactionResponse, tasks: tasksResponse });
      setForm(createFormFromTransaction(transactionResponse));
      setClients(clientsResponse.data);
      setEvents(eventsResponse);
      setDocumentChecklist(documentsResponse.checklist);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!params.id) return;
    void loadData();
  }, [params.id]);

  const openTasks = useMemo(
    () =>
      transaction?.tasks?.filter(
        (task) => task.status === TransactionTaskStatus.TODO,
      ).length ?? 0,
    [transaction?.tasks],
  );
  const deadlines = useMemo(
    () => (transaction ? getTransactionDeadlines(transaction) : []),
    [transaction],
  );
  const blockingReasons = useMemo(
    () =>
      transaction
        ? getTransactionBlockingReasons(transaction, documentChecklist)
        : [],
    [documentChecklist, transaction],
  );

  function updateForm<K extends keyof UpdateTransactionFormData>(
    key: K,
    value: UpdateTransactionFormData[K],
  ) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || !transaction) return;

    setError(null);
    setErrors({});

    const parsed = updateTransactionSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof UpdateTransactionFormData;
        nextErrors[field] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateTransaction(
        transaction.id,
        normalizeTransactionUpdatePayload(parsed.data),
      );
      const [eventsResponse, tasksResponse] = await Promise.all([
        fetchTransactionEvents(updated.id),
        fetchTransactionTasks(updated.id),
      ]);
      setTransaction({ ...updated, tasks: tasksResponse });
      setForm(createFormFromTransaction(updated));
      setEvents(eventsResponse);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleTask(task: TransactionTask) {
    if (!transaction) return;
    const status =
      task.status === TransactionTaskStatus.DONE
        ? TransactionTaskStatus.TODO
        : TransactionTaskStatus.DONE;

    setError(null);
    try {
      const updatedTask = await updateTransactionTask(transaction.id, task.id, {
        status,
      });
      setTransaction((current) =>
        current
          ? {
              ...current,
              tasks: current.tasks?.map((item) =>
                item.id === updatedTask.id ? updatedTask : item,
              ),
            }
          : current,
      );
      setEvents(await fetchTransactionEvents(transaction.id));
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!transaction || !taskTitle.trim()) return;

    setIsAddingTask(true);
    setError(null);
    try {
      await addTransactionTask(transaction.id, {
        title: taskTitle.trim(),
        priority: TransactionTaskPriority.NORMAL,
      });
      setTaskTitle('');
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsAddingTask(false);
    }
  }

  async function removeTask(task: TransactionTask) {
    if (!transaction) return;

    setError(null);
    try {
      await deleteTransactionTask(transaction.id, task.id);
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error && !transaction) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (!transaction || !form) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <BackLink />
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              {transaction.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {TRANSACTION_STATUS_LABELS[transaction.status]} ·{' '}
              {transaction.buyerClient
                ? `${transaction.buyerClient.firstName} ${transaction.buyerClient.lastName}`
                : 'Klient'}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => void loadData()}
        >
          <RefreshCw className="h-4 w-4" />
          Odśwież
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryBox
          label="Wartość"
          value={formatTransactionMoney(
            transaction.dealValue,
            transaction.currency,
          )}
        />
        <SummaryBox
          label="Prowizja"
          value={formatTransactionCommission(transaction)}
        />
        <SummaryBox label="Otwarte zadania" value={String(openTasks)} />
        <SummaryBox
          label="Planowane zamknięcie"
          value={
            transaction.expectedCloseDate
              ? formatDate(transaction.expectedCloseDate)
              : '-'
          }
        />
      </div>

      <BlockingOverview reasons={blockingReasons} deadlines={deadlines} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <form
          onSubmit={handleSave}
          className="rounded-lg border border-border bg-card p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Dane transakcji
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Zmiany są prywatne i widoczne tylko w dashboardzie.
              </p>
            </div>
            <Button type="submit" className="gap-2" disabled={isSaving}>
              <Save className="h-4 w-4" />
              Zapisz
            </Button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Tytuł" error={errors.title}>
              <input
                value={form.title ?? ''}
                onChange={(event) => updateForm('title', event.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              />
            </Field>

            <Field label="Status" error={errors.status}>
              <select
                value={form.status ?? transaction.status}
                onChange={(event) =>
                  updateForm(
                    'status',
                    event.target.value as UpdateTransactionFormData['status'],
                  )
                }
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {TRANSACTION_PIPELINE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {TRANSACTION_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Kupujący/najemca" error={errors.buyerClientId}>
              <select
                value={form.buyerClientId ?? ''}
                onChange={(event) =>
                  updateForm('buyerClientId', event.target.value)
                }
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.firstName} {client.lastName}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Właściciel" error={errors.sellerClientId}>
              <select
                value={form.sellerClientId ?? ''}
                onChange={(event) =>
                  updateForm('sellerClientId', event.target.value)
                }
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Nie przypisano</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.firstName} {client.lastName}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Wartość" error={errors.dealValue}>
              <input
                type="number"
                min="0"
                value={form.dealValue ?? 0}
                onChange={(event) =>
                  updateForm('dealValue', Number(event.target.value))
                }
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              />
            </Field>

            <Field label="Waluta" error={errors.currency}>
              <input
                value={form.currency ?? 'PLN'}
                onChange={(event) =>
                  updateForm('currency', event.target.value.toUpperCase())
                }
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                maxLength={3}
              />
            </Field>

            <Field label="Typ prowizji" error={errors.commissionType}>
              <select
                value={form.commissionType ?? ''}
                onChange={(event) =>
                  updateForm(
                    'commissionType',
                    event.target
                      .value as UpdateTransactionFormData['commissionType'],
                  )
                }
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Brak</option>
                <option value={ListingCommissionType.PERCENTAGE}>% ceny</option>
                <option value={ListingCommissionType.FIXED}>Kwota stała</option>
              </select>
            </Field>

            <Field label="Prowizja" error={errors.commissionValue}>
              <input
                type="number"
                min="0"
                value={form.commissionValue ?? ''}
                disabled={!form.commissionType}
                onChange={(event) =>
                  updateForm(
                    'commissionValue',
                    event.target.value === '' ? '' : Number(event.target.value),
                  )
                }
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm disabled:opacity-60"
              />
            </Field>

            <DateField
              label="Planowane zamknięcie"
              value={form.expectedCloseDate}
              error={errors.expectedCloseDate}
              onChange={(value) => updateForm('expectedCloseDate', value)}
            />
            <DateField
              label="Koniec rezerwacji"
              value={form.reservationExpiresAt}
              error={errors.reservationExpiresAt}
              onChange={(value) => updateForm('reservationExpiresAt', value)}
            />
            <DateField
              label="Umowa przedwstępna"
              value={form.preliminaryAgreementDate}
              error={errors.preliminaryAgreementDate}
              onChange={(value) =>
                updateForm('preliminaryAgreementDate', value)
              }
            />
            <DateField
              label="Finansowanie"
              value={form.financingDeadline}
              error={errors.financingDeadline}
              onChange={(value) => updateForm('financingDeadline', value)}
            />
            <DateField
              label="Notariusz"
              value={form.notaryDate}
              error={errors.notaryDate}
              onChange={(value) => updateForm('notaryDate', value)}
            />
            <DateField
              label="Odbiór"
              value={form.handoverDate}
              error={errors.handoverDate}
              onChange={(value) => updateForm('handoverDate', value)}
            />

            <Field
              label="Powód utraty"
              error={errors.lostReason}
              className="md:col-span-2"
            >
              <input
                value={form.lostReason ?? ''}
                onChange={(event) =>
                  updateForm('lostReason', event.target.value)
                }
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                disabled={form.status !== TransactionStatus.CLOSED_LOST}
              />
            </Field>

            <Field label="Blokada" error={errors.blockerNote}>
              <textarea
                value={form.blockerNote ?? ''}
                onChange={(event) =>
                  updateForm('blockerNote', event.target.value)
                }
                className="min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </Field>

            <Field label="Notatka prywatna" error={errors.privateNote}>
              <textarea
                value={form.privateNote ?? ''}
                onChange={(event) =>
                  updateForm('privateNote', event.target.value)
                }
                className="min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </Field>
          </div>
        </form>

        <div className="space-y-5">
          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Powiązania
            </h2>
            <div className="mt-4 space-y-3 text-sm">
              <RelationRow
                label="Oferta"
                value={transaction.listing?.title ?? transaction.listingId}
                href={`/dashboard/listings/${transaction.listingId}`}
              />
              <RelationRow
                label="Kupujący/najemca"
                value={
                  transaction.buyerClient
                    ? `${transaction.buyerClient.firstName} ${transaction.buyerClient.lastName}`
                    : transaction.buyerClientId
                }
                href={`/dashboard/clients/${transaction.buyerClientId}`}
              />
              {transaction.sellerClientId ? (
                <RelationRow
                  label="Właściciel"
                  value={
                    transaction.sellerClient
                      ? `${transaction.sellerClient.firstName} ${transaction.sellerClient.lastName}`
                      : transaction.sellerClientId
                  }
                  href={`/dashboard/clients/${transaction.sellerClientId}`}
                />
              ) : null}
            </div>
          </section>

          <DocumentChecklistCard checklist={documentChecklist} />

          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Checklist
              </h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {openTasks} otwarte
              </span>
            </div>

            <form onSubmit={addTask} className="mt-4 flex gap-2">
              <input
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Nowe zadanie"
                className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
              />
              <Button
                type="submit"
                size="sm"
                className="gap-1.5"
                disabled={isAddingTask}
              >
                <Plus className="h-3.5 w-3.5" />
                Dodaj
              </Button>
            </form>

            <div className="mt-4 space-y-2">
              {transaction.tasks?.length ? (
                transaction.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-2 rounded-lg border border-border px-3 py-2"
                  >
                    <button
                      type="button"
                      className="mt-0.5 text-muted-foreground hover:text-foreground"
                      onClick={() => void toggleTask(task)}
                    >
                      {task.status === TransactionTaskStatus.DONE ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </button>
                    <span
                      className={cn(
                        'min-w-0 flex-1 text-sm',
                        task.status === TransactionTaskStatus.DONE &&
                          'text-muted-foreground line-through',
                      )}
                    >
                      {task.title}
                    </span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => void removeTask(task)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                  Brak zadań w tej transakcji.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Historia
            </h2>
            <div className="mt-4 space-y-3">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Brak zdarzeń transakcji.
                </p>
              ) : (
                events.slice(0, 8).map((event) => (
                  <div
                    key={event.id}
                    className="rounded-lg border border-border px-3 py-2"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {formatEventType(event.type)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(event.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function BlockingOverview({
  reasons,
  deadlines,
}: {
  reasons: TransactionBlockingReason[];
  deadlines: TransactionDeadline[];
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Co blokuje zamknięcie
          </h2>
        </div>
        {reasons.length === 0 ? (
          <p className="mt-4 rounded-lg border border-emerald-300/40 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Brak wykrytych blokad zamknięcia.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {reasons.map((reason) => (
              <div
                key={reason.key}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm',
                  reason.severity === 'critical'
                    ? 'border-destructive/30 bg-destructive/5 text-destructive'
                    : 'border-amber-300/40 bg-amber-50 text-amber-950',
                )}
              >
                <p className="font-medium">{reason.label}</p>
                <p className="mt-0.5 text-xs">{reason.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Terminy krytyczne
          </h2>
        </div>
        {deadlines.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Brak uzupełnionych terminów krytycznych.
          </p>
        ) : (
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {deadlines.map((deadline) => (
              <DeadlineRow key={deadline.field} deadline={deadline} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function DeadlineRow({ deadline }: { deadline: TransactionDeadline }) {
  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2 text-sm',
        deadline.state === 'overdue'
          ? 'border-destructive/30 bg-destructive/5 text-destructive'
          : deadline.state === 'upcoming'
            ? 'border-amber-300/40 bg-amber-50 text-amber-950'
            : 'border-border bg-muted/10 text-foreground',
      )}
    >
      <p className="font-medium">{deadline.label}</p>
      <p className="mt-0.5 text-xs">
        {formatDate(deadline.value)} · {formatDeadlineDistance(deadline)}
      </p>
    </div>
  );
}

function DocumentChecklistCard({
  checklist,
}: {
  checklist: ListingDocumentChecklist | null;
}) {
  if (!checklist) {
    return (
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Dokumenty
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Nie udało się pobrać checklisty dokumentów oferty.
        </p>
      </section>
    );
  }

  const blockingItems = checklist.items.filter(
    (item) =>
      item.required &&
      (item.status === ListingDocumentStatus.MISSING ||
        item.status === ListingDocumentStatus.NEEDS_CORRECTION),
  );

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Dokumenty oferty
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kompletność wymaganych dokumentów wpływa na zamknięcie.
          </p>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {checklist.summary.completionPct}%
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <MetricPill label="Wymagane" value={checklist.summary.required} />
        <MetricPill label="Braki" value={checklist.summary.missing} />
        <MetricPill
          label="Poprawki"
          value={checklist.summary.needsCorrection}
        />
      </div>

      {blockingItems.length > 0 ? (
        <div className="mt-4 space-y-2">
          {blockingItems.slice(0, 4).map((item) => (
            <div
              key={item.category}
              className={cn(
                'rounded-lg border px-3 py-2 text-xs',
                item.status === ListingDocumentStatus.MISSING
                  ? 'border-destructive/25 bg-destructive/10 text-destructive'
                  : 'border-status-warning/25 bg-status-warning-bg text-status-warning',
              )}
            >
              <p className="font-medium">
                {LISTING_DOCUMENT_CATEGORY_LABELS[item.category]}
              </p>
              <p className="mt-0.5">
                {LISTING_DOCUMENT_STATUS_LABELS[item.status]}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-status-success/25 bg-status-success-bg px-3 py-2 text-xs text-status-success">
          Brak blokujących braków w wymaganych dokumentach.
        </p>
      )}
    </section>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/50 px-2 py-2">
      <div className="font-semibold text-foreground">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard/transactions"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Wróć do pipeline
    </Link>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn('space-y-1.5', className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </label>
  );
}

function DateField({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value?: string | null;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label} error={error}>
      <input
        type="date"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
      />
    </Field>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-heading text-xl font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

function RelationRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <Link
        href={href}
        className="min-w-0 text-right font-medium hover:text-primary"
      >
        {value}
      </Link>
    </div>
  );
}

function createFormFromTransaction(
  transaction: Transaction,
): UpdateTransactionFormData {
  return {
    buyerClientId: transaction.buyerClientId,
    sellerClientId: transaction.sellerClientId ?? '',
    status: transaction.status,
    title: transaction.title,
    dealValue: Number(transaction.dealValue),
    currency: transaction.currency,
    commissionType: transaction.commissionType ?? '',
    commissionValue:
      transaction.commissionValue === null ||
      transaction.commissionValue === undefined
        ? ''
        : Number(transaction.commissionValue),
    expectedCloseDate: dateInputValue(transaction.expectedCloseDate),
    reservationExpiresAt: dateInputValue(transaction.reservationExpiresAt),
    preliminaryAgreementDate: dateInputValue(
      transaction.preliminaryAgreementDate,
    ),
    financingDeadline: dateInputValue(transaction.financingDeadline),
    notaryDate: dateInputValue(transaction.notaryDate),
    handoverDate: dateInputValue(transaction.handoverDate),
    commissionDueDate: dateInputValue(transaction.commissionDueDate),
    lostReason: transaction.lostReason ?? '',
    blockerNote: transaction.blockerNote ?? '',
    privateNote: transaction.privateNote ?? '',
  };
}

function normalizeTransactionUpdatePayload(
  data: UpdateTransactionFormData,
): Record<string, unknown> {
  return {
    ...data,
    sellerClientId: data.sellerClientId || null,
    commissionType: data.commissionType || null,
    commissionValue: data.commissionType ? data.commissionValue : null,
    lostReason:
      data.status === TransactionStatus.CLOSED_LOST ? data.lostReason : null,
  };
}

function dateInputValue(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatEventType(type: string): string {
  const labels: Record<string, string> = {
    created: 'Utworzono transakcję',
    status_changed: 'Zmieniono status',
    details_updated: 'Zaktualizowano dane',
    task_created: 'Dodano zadanie',
    task_completed: 'Ukończono zadanie',
    deadline_changed: 'Zmieniono termin',
    commission_changed: 'Zmieniono prowizję',
    closed: 'Zamknięto transakcję',
    deleted: 'Usunięto transakcję',
    restored: 'Przywrócono transakcję',
  };

  return labels[type] ?? type;
}
