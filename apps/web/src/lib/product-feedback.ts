import { apiFetch } from './api-client';

export const ProductFeedbackType = {
  BUG_REPORT: 'bug_report',
  FEATURE_REQUEST: 'feature_request',
  IMPROVEMENT: 'improvement',
  GENERAL_FEEDBACK: 'general_feedback',
  SURVEY_RESPONSE: 'survey_response',
} as const;

export type ProductFeedbackType =
  (typeof ProductFeedbackType)[keyof typeof ProductFeedbackType];

export const ProductFeedbackStatus = {
  NEW: 'new',
  TRIAGED: 'triaged',
  NEEDS_MORE_INFO: 'needs_more_info',
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  RELEASED: 'released',
  DECLINED: 'declined',
  DUPLICATE: 'duplicate',
  ARCHIVED: 'archived',
} as const;

export type ProductFeedbackStatus =
  (typeof ProductFeedbackStatus)[keyof typeof ProductFeedbackStatus];

export const ProductFeedbackCategory = {
  LISTINGS: 'listings',
  CLIENTS: 'clients',
  CALENDAR: 'calendar',
  REPORTS: 'reports',
  PUBLIC_CATALOG: 'public_catalog',
  PUBLIC_LISTING_SUBMISSION: 'public_listing_submission',
  BILLING: 'billing',
  ONBOARDING: 'onboarding',
  INTEGRATIONS: 'integrations',
  UI_UX: 'ui_ux',
  OTHER: 'other',
} as const;

export type ProductFeedbackCategory =
  (typeof ProductFeedbackCategory)[keyof typeof ProductFeedbackCategory];

export const ProductFeedbackPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type ProductFeedbackPriority =
  (typeof ProductFeedbackPriority)[keyof typeof ProductFeedbackPriority];

export const ProductFeedbackSource = {
  DASHBOARD: 'dashboard',
  PUBLIC_CATALOG: 'public_catalog',
  PUBLIC_LISTING: 'public_listing',
  PUBLIC_FORM: 'public_form',
  HOMEPAGE: 'homepage',
  ERROR_PAGE: 'error_page',
} as const;

export type ProductFeedbackSource =
  (typeof ProductFeedbackSource)[keyof typeof ProductFeedbackSource];

export const FeatureSurveyAudience = {
  ALL_USERS: 'all_users',
  REGISTERED_USERS: 'registered_users',
  PUBLIC_VISITORS: 'public_visitors',
  PLAN_SEGMENT: 'plan_segment',
  BETA_USERS: 'beta_users',
} as const;

export type FeatureSurveyAudience =
  (typeof FeatureSurveyAudience)[keyof typeof FeatureSurveyAudience];

export const FeatureSurveyQuestionType = {
  SINGLE_CHOICE: 'single_choice',
  MULTIPLE_CHOICE: 'multiple_choice',
  RATING: 'rating',
  NPS: 'nps',
  TEXT: 'text',
} as const;

export type FeatureSurveyQuestionType =
  (typeof FeatureSurveyQuestionType)[keyof typeof FeatureSurveyQuestionType];

export interface FeatureSurveyQuestionOption {
  value: string;
  label: string;
}

export interface FeatureSurveyQuestion {
  id: string;
  type: FeatureSurveyQuestionType;
  label: string;
  required?: boolean;
  options?: FeatureSurveyQuestionOption[];
  min?: number;
  max?: number;
}

export interface FeatureSurvey {
  id: string;
  title: string;
  description?: string | null;
  audience: FeatureSurveyAudience;
  startsAt?: string | null;
  endsAt?: string | null;
  questions: FeatureSurveyQuestion[];
}

export interface SubmitFeatureSurveyResponseInput {
  answers: Record<string, unknown>;
  sourceUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface SubmitPublicFeatureSurveyResponseInput extends SubmitFeatureSurveyResponseInput {
  email?: string;
  website?: string;
  formStartedAt?: number;
}

export interface FeatureSurveyResponseSubmission {
  id: string;
  surveyId: string;
  feedbackId?: string | null;
  createdAt: string;
}

export interface CreateProductFeedbackInput {
  type: ProductFeedbackType;
  category?: ProductFeedbackCategory;
  userPriority?: ProductFeedbackPriority;
  title: string;
  description: string;
  source?: ProductFeedbackSource;
  sourceUrl?: string;
  module?: string;
  browser?: string;
  os?: string;
  viewport?: string;
  appVersion?: string;
  screenshotUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePublicProductFeedbackInput extends CreateProductFeedbackInput {
  email?: string;
  website?: string;
  formStartedAt?: number;
}

export interface ProductFeedbackSubmission {
  id: string;
  type: ProductFeedbackType;
  status: string;
  createdAt: string;
}

export interface ProductFeedbackAdminItem {
  id: string;
  type: ProductFeedbackType;
  status: ProductFeedbackStatus;
  category: ProductFeedbackCategory;
  source: ProductFeedbackSource;
  title: string;
  description: string;
  userPriority?: ProductFeedbackPriority | null;
  internalPriority?: ProductFeedbackPriority | null;
  userId?: string | null;
  agentId?: string | null;
  workspaceId?: string | null;
  email?: string | null;
  sourceUrl?: string | null;
  module?: string | null;
  browser?: string | null;
  os?: string | null;
  viewport?: string | null;
  appVersion?: string | null;
  screenshotUrl?: string | null;
  duplicateOfId?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFeedbackMyItem {
  id: string;
  type: ProductFeedbackType;
  status: ProductFeedbackStatus;
  category: ProductFeedbackCategory;
  source: ProductFeedbackSource;
  title: string;
  description: string;
  userPriority?: ProductFeedbackPriority | null;
  sourceUrl?: string | null;
  module?: string | null;
  teamResponse?: string | null;
  teamResponseUpdatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFeedbackAdminFilters {
  status?: ProductFeedbackStatus;
  type?: ProductFeedbackType;
  category?: ProductFeedbackCategory;
  source?: ProductFeedbackSource;
  userPriority?: ProductFeedbackPriority;
  internalPriority?: ProductFeedbackPriority;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ProductFeedbackMyFilters {
  status?: ProductFeedbackStatus;
  type?: ProductFeedbackType;
  page?: number;
  limit?: number;
}

export interface ProductFeedbackAdminResponse {
  data: ProductFeedbackAdminItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ProductFeedbackMyResponse {
  data: ProductFeedbackMyItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UpdateProductFeedbackInput {
  status?: ProductFeedbackStatus;
  internalPriority?: ProductFeedbackPriority | null;
  duplicateOfId?: string | null;
  internalNote?: string;
  teamResponse?: string;
  metadata?: Record<string, unknown>;
}

export function submitProductFeedback(
  input: CreateProductFeedbackInput,
): Promise<ProductFeedbackSubmission> {
  return apiFetch<ProductFeedbackSubmission>('/product-feedback', {
    method: 'POST',
    body: input,
  });
}

export function submitPublicProductFeedback(
  input: CreatePublicProductFeedbackInput,
): Promise<ProductFeedbackSubmission> {
  return apiFetch<ProductFeedbackSubmission>('/product-feedback/public', {
    method: 'POST',
    skipAuth: true,
    body: input,
  });
}

export function fetchMyProductFeedback(
  filters: ProductFeedbackMyFilters = {},
): Promise<ProductFeedbackMyResponse> {
  return apiFetch<ProductFeedbackMyResponse>(
    `/product-feedback/my${buildQueryString(filters)}`,
  );
}

export function fetchProductFeedbackAdmin(
  filters: ProductFeedbackAdminFilters = {},
): Promise<ProductFeedbackAdminResponse> {
  return apiFetch<ProductFeedbackAdminResponse>(
    `/admin/product-feedback${buildQueryString(filters)}`,
  );
}

export function updateProductFeedbackAdmin(
  id: string,
  input: UpdateProductFeedbackInput,
): Promise<ProductFeedbackAdminItem> {
  return apiFetch<ProductFeedbackAdminItem>(`/admin/product-feedback/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export function fetchActiveFeatureSurveys(): Promise<FeatureSurvey[]> {
  return apiFetch<FeatureSurvey[]>('/feature-surveys/active');
}

export function fetchActivePublicFeatureSurveys(): Promise<FeatureSurvey[]> {
  return apiFetch<FeatureSurvey[]>('/feature-surveys/public/active', {
    skipAuth: true,
  });
}

export function submitFeatureSurveyResponse(
  surveyId: string,
  input: SubmitFeatureSurveyResponseInput,
): Promise<FeatureSurveyResponseSubmission> {
  return apiFetch<FeatureSurveyResponseSubmission>(
    `/feature-surveys/${surveyId}/responses`,
    {
      method: 'POST',
      body: input,
    },
  );
}

export function submitPublicFeatureSurveyResponse(
  surveyId: string,
  input: SubmitPublicFeatureSurveyResponseInput,
): Promise<FeatureSurveyResponseSubmission> {
  return apiFetch<FeatureSurveyResponseSubmission>(
    `/feature-surveys/${surveyId}/public-responses`,
    {
      method: 'POST',
      skipAuth: true,
      body: input,
    },
  );
}

function buildQueryString(filters: object): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
