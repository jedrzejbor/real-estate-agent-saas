'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Circle, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api-client';
import { fetchClients, type Client } from '@/lib/clients';
import {
  fetchListings,
  ListingCommissionType,
  type Listing,
} from '@/lib/listings';
import {
  createTransaction,
  createTransactionSchema,
  fetchTransactions,
  formatTransactionCommission,
  formatTransactionMoney,
  TRANSACTION_PIPELINE_STATUSES,
  TRANSACTION_STATUS_LABELS,
  TransactionStatus,
  TransactionTaskStatus,
  updateTransactionStatus,
  updateTransactionTask,
  type CreateTransactionFormData,
  type Transaction,
} from '@/lib/transactions';
import { cn } from '@/lib/utils';

type FieldErrors = Partial<Record<keyof CreateTransactionFormData, string>>;

const initialForm: CreateTransactionFormData = {
  listingId: '',
  buyerClientId: '',
  title: '',
  dealValue: 0,
  commissionType: '',
  commissionValue: '',
  expectedCloseDate: '',
  blockerNote: '',
  privateNote: '',
};

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState<CreateTransactionFormData>(initialForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setIsLoading(true);
    setError(null);

    try {
      const [transactionsResponse, listingsResponse, clientsResponse] =
        await Promise.all([
          fetchTransactions({ limit: 100, sortBy: 'updatedAt' }),
          fetchListings({ limit: 100, sortBy: 'createdAt', sortOrder: 'DESC' }),
          fetchClients({ limit: 100, sortBy: 'lastName', sortOrder: 'ASC' }),
        ]);

      setTransactions(transactionsResponse.data);
      setListings(listingsResponse.data);
      setClients(clientsResponse.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const listingId = searchParams.get('listingId');
    if (listingId && listings.length > 0 && form.listingId !== listingId) {
      handleListingChange(listingId);
    }
  }, [form.listingId, listings, searchParams]);

  const transactionsByStatus = useMemo(() => {
    return TRANSACTION_PIPELINE_STATUSES.reduce(
      (acc, status) => {
        acc[status] = transactions.filter(
          (transaction) => transaction.status === status,
        );
        return acc;
      },
      {} as Record<TransactionStatus, Transaction[]>,
    );
  }, [transactions]);

  function updateForm<K extends keyof CreateTransactionFormData>(
    key: K,
    value: CreateTransactionFormData[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function handleListingChange(listingId: string) {
    const listing = listings.find((item) => item.id === listingId);

    setForm((current) => ({
      ...current,
      listingId,
      title: listing?.title ?? current.title,
      dealValue: listing ? Number(listing.price) : current.dealValue,
      commissionType: listing?.commissionType ?? current.commissionType,
      commissionValue:
        listing?.commissionValue === undefined ||
        listing.commissionValue === null
          ? current.commissionValue
          : Number(listing.commissionValue),
    }));
    setErrors((current) => ({ ...current, listingId: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setErrors({});

    const parsed = createTransactionSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof CreateTransactionFormData;
        nextErrors[field] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await createTransaction(parsed.data);
      setForm(initialForm);
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(
    transaction: Transaction,
    status: TransactionStatus,
  ) {
    if (transaction.status === status) return;

    let lostReason: string | undefined;
    if (status === TransactionStatus.CLOSED_LOST) {
      lostReason = window.prompt('Powód utraty transakcji')?.trim();
      if (!lostReason) return;
    }

    setError(null);
    try {
      const updated = await updateTransactionStatus(
        transaction.id,
        status,
        lostReason,
      );
      setTransactions((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function toggleTask(transaction: Transaction, taskId: string) {
    const task = transaction.tasks?.find((item) => item.id === taskId);
    if (!task) return;

    const status =
      task.status === TransactionTaskStatus.DONE
        ? TransactionTaskStatus.TODO
        : TransactionTaskStatus.DONE;

    setError(null);
    try {
      await updateTransactionTask(transaction.id, task.id, { status });
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Transakcje
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pipeline zamknięć, terminów, checklist i prowizji
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => void loadData()}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          Odśwież
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-lg border border-border bg-card p-4 shadow-sm lg:grid-cols-12"
      >
        <Field
          label="Oferta"
          error={errors.listingId}
          className="lg:col-span-3"
        >
          <select
            value={form.listingId}
            onChange={(event) => handleListingChange(event.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">Wybierz ofertę</option>
            {listings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listing.title}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Kupujący/najemca"
          error={errors.buyerClientId}
          className="lg:col-span-3"
        >
          <select
            value={form.buyerClientId}
            onChange={(event) =>
              updateForm('buyerClientId', event.target.value)
            }
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">Wybierz klienta</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.firstName} {client.lastName}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Wartość"
          error={errors.dealValue}
          className="lg:col-span-2"
        >
          <input
            type="number"
            min="0"
            value={form.dealValue}
            onChange={(event) =>
              updateForm('dealValue', Number(event.target.value))
            }
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          />
        </Field>

        <Field
          label="Typ prowizji"
          error={errors.commissionType}
          className="lg:col-span-2"
        >
          <select
            value={form.commissionType}
            onChange={(event) =>
              updateForm(
                'commissionType',
                event.target
                  .value as CreateTransactionFormData['commissionType'],
              )
            }
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">Brak</option>
            <option value={ListingCommissionType.PERCENTAGE}>% ceny</option>
            <option value={ListingCommissionType.FIXED}>Kwota stała</option>
          </select>
        </Field>

        <Field
          label="Prowizja"
          error={errors.commissionValue}
          className="lg:col-span-2"
        >
          <input
            type="number"
            min="0"
            value={form.commissionValue}
            onChange={(event) =>
              updateForm(
                'commissionValue',
                event.target.value === '' ? '' : Number(event.target.value),
              )
            }
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            disabled={!form.commissionType}
          />
        </Field>

        <Field label="Tytuł" error={errors.title} className="lg:col-span-4">
          <input
            value={form.title ?? ''}
            onChange={(event) => updateForm('title', event.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          />
        </Field>

        <Field
          label="Planowane zamknięcie"
          error={errors.expectedCloseDate}
          className="lg:col-span-3"
        >
          <input
            type="date"
            value={form.expectedCloseDate ?? ''}
            onChange={(event) =>
              updateForm('expectedCloseDate', event.target.value)
            }
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          />
        </Field>

        <Field
          label="Blokada"
          error={errors.blockerNote}
          className="lg:col-span-3"
        >
          <input
            value={form.blockerNote ?? ''}
            onChange={(event) => updateForm('blockerNote', event.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          />
        </Field>

        <div className="flex items-end lg:col-span-2">
          <Button
            type="submit"
            className="w-full gap-2"
            disabled={isSubmitting || isLoading}
          >
            <Plus className="h-4 w-4" />
            Utwórz
          </Button>
        </div>
      </form>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          Brak transakcji w pipeline.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-5">
          {TRANSACTION_PIPELINE_STATUSES.map((status) => (
            <section key={status} className="min-w-0 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  {TRANSACTION_STATUS_LABELS[status]}
                </h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {transactionsByStatus[status].length}
                </span>
              </div>

              <div className="space-y-3">
                {transactionsByStatus[status].map((transaction) => (
                  <TransactionCard
                    key={transaction.id}
                    transaction={transaction}
                    onStatusChange={handleStatusChange}
                    onToggleTask={toggleTask}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
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

function TransactionCard({
  transaction,
  onStatusChange,
  onToggleTask,
}: {
  transaction: Transaction;
  onStatusChange: (
    transaction: Transaction,
    status: TransactionStatus,
  ) => Promise<void>;
  onToggleTask: (transaction: Transaction, taskId: string) => Promise<void>;
}) {
  const clientName = transaction.buyerClient
    ? `${transaction.buyerClient.firstName} ${transaction.buyerClient.lastName}`
    : 'Klient';

  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="space-y-1">
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
          <Link
            href={`/dashboard/transactions/${transaction.id}`}
            className="hover:text-primary"
          >
            {transaction.title}
          </Link>
        </h3>
        <p className="text-xs text-muted-foreground">{clientName}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Metric
          label="Wartość"
          value={formatTransactionMoney(
            transaction.dealValue,
            transaction.currency,
          )}
        />
        <Metric
          label="Prowizja"
          value={formatTransactionCommission(transaction)}
        />
      </div>

      {transaction.expectedCloseDate ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Zamknięcie: {formatDate(transaction.expectedCloseDate)}
        </p>
      ) : null}

      {transaction.blockerNote ? (
        <p className="mt-3 rounded-md border border-amber-300/40 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
          {transaction.blockerNote}
        </p>
      ) : null}

      {transaction.tasks?.length ? (
        <div className="mt-3 space-y-1.5">
          {transaction.tasks.slice(0, 3).map((task) => (
            <button
              key={task.id}
              type="button"
              className="flex w-full items-start gap-2 rounded-md px-1 py-1 text-left text-xs text-muted-foreground hover:bg-muted"
              onClick={() => void onToggleTask(transaction, task.id)}
            >
              {task.status === TransactionTaskStatus.DONE ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Circle className="mt-0.5 h-3.5 w-3.5" />
              )}
              <span
                className={cn(
                  'min-w-0 flex-1',
                  task.status === TransactionTaskStatus.DONE && 'line-through',
                )}
              >
                {task.title}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <select
        value={transaction.status}
        onChange={(event) =>
          void onStatusChange(
            transaction,
            event.target.value as TransactionStatus,
          )
        }
        className="mt-3 h-9 w-full rounded-lg border border-input bg-background px-2 text-xs"
      >
        {TRANSACTION_PIPELINE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {TRANSACTION_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-muted/50 px-2 py-1.5">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="truncate font-medium text-foreground">{value}</div>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}
