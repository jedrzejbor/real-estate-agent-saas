import {
  getPendingPaymentReturnOrderId,
  getTrustedPaymentCheckoutUrl,
} from './payment-checkout-url';

describe('Tpay checkout URL', () => {
  it('accepts only the transaction panel for the selected environment', () => {
    expect(
      getTrustedPaymentCheckoutUrl(
        'https://secure.sandbox.tpay.com/?title=TR-TEST&uid=abc',
        'sandbox',
      ),
    ).toBe('https://secure.sandbox.tpay.com/?title=TR-TEST&uid=abc');
    expect(
      getTrustedPaymentCheckoutUrl('https://secure.tpay.com/?uid=abc', 'production'),
    ).toBe('https://secure.tpay.com/?uid=abc');
    expect(
      getTrustedPaymentCheckoutUrl('https://secure.tpay.com/', 'sandbox'),
    ).toBeNull();
    expect(
      getTrustedPaymentCheckoutUrl('https://secure.sandbox.tpay.com/', 'production'),
    ).toBeNull();
  });

  it.each([
    'http://secure.sandbox.tpay.com/',
    'javascript:alert(1)',
    '//secure.sandbox.tpay.com/',
    'https://secure.sandbox.tpay.com.evil.example/',
    'https://evil.example/?next=secure.sandbox.tpay.com',
    'https://secure.sandbox.tpay.com@evil.example/',
    'https://user@secure.sandbox.tpay.com/',
    'https://secure.sandbox.tpay.com:444/',
    'https:\\secure.sandbox.tpay.com\\foo',
    ' https://secure.sandbox.tpay.com/',
    'not a URL',
  ])('rejects an unsafe URL: %s', (value) => {
    expect(getTrustedPaymentCheckoutUrl(value, 'sandbox')).toBeNull();
  });

  it('fails closed without an explicit environment', () => {
    expect(
      getTrustedPaymentCheckoutUrl('https://secure.sandbox.tpay.com/', undefined),
    ).toBeNull();
    expect(
      getTrustedPaymentCheckoutUrl('https://secure.sandbox.tpay.com/', 'other'),
    ).toBeNull();
  });
});

describe('return from payment', () => {
  const orders = [
    { id: 'pending-order', status: 'pending_payment' },
    { id: 'paid-order', status: 'paid' },
  ];

  it('shows processing only for a matching pending order read from the API', () => {
    expect(
      getPendingPaymentReturnOrderId('?payment_return=1&orderId=pending-order', orders),
    ).toBe('pending-order');
    expect(orders[0].status).toBe('pending_payment');
  });

  it('does not turn success parameters, unknown orders or paid orders into processing or payment', () => {
    expect(
      getPendingPaymentReturnOrderId('?success=1&orderId=pending-order', orders),
    ).toBeNull();
    expect(
      getPendingPaymentReturnOrderId('?payment_return=1&orderId=other-user-order', orders),
    ).toBeNull();
    expect(
      getPendingPaymentReturnOrderId('?payment_return=1&orderId=paid-order', orders),
    ).toBeNull();
    expect(orders[0].status).toBe('pending_payment');
    expect(orders[1].status).toBe('paid');
  });
});
