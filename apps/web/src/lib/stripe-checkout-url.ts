/** Only allow HTTPS redirects to Stripe-owned checkout hosts. */
export function isStripeCheckoutUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'checkout.stripe.com' ||
        url.hostname.endsWith('.stripe.com'))
    );
  } catch {
    return false;
  }
}

export function assertStripeCheckoutUrl(value: string): string {
  if (!isStripeCheckoutUrl(value)) {
    throw new Error('Operator płatności zwrócił nieprawidłowy adres przekierowania.');
  }
  return value;
}
