import {
  canTransitionPaymentStatus,
  newPaymentId,
  toPaymentAmountMinor,
  type PaymentStatus,
} from './payment.types';

describe('provider-neutral payment types', () => {
  it('creates distinct local UUIDs', () => {
    const first = newPaymentId();
    const second = newPaymentId();

    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(second).not.toBe(first);
  });

  it.each([1, 4999, Number.MAX_SAFE_INTEGER])(
    'accepts %s grosze as an amount',
    (amount) => {
      expect(toPaymentAmountMinor(amount)).toBe(amount);
    },
  );

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'rejects %s as an amount in grosze',
    (amount) => {
      expect(() => toPaymentAmountMinor(amount)).toThrow(RangeError);
    },
  );

  it.each<[PaymentStatus, PaymentStatus]>([
    ['created', 'pending'],
    ['created', 'confirmed'],
    ['pending', 'unknown'],
    ['pending', 'failed'],
    ['unknown', 'confirmed'],
    ['unknown', 'expired'],
    ['confirmed', 'partially_refunded'],
    ['confirmed', 'refunded'],
    ['partially_refunded', 'refunded'],
  ])('allows %s → %s', (current, next) => {
    expect(canTransitionPaymentStatus(current, next)).toBe(true);
  });

  it.each<[PaymentStatus, PaymentStatus]>([
    ['pending', 'created'],
    ['unknown', 'pending'],
    ['unknown', 'created'],
    ['confirmed', 'failed'],
    ['confirmed', 'pending'],
    ['failed', 'confirmed'],
    ['expired', 'confirmed'],
    ['partially_refunded', 'confirmed'],
    ['refunded', 'partially_refunded'],
  ])('rejects %s → %s', (current, next) => {
    expect(canTransitionPaymentStatus(current, next)).toBe(false);
  });

  it.each<PaymentStatus>([
    'created',
    'pending',
    'unknown',
    'confirmed',
    'failed',
    'expired',
    'partially_refunded',
    'refunded',
  ])('treats repeated %s as an idempotent no-op', (status) => {
    expect(canTransitionPaymentStatus(status, status)).toBe(true);
  });
});
