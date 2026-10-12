import { randomUUID } from 'node:crypto';

/** An identifier owned by our application, independent of any payment provider. */
export type PaymentId = string & { readonly __brand: 'PaymentId' };

export function newPaymentId(): PaymentId {
  return randomUUID() as PaymentId;
}

/** Local recurring consent ID; provider tokens and aliases never identify it. */
export type AuthorizationId = string & { readonly __brand: 'AuthorizationId' };

export function newAuthorizationId(): AuthorizationId {
  return randomUUID() as AuthorizationId;
}

export type ProviderReferenceType = 'CARD_TOKEN' | 'RECURRING_ALIAS';

/** One locally owned renewal for one subscription billing period. */
export type RenewalId = string & { readonly __brand: 'RenewalId' };

export function newRenewalId(): RenewalId {
  return randomUUID() as RenewalId;
}

export type RenewalStatus = 'due' | 'charging' | 'unknown' | 'paid' | 'failed';
export type RenewalAttemptStatus = 'charging' | 'unknown' | 'paid' | 'failed';

/** A later worker must resolve an uncertain attempt before any retry. */
export function canStartRenewalAttempt(
  renewalStatus: RenewalStatus,
  latestAttemptStatus?: RenewalAttemptStatus,
): boolean {
  return (
    (renewalStatus === 'due' || renewalStatus === 'failed') &&
    (latestAttemptStatus === undefined || latestAttemptStatus === 'failed')
  );
}

/** An integer amount in grosze, never a floating-point amount in złoty. */
export type PaymentAmountMinor = number & {
  readonly __brand: 'PaymentAmountMinor';
};

export function toPaymentAmountMinor(value: number): PaymentAmountMinor {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError('Payment amount must be a positive safe integer in grosze');
  }

  return value as PaymentAmountMinor;
}

export type PaymentCurrency = 'PLN';

export type PaymentKind =
  | 'listing'
  | 'subscription_initial'
  | 'subscription_renewal';

export type PaymentStatus =
  | 'created'
  | 'pending'
  | 'unknown'
  | 'confirmed'
  | 'failed'
  | 'expired'
  | 'partially_refunded'
  | 'refunded';

const nextStatuses: Readonly<Record<PaymentStatus, readonly PaymentStatus[]>> = {
  created: ['pending', 'unknown', 'confirmed', 'failed', 'expired'],
  pending: ['unknown', 'confirmed', 'failed', 'expired'],
  unknown: ['confirmed', 'failed', 'expired'],
  confirmed: ['partially_refunded', 'refunded'],
  failed: [],
  expired: [],
  partially_refunded: ['refunded'],
  refunded: [],
};

/**
 * Repeating a status is an idempotent no-op. Unknown remains unresolved until a
 * definitive outcome arrives; confirmed payments can only progress to refunds.
 */
export function canTransitionPaymentStatus(
  current: PaymentStatus,
  next: PaymentStatus,
): boolean {
  return current === next || nextStatuses[current].includes(next);
}
