import { assertStripeCheckoutUrl, isStripeCheckoutUrl } from './stripe-checkout-url';

describe('Stripe Checkout redirect URLs', () => {
  it.each([
    ['https://checkout.stripe.com/c/pay/test', true],
    ['https://custom.stripe.com/pay/test', true],
    ['http://checkout.stripe.com/c/pay/test', false],
    ['https://stripe.com.attacker.example/pay', false],
    ['javascript:alert(1)', false],
    ['/dashboard/upgrade', false],
  ])('validates %s', (url, expected) => {
    expect(isStripeCheckoutUrl(url)).toBe(expected);
  });

  it('returns only validated URLs for redirects', () => {
    const url = 'https://checkout.stripe.com/c/pay/test';
    expect(assertStripeCheckoutUrl(url)).toBe(url);
    expect(() => assertStripeCheckoutUrl('https://attacker.example/pay'))
      .toThrow('Operator płatności zwrócił nieprawidłowy adres przekierowania.');
  });
});
