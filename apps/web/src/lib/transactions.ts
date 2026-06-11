import { z } from 'zod';
import { apiFetch } from './api-client';
import {
  LISTING_COMMISSION_TYPE_LABELS,
  ListingCommissionType,
  type Listing,
} from './listings';
import type { Client } from './clients';

export const TransactionStatus = {
  LEAD_OFFER: 'lead_offer',
  NEGOTIATION: 'negotiation',
  RESERVED: 'reserved',
  PRELIMINARY_AGREEMENT: 'preliminary_agreement',
  FINANCING: 'financing',
  NOTARY_SCHEDULED: 'notary_scheduled',
  HANDOVER: 'handover',
  CLOSED_WON: 'closed_won',
  CLOSED_LOST: 'closed_lost',
} as const;

export type TransactionStatus =
  (typeof TransactionStatus)[keyof typeof TransactionStatus];

export const TransactionTaskStatus = {
  TODO: 'todo',
  DONE: 'done',
  CANCELLED: 'cancelled',
} as const;

export type TransactionTaskStatus =
  (typeof TransactionTaskStatus)[keyof typeof TransactionTaskStatus];

export const TransactionTaskPriority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
} as const;

export type TransactionTaskPriority =
  (typeof TransactionTaskPriority)[keyof typeof TransactionTaskPriority];

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  lead_offer: 'Oferta',
  negotiation: 'Negocjacje',
  reserved: 'Rezerwacja',
  preliminary_agreement: 'Umowa przedwstępna',
  financing: 'Finansowanie',
  notary_scheduled: 'Notariusz',
  handover: 'Odbiór',
  closed_won: 'Zamknięta wygrana',
  closed_lost: 'Zamknięta przegrana',
};

export const TRANSACTION_PIPELINE_STATUSES: TransactionStatus[] = [
  TransactionStatus.LEAD_OFFER,
  TransactionStatus.NEGOTIATION,
  TransactionStatus.RESERVED,
  TransactionStatus.PRELIMINARY_AGREEMENT,
  TransactionStatus.FINANCING,
  TransactionStatus.NOTARY_SCHEDULED,
  TransactionStatus.HANDOVER,
  TransactionStatus.CLOSED_WON,
  TransactionStatus.CLOSED_LOST,
];

export const TRANSACTION_TASK_STATUS_LABELS: Record<
  TransactionTaskStatus,
  string
> = {
  todo: 'Do zrobienia',
  done: 'Gotowe',
  cancelled: 'Anulowane',
};

export interface TransactionTask {
  id: string;
  transactionId: string;
  title: string;
  status: TransactionTaskStatus;
  priority: TransactionTaskPriority;
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  listingId: string;
  buyerClientId: string;
  sellerClientId?: string | null;
  status: TransactionStatus;
  title: string;
  dealValue: number | string;
  currency: string;
  commissionType?: ListingCommissionType | null;
  commissionValue?: number | string | null;
  commissionAmount?: number | null;
  expectedCloseDate?: string | null;
  reservationExpiresAt?: string | null;
  preliminaryAgreementDate?: string | null;
  financingDeadline?: string | null;
  notaryDate?: string | null;
  handoverDate?: string | null;
  commissionDueDate?: string | null;
  closedAt?: string | null;
  lostReason?: string | null;
  blockerNote?: string | null;
  privateNote?: string | null;
  createdAt: string;
  updatedAt: string;
  listing?: Listing;
  buyerClient?: Client;
  sellerClient?: Client | null;
  tasks?: TransactionTask[];
  openTasksCount?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedTransactions {
  data: Transaction[];
  meta: PaginationMeta;
}

export interface TransactionFilters {
  status?: TransactionStatus;
  listingId?: string;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  hasBlocker?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'expectedCloseDate' | 'dealValue';
  sortOrder?: 'ASC' | 'DESC';
}

export const createTransactionSchema = z
  .object({
    listingId: z.string().uuid('Wybierz ofertę'),
    buyerClientId: z.string().uuid('Wybierz klienta'),
    title: z.string().max(255).optional().or(z.literal('')),
    dealValue: z.coerce.number().min(0, 'Wartość nie może być ujemna'),
    commissionType: z
      .enum([ListingCommissionType.PERCENTAGE, ListingCommissionType.FIXED])
      .optional()
      .or(z.literal('')),
    commissionValue: z.literal('').or(z.coerce.number().min(0)).optional(),
    expectedCloseDate: z.string().optional().or(z.literal('')),
    blockerNote: z.string().max(5000).optional().or(z.literal('')),
    privateNote: z.string().max(5000).optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    const hasType = Boolean(data.commissionType);
    const hasValue =
      data.commissionValue !== '' && data.commissionValue !== undefined;

    if (hasType && !hasValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['commissionValue'],
        message: 'Podaj wartość prowizji',
      });
    }

    if (!hasType && hasValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['commissionType'],
        message: 'Wybierz typ prowizji',
      });
    }

    if (
      data.commissionType === ListingCommissionType.PERCENTAGE &&
      typeof data.commissionValue === 'number' &&
      data.commissionValue > 100
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['commissionValue'],
        message: 'Prowizja procentowa nie może być większa niż 100%',
      });
    }
  });

export type CreateTransactionFormData = z.infer<typeof createTransactionSchema>;

function buildQueryString(filters: TransactionFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== null) {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchTransactions(
  filters: TransactionFilters = {},
): Promise<PaginatedTransactions> {
  return apiFetch<PaginatedTransactions>(
    `/transactions${buildQueryString(filters)}`,
  );
}

export async function createTransaction(
  data: CreateTransactionFormData,
): Promise<Transaction> {
  return apiFetch<Transaction>('/transactions', {
    method: 'POST',
    body: cleanPayload(data),
  });
}

export async function updateTransactionStatus(
  id: string,
  status: TransactionStatus,
  lostReason?: string,
): Promise<Transaction> {
  return apiFetch<Transaction>(`/transactions/${id}/status`, {
    method: 'PATCH',
    body: cleanPayload({ status, lostReason }),
  });
}

export async function updateTransactionTask(
  transactionId: string,
  taskId: string,
  data: Partial<Pick<TransactionTask, 'title' | 'status' | 'priority'>>,
): Promise<TransactionTask> {
  return apiFetch<TransactionTask>(
    `/transactions/${transactionId}/tasks/${taskId}`,
    {
      method: 'PATCH',
      body: cleanPayload(data),
    },
  );
}

export function formatTransactionMoney(
  value: number | string | null | undefined,
  currency = 'PLN',
): string {
  if (value === null || value === undefined) return '-';
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numeric)) return '-';

  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numeric);
}

export function formatTransactionCommission(transaction: Transaction): string {
  if (!transaction.commissionType || transaction.commissionValue === null) {
    return 'Brak prowizji';
  }

  const amount = formatTransactionMoney(
    transaction.commissionAmount,
    transaction.currency,
  );
  const value =
    transaction.commissionType === ListingCommissionType.PERCENTAGE
      ? `${Number(transaction.commissionValue)}%`
      : formatTransactionMoney(
          transaction.commissionValue,
          transaction.currency,
        );

  return `${LISTING_COMMISSION_TYPE_LABELS[transaction.commissionType]}: ${value} (${amount})`;
}

function cleanPayload(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === '' || value === undefined || value === null) continue;
    result[key] = value;
  }
  return result;
}
