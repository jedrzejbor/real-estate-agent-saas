import { apiFetch } from './api-client';

export const TaskStatus = {
  TODO: 'todo',
  DONE: 'done',
  CANCELLED: 'cancelled',
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskPriority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
} as const;

export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export const TaskType = {
  FOLLOW_UP: 'follow_up',
  CALL: 'call',
  EMAIL: 'email',
  DOCUMENT: 'document',
  OTHER: 'other',
} as const;

export type TaskType = (typeof TaskType)[keyof typeof TaskType];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Do zrobienia',
  done: 'Wykonane',
  cancelled: 'Anulowane',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Niski',
  normal: 'Normalny',
  high: 'Wysoki',
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  follow_up: 'Follow-up',
  call: 'Telefon',
  email: 'Email',
  document: 'Dokument',
  other: 'Inne',
};

export interface TaskRelationClient {
  id: string;
  firstName: string;
  lastName: string;
}

export interface TaskRelationListing {
  id: string;
  title: string;
}

export interface TaskRelationAppointment {
  id: string;
  title: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  appointmentId?: string | null;
  clientId?: string | null;
  listingId?: string | null;
  dueAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  appointment?: TaskRelationAppointment | null;
  client?: TaskRelationClient | null;
  listing?: TaskRelationListing | null;
}

export interface TaskFilters {
  status?: TaskStatus;
  type?: TaskType;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'dueAt' | 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedTasks {
  data: Task[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UpdateTaskInput {
  status?: TaskStatus;
  priority?: TaskPriority;
  dueAt?: string | null;
}

export async function fetchTasks(
  filters: TaskFilters = {},
): Promise<PaginatedTasks> {
  return apiFetch<PaginatedTasks>(`/tasks${buildQueryString(filters)}`);
}

export async function updateTask(
  id: string,
  data: UpdateTaskInput,
): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}`, {
    method: 'PATCH',
    body: cleanPayload({ ...data }),
  });
}

export function getTaskContextHref(task: Task): string {
  if (task.appointmentId) return `/dashboard/calendar/${task.appointmentId}`;
  if (task.clientId) return `/dashboard/clients/${task.clientId}`;
  if (task.listingId) return `/dashboard/listings/${task.listingId}`;
  return '/dashboard';
}

export function getTaskContextLabel(task: Task): string {
  if (task.appointment?.title) return task.appointment.title;
  if (task.client) {
    return `${task.client.firstName} ${task.client.lastName}`.trim();
  }
  if (task.listing?.title) return task.listing.title;
  return 'Bez powiązania';
}

function buildQueryString(filters: TaskFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== null) {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function cleanPayload(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    result[key] = value;
  }
  return result;
}
