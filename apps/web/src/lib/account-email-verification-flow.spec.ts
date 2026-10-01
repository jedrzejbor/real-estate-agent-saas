import { ApiError } from './api-client';
import { isEmailVerificationRequired } from './account-email-verification';
import { isPendingRegistration, maskAccountEmail } from './auth';
import {
  clearPendingPlanSelection,
  getPendingPlanContinuationPath,
  readPendingPlanSelection,
  savePendingPlanSelection,
} from './registration-continuation';

describe('account verification continuation', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => {
            storage.set(key, value);
          },
          removeItem: (key: string) => {
            storage.delete(key);
          },
        },
      },
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: globalThis.window.localStorage,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('recognizes a pending registration without a user and masks the address', () => {
    expect(
      isPendingRegistration({ status: 'pending_email_verification' }),
    ).toBe(true);
    expect(maskAccountEmail('jan.kowalski@example.com')).toBe(
      'ja***@example.com',
    );
  });

  it('recognizes the server code only for a matching API error', () => {
    expect(
      isEmailVerificationRequired(
        new ApiError(403, { code: 'EMAIL_VERIFICATION_REQUIRED' }),
      ),
    ).toBe(true);
    expect(
      isEmailVerificationRequired(
        new ApiError(401, { code: 'INVALID_CREDENTIALS' }),
      ),
    ).toBe(false);
    expect(
      isEmailVerificationRequired(
        new ApiError(500, { code: 'EMAIL_VERIFICATION_REQUIRED' }),
      ),
    ).toBe(false);
  });

  it('keeps plan intent across tabs and excludes the promotion code from the URL', () => {
    savePendingPlanSelection({
      email: 'agent@example.com',
      plan: 'professional',
      billing: 'yearly',
      promotionCode: 'PROMO10',
    });
    expect(getPendingPlanContinuationPath('agent@example.com')).toBe(
      '/dashboard/upgrade?plan=professional&billing=yearly',
    );
    expect(getPendingPlanContinuationPath('other@example.com')).toBeNull();
    expect(readPendingPlanSelection('agent@example.com')?.promotionCode).toBe(
      'PROMO10',
    );
    clearPendingPlanSelection();
    expect(readPendingPlanSelection('agent@example.com')).toBeNull();
  });

  it('does not resume an expired plan intent', () => {
    savePendingPlanSelection({
      email: 'agent@example.com',
      plan: 'starter',
      billing: 'monthly',
    });
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 25 * 60 * 60 * 1000);
    expect(getPendingPlanContinuationPath('agent@example.com')).toBeNull();
    jest.restoreAllMocks();
  });
});
