import type {
  AuthorizationId,
  PaymentAmountMinor,
  PaymentCurrency,
  RenewalId,
} from '../domain/payment.types';
import type { PaymentReturnUrls } from './payment-gateway.port';

export const RECURRING_GATEWAY = Symbol('payments.recurringGateway');

export type RecurringMethod = 'card' | 'recurring_alias';

export interface StartAuthorizationRequest {
  readonly authorizationId: AuthorizationId;
  readonly subscriptionId: string;
  readonly method: RecurringMethod;
  readonly buyerEmail: string;
  readonly returnUrls: PaymentReturnUrls;
}

export interface ProviderAuthorizationStart {
  readonly status: 'pending' | 'active' | 'failed';
  readonly redirectUrl: string | null;
  readonly providerAuthorizationId: string | null;
}

export interface ChargeRenewalRequest {
  readonly renewalId: RenewalId;
  readonly authorizationId: AuthorizationId;
  readonly amountMinor: PaymentAmountMinor;
  readonly currency: PaymentCurrency;
}

export interface ProviderChargeResult {
  readonly providerTransactionId: string | null;
  readonly status: 'pending' | 'confirmed' | 'failed' | 'unknown';
}

/** Consent and subsequent charges only; does not own one-time checkout/refunds. */
export interface RecurringGateway {
  startAuthorization(input: StartAuthorizationRequest): Promise<ProviderAuthorizationStart>;
  charge(input: ChargeRenewalRequest): Promise<ProviderChargeResult>;
  revokeAuthorization(authorizationId: AuthorizationId): Promise<void>;
}
