import { z } from 'zod';
import { apiFetch } from './api-client';
import {
  ListingDocumentStatus,
  LISTING_COMMISSION_TYPE_LABELS,
  ListingCommissionType,
  type ListingDocumentChecklist,
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

export interface TransactionEvent {
  id: string;
  transactionId: string;
  type: string;
  metadata: Record<string, unknown>;
  actorUserId?: string | null;
  createdAt: string;
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

export type TransactionDeadlineField =
  | 'expectedCloseDate'
  | 'reservationExpiresAt'
  | 'preliminaryAgreementDate'
  | 'financingDeadline'
  | 'notaryDate'
  | 'handoverDate'
  | 'commissionDueDate';

export interface TransactionDeadline {
  field: TransactionDeadlineField;
  label: string;
  value: string;
  daysUntil: number;
  state: 'overdue' | 'upcoming' | 'future';
}

export interface TransactionBlockingReason {
  key: string;
  label: string;
  description: string;
  severity: 'warning' | 'critical';
}

export interface TransactionDeadlineSummary {
  overdue: TransactionDeadlineSummaryItem[];
  upcoming: TransactionDeadlineSummaryItem[];
  blocked: Transaction[];
}

export interface TransactionDeadlineSummaryItem {
  transaction: Transaction;
  deadline: TransactionDeadline;
}

const transactionCommissionFieldsSchema = {
  commissionType: z
    .enum([ListingCommissionType.PERCENTAGE, ListingCommissionType.FIXED])
    .optional()
    .or(z.literal('')),
  commissionValue: z.literal('').or(z.coerce.number().min(0)).optional(),
};

const createTransactionBaseSchema = z.object({
  listingId: z.string().uuid('Wybierz ofertę'),
  buyerClientId: z.string().uuid('Wybierz klienta'),
  title: z.string().max(255).optional().or(z.literal('')),
  dealValue: z.coerce.number().min(0, 'Wartość nie może być ujemna'),
  ...transactionCommissionFieldsSchema,
  expectedCloseDate: z.string().optional().or(z.literal('')),
  blockerNote: z.string().max(5000).optional().or(z.literal('')),
  privateNote: z.string().max(5000).optional().or(z.literal('')),
});

type TransactionCommissionFormInput = {
  commissionType?: ListingCommissionType | '';
  commissionValue?: number | '';
};

function validateTransactionCommissionFields(
  data: TransactionCommissionFormInput,
  ctx: z.RefinementCtx,
): void {
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
}

export const createTransactionSchema = createTransactionBaseSchema.superRefine(
  validateTransactionCommissionFields,
);

export type CreateTransactionFormData = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = z
  .object({
    buyerClientId: z.string().uuid('Wybierz klienta').optional(),
    sellerClientId: z
      .string()
      .uuid('Wybierz właściciela')
      .optional()
      .or(z.literal('')),
    status: z
      .enum([
        TransactionStatus.LEAD_OFFER,
        TransactionStatus.NEGOTIATION,
        TransactionStatus.RESERVED,
        TransactionStatus.PRELIMINARY_AGREEMENT,
        TransactionStatus.FINANCING,
        TransactionStatus.NOTARY_SCHEDULED,
        TransactionStatus.HANDOVER,
        TransactionStatus.CLOSED_WON,
        TransactionStatus.CLOSED_LOST,
      ])
      .optional(),
    title: z.string().max(255).optional().or(z.literal('')),
    dealValue: z.coerce.number().min(0, 'Wartość nie może być ujemna'),
    currency: z.string().length(3, 'Waluta musi mieć 3 znaki').optional(),
    ...transactionCommissionFieldsSchema,
    expectedCloseDate: z.string().optional().or(z.literal('')),
    reservationExpiresAt: z.string().optional().or(z.literal('')),
    preliminaryAgreementDate: z.string().optional().or(z.literal('')),
    financingDeadline: z.string().optional().or(z.literal('')),
    notaryDate: z.string().optional().or(z.literal('')),
    handoverDate: z.string().optional().or(z.literal('')),
    commissionDueDate: z.string().optional().or(z.literal('')),
    lostReason: z.string().max(500).optional().or(z.literal('')),
    blockerNote: z.string().max(5000).optional().or(z.literal('')),
    privateNote: z.string().max(5000).optional().or(z.literal('')),
  })
  .superRefine(validateTransactionCommissionFields);

export type UpdateTransactionFormData = z.infer<typeof updateTransactionSchema>;

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

export async function fetchTransaction(id: string): Promise<Transaction> {
  return apiFetch<Transaction>(`/transactions/${id}`);
}

export async function createTransaction(
  data: CreateTransactionFormData,
): Promise<Transaction> {
  return apiFetch<Transaction>('/transactions', {
    method: 'POST',
    body: cleanPayload(data),
  });
}

export async function updateTransaction(
  id: string,
  data: Record<string, unknown>,
): Promise<Transaction> {
  return apiFetch<Transaction>(`/transactions/${id}`, {
    method: 'PATCH',
    body: cleanPayload(data, { keepNull: true }),
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

export async function fetchTransactionEvents(
  id: string,
): Promise<TransactionEvent[]> {
  return apiFetch<TransactionEvent[]>(`/transactions/${id}/events`);
}

export async function addTransactionTask(
  transactionId: string,
  data: {
    title: string;
    priority?: TransactionTaskPriority;
    dueDate?: string;
  },
): Promise<TransactionTask> {
  return apiFetch<TransactionTask>(`/transactions/${transactionId}/tasks`, {
    method: 'POST',
    body: cleanPayload(data),
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

export async function deleteTransactionTask(
  transactionId: string,
  taskId: string,
): Promise<void> {
  return apiFetch<void>(`/transactions/${transactionId}/tasks/${taskId}`, {
    method: 'DELETE',
  });
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

const ACTIVE_TRANSACTION_STATUSES = new Set<TransactionStatus>([
  TransactionStatus.LEAD_OFFER,
  TransactionStatus.NEGOTIATION,
  TransactionStatus.RESERVED,
  TransactionStatus.PRELIMINARY_AGREEMENT,
  TransactionStatus.FINANCING,
  TransactionStatus.NOTARY_SCHEDULED,
  TransactionStatus.HANDOVER,
]);

const DEADLINE_FIELDS: Array<{
  field: TransactionDeadlineField;
  label: string;
}> = [
  { field: 'reservationExpiresAt', label: 'Koniec rezerwacji' },
  { field: 'preliminaryAgreementDate', label: 'Umowa przedwstępna' },
  { field: 'financingDeadline', label: 'Finansowanie' },
  { field: 'notaryDate', label: 'Notariusz' },
  { field: 'handoverDate', label: 'Odbiór' },
  { field: 'commissionDueDate', label: 'Płatność prowizji' },
  { field: 'expectedCloseDate', label: 'Planowane zamknięcie' },
];

export function isActiveTransaction(transaction: Transaction): boolean {
  return ACTIVE_TRANSACTION_STATUSES.has(transaction.status);
}

export function getTransactionDeadlines(
  transaction: Transaction,
  now = new Date(),
): TransactionDeadline[] {
  const today = startOfDay(now);

  return DEADLINE_FIELDS.flatMap(({ field, label }) => {
    const value = transaction[field];
    if (!value) return [];

    const date = startOfDay(new Date(value));
    const daysUntil = Math.round(
      (date.getTime() - today.getTime()) / 86_400_000,
    );
    const state: TransactionDeadline['state'] =
      daysUntil < 0 ? 'overdue' : daysUntil <= 7 ? 'upcoming' : 'future';

    return [
      {
        field,
        label,
        value,
        daysUntil,
        state,
      },
    ];
  }).sort((a, b) => a.daysUntil - b.daysUntil);
}

export function getNextTransactionDeadline(
  transaction: Transaction,
  now = new Date(),
): TransactionDeadline | null {
  return (
    getTransactionDeadlines(transaction, now).find(
      (deadline) => deadline.daysUntil >= 0,
    ) ??
    getTransactionDeadlines(transaction, now)[0] ??
    null
  );
}

export function buildTransactionDeadlineSummary(
  transactions: Transaction[],
  now = new Date(),
): TransactionDeadlineSummary {
  const activeTransactions = transactions.filter(isActiveTransaction);
  const overdue: TransactionDeadlineSummaryItem[] = [];
  const upcoming: TransactionDeadlineSummaryItem[] = [];

  for (const transaction of activeTransactions) {
    for (const deadline of getTransactionDeadlines(transaction, now)) {
      if (deadline.state === 'overdue') {
        overdue.push({ transaction, deadline });
      } else if (deadline.state === 'upcoming') {
        upcoming.push({ transaction, deadline });
      }
    }
  }

  return {
    overdue: overdue.sort(
      (a, b) => a.deadline.daysUntil - b.deadline.daysUntil,
    ),
    upcoming: upcoming.sort(
      (a, b) => a.deadline.daysUntil - b.deadline.daysUntil,
    ),
    blocked: activeTransactions.filter((transaction) =>
      Boolean(transaction.blockerNote?.trim()),
    ),
  };
}

export function getTransactionBlockingReasons(
  transaction: Transaction,
  documentChecklist: ListingDocumentChecklist | null,
  now = new Date(),
): TransactionBlockingReason[] {
  const reasons: TransactionBlockingReason[] = [];
  const overdueDeadlines = getTransactionDeadlines(transaction, now).filter(
    (deadline) => deadline.state === 'overdue',
  );
  const openTasks =
    transaction.tasks?.filter(
      (task) => task.status === TransactionTaskStatus.TODO,
    ).length ??
    transaction.openTasksCount ??
    0;

  if (transaction.blockerNote?.trim()) {
    reasons.push({
      key: 'manual_blocker',
      label: 'Blokada ręczna',
      description: transaction.blockerNote,
      severity: 'critical',
    });
  }

  if (overdueDeadlines.length > 0) {
    reasons.push({
      key: 'overdue_deadlines',
      label: 'Terminy po czasie',
      description: `${overdueDeadlines.length} krytycznych terminów jest po czasie.`,
      severity: 'critical',
    });
  }

  if (openTasks > 0) {
    reasons.push({
      key: 'open_tasks',
      label: 'Otwarte zadania',
      description: `${openTasks} zadań checklisty nadal wymaga działania.`,
      severity: 'warning',
    });
  }

  if (documentChecklist) {
    const missing = documentChecklist.summary.missing;
    const needsCorrection = documentChecklist.summary.needsCorrection;

    if (missing > 0 || needsCorrection > 0) {
      reasons.push({
        key: 'documents',
        label: 'Dokumenty oferty',
        description: `${missing} braków, ${needsCorrection} dokumentów wymaga poprawy.`,
        severity: missing > 0 ? 'critical' : 'warning',
      });
    }
  }

  if (!transaction.commissionType || transaction.commissionValue === null) {
    reasons.push({
      key: 'commission',
      label: 'Prowizja',
      description: 'Transakcja nie ma uzupełnionej prowizji.',
      severity: 'warning',
    });
  }

  return reasons;
}

export function formatDeadlineDistance(deadline: TransactionDeadline): string {
  if (deadline.daysUntil < 0) {
    return `${Math.abs(deadline.daysUntil)} dni po terminie`;
  }

  if (deadline.daysUntil === 0) return 'dzisiaj';
  if (deadline.daysUntil === 1) return 'jutro';
  return `za ${deadline.daysUntil} dni`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function cleanPayload(
  data: Record<string, unknown>,
  options: { keepNull?: boolean } = {},
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === '' || value === undefined) continue;
    if (value === null && !options.keepNull) continue;
    result[key] = value;
  }
  return result;
}
