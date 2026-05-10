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

export interface ProductFeedbackSubmission {
  id: string;
  type: ProductFeedbackType;
  status: string;
  createdAt: string;
}

export function submitProductFeedback(
  input: CreateProductFeedbackInput,
): Promise<ProductFeedbackSubmission> {
  return apiFetch<ProductFeedbackSubmission>('/product-feedback', {
    method: 'POST',
    body: input,
  });
}
