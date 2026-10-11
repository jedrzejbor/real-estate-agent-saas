import { randomUUID } from 'node:crypto';

/** An identifier owned by our application, independent of any payment provider. */
export type PaymentId = string & { readonly __brand: 'PaymentId' };

export function newPaymentId(): PaymentId {
  return randomUUID() as PaymentId;
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
