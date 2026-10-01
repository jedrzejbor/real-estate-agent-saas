import type { BillingInterval } from './public-pricing';

const STORAGE_KEY = 'podadresem.pending-plan-selection';
const INTENT_TTL_MS = 24 * 60 * 60 * 1000;
const PAID_PLANS = ['starter', 'professional'] as const;

export interface PendingPlanSelection {
  email: string;
  plan: (typeof PAID_PLANS)[number];
  billing: BillingInterval;
  promotionCode?: string;
}

export function savePendingPlanSelection(intent: PendingPlanSelection): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...intent, savedAt: Date.now() }),
    );
  } catch {
    // The user can still select a plan after login if storage is unavailable.
  }
}

export function readPendingPlanSelection(
  accountEmail: string,
): PendingPlanSelection | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const value = parsed as Record<string, unknown>;
    if (
      !PAID_PLANS.includes(value.plan as PendingPlanSelection['plan']) ||
      typeof value.email !== 'string' ||
      value.email.trim().toLowerCase() !== accountEmail.trim().toLowerCase() ||
      (value.billing !== 'monthly' && value.billing !== 'yearly') ||
      typeof value.savedAt !== 'number' ||
      Date.now() - value.savedAt > INTENT_TTL_MS ||
      value.savedAt > Date.now()
    )
      return null;
    return {
      email: value.email,
      plan: value.plan as PendingPlanSelection['plan'],
      billing: value.billing,
      promotionCode:
        typeof value.promotionCode === 'string'
          ? value.promotionCode.slice(0, 100)
          : undefined,
    };
  } catch {
    return null;
  }
}

export function clearPendingPlanSelection(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable in restricted browsing modes.
  }
}

export function getPendingPlanContinuationPath(
  accountEmail: string,
): string | null {
  const intent = readPendingPlanSelection(accountEmail);
  if (!intent) return null;
  const params = new URLSearchParams({
    plan: intent.plan,
    billing: intent.billing,
  });
  return `/dashboard/upgrade?${params.toString()}`;
}
