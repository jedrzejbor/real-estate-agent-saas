export type TpayCheckoutEnvironment = 'sandbox' | 'production';

const CHECKOUT_HOST: Record<TpayCheckoutEnvironment, string> = {
  sandbox: 'secure.sandbox.tpay.com',
  production: 'secure.tpay.com',
};

/** Only a Tpay transaction-panel URL for the selected environment may be opened. */
export function getTrustedPaymentCheckoutUrl(
  value: unknown,
  environment: string | undefined,
): string | null {
  if (environment !== 'sandbox' && environment !== 'production') return null;
  if (typeof value !== 'string' || !value || value !== value.trim()) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return null;

  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.hostname !== CHECKOUT_HOST[environment] ||
      (url.port !== '' && url.port !== '443') ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

/** A return parameter only selects a pending, owner-scoped order for display. */
export function getPendingPaymentReturnOrderId(
  search: string,
  orders: readonly { id: string; status: string }[],
): string | null {
  const params = new URLSearchParams(search);
  if (params.get('payment_return') !== '1') return null;
  const orderId = params.get('orderId');
  if (!orderId) return null;
  return orders.some(
    (order) => order.id === orderId && order.status === 'pending_payment',
  )
    ? orderId
    : null;
}
