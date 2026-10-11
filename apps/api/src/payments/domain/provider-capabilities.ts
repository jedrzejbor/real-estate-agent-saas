/** Availability is configured for an account; a type alone does not enable a method. */
export interface PaymentProviderCapabilities {
  readonly oneTimePayments: boolean;
  readonly refunds: boolean;
  readonly cardRecurring: boolean;
  readonly recurringAlias: boolean;
}

export const PAYMENT_PROVIDER_CAPABILITIES = Symbol(
  'payments.providerCapabilities',
);
