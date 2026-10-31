import { newPaymentId, toPaymentAmountMinor } from '../../domain/payment.types';
import { CreatePaymentRequest } from '../../ports/payment-gateway.port';
import { TpayApiClient } from './tpay-api.client';
import { TpayConfiguration } from './tpay.config';
import { TpayPaymentAdapter } from './tpay-payment.adapter';

const config: TpayConfiguration = {
  environment: 'sandbox',
  apiUrl: 'https://openapi.sandbox.tpay.com',
  clientId: 'test-client',
  clientSecret: 'test-secret',
  merchantId: '123',
};
const request: CreatePaymentRequest = {
  paymentId: newPaymentId(),
  amountMinor: toPaymentAmountMinor(4999),
  currency: 'PLN',
  description: 'Ogłoszenie PodAdresem',
  buyerEmail: 'test@example.com',
  buyerName: 'Test Buyer',
  notificationUrl: 'https://api.example.test/payments/notify',
  returnUrls: {
    success: 'https://app.example.test/payment/success',
    failure: 'https://app.example.test/payment/failure',
  },
};

const response = (status: number, payload: unknown): Response => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => payload,
} as Response);

describe('PAY-022 Tpay one-time adapter', () => {
  it('maps the exact backend amount, payer and callbacks and returns ID/title/link as pending', async () => {
    const fetcher = jest.fn().mockImplementation(async (url: string) => {
      if (url.endsWith('/oauth/auth')) return response(200, { access_token: 'unit-token', expires_in: 120 });
      return response(200, {
        result: 'success', status: 'pending', transactionId: '01PAY022TRANSACTION',
        title: 'TR-PAY022', transactionPaymentUrl: 'https://secure.sandbox.tpay.com/test',
      });
    });
    const adapter = new TpayPaymentAdapter(new TpayApiClient(config, fetcher));
    await expect(adapter.createPayment(request)).resolves.toEqual({
      status: 'pending', providerTransactionId: '01PAY022TRANSACTION',
      providerTitle: 'TR-PAY022', redirectUrl: 'https://secure.sandbox.tpay.com/test',
    });
    const [url, options] = fetcher.mock.calls[1];
    expect(url).toBe('https://openapi.sandbox.tpay.com/transactions');
    expect(options.method).toBe('POST');
    expect(options.body).toContain('"amount":49.99,');
    expect(JSON.parse(options.body)).toMatchObject({
      description: request.description,
      hiddenDescription: request.paymentId,
      payer: { email: request.buyerEmail, name: request.buyerName },
      callbacks: {
        notification: { url: request.notificationUrl },
        payerUrls: { success: request.returnUrls.success, error: request.returnUrls.failure },
      },
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('maps a paid status only with provider amount and leaves absent amount unknown', async () => {
    const client = {
      getTransactionDetails: jest.fn()
        .mockResolvedValueOnce({ status: 'confirmed', transactionId: 'tx', amountMinor: 4999, currency: 'PLN' })
        .mockResolvedValueOnce({ status: 'pending', transactionId: 'tx', amountMinor: null, currency: 'PLN' }),
    } as unknown as TpayApiClient;
    const adapter = new TpayPaymentAdapter(client);
    await expect(adapter.getPaymentStatus('tx')).resolves.toEqual({
      providerTransactionId: 'tx', status: 'confirmed', amountMinor: 4999, currency: 'PLN',
    });
    await expect(adapter.getPaymentStatus('tx')).resolves.toEqual({
      providerTransactionId: 'tx', status: 'unknown',
    });
  });

  it('maps GET pending and 404 through the real client without false confirmation', async () => {
    const fetcher = jest.fn()
      .mockResolvedValueOnce(response(200, { access_token: 'unit-token', expires_in: 120 }))
      .mockResolvedValueOnce(response(200, {
        result: 'success', status: 'pending', transactionId: 'tx',
        amount: 49.99, currency: 'PLN', payments: { attempts: [] },
      }))
      .mockResolvedValueOnce(response(404, { result: 'failed' }));
    const adapter = new TpayPaymentAdapter(new TpayApiClient(config, fetcher));
    await expect(adapter.getPaymentStatus('tx')).resolves.toEqual({
      providerTransactionId: 'tx', status: 'pending', amountMinor: 4999, currency: 'PLN',
    });
    await expect(adapter.getPaymentStatus('missing')).resolves.toEqual({
      providerTransactionId: 'missing', status: 'unknown',
    });
  });

  it('maps a consistent paid GET through the real client and rejects a mismatched ID', async () => {
    const paid = (transactionId: string) => ({
      result: 'success', transactionId, status: 'success', amount: 49.99,
      currency: 'PLN', date: { realization: '2026-10-16 12:00:00' },
      payments: { status: 'correct', amountPaid: 49.99 },
    });
    const fetcher = jest.fn()
      .mockResolvedValueOnce(response(200, { access_token: 'unit-token', expires_in: 120 }))
      .mockResolvedValueOnce(response(200, paid('tx')))
      .mockResolvedValueOnce(response(200, paid('foreign')));
    const adapter = new TpayPaymentAdapter(new TpayApiClient(config, fetcher));
    await expect(adapter.getPaymentStatus('tx')).resolves.toEqual({
      providerTransactionId: 'tx', status: 'confirmed', amountMinor: 4999, currency: 'PLN',
    });
    await expect(adapter.getPaymentStatus('tx')).resolves.toEqual({
      providerTransactionId: 'tx', status: 'unknown',
    });
  });

  it('distinguishes definite 4xx from uncertain 5xx and never repeats POST', async () => {
    const client = {
      createTransaction: jest.fn()
        .mockResolvedValueOnce({ status: 'rejected', httpStatus: 400 })
        .mockResolvedValueOnce({ status: 'unknown', reason: 'provider_error', httpStatus: 503 }),
    } as unknown as TpayApiClient;
    const adapter = new TpayPaymentAdapter(client);
    await expect(adapter.createPayment(request)).resolves.toEqual({ status: 'rejected', httpStatus: 400 });
    await expect(adapter.createPayment(request)).resolves.toEqual({ status: 'unknown', reason: 'provider_error' });
    expect(client.createTransaction).toHaveBeenCalledTimes(2);
  });

  it('keeps timeout, broken connection and OAuth errors unknown without automatic retry', async () => {
    const client = {
      createTransaction: jest.fn()
        .mockResolvedValueOnce({ status: 'unknown', reason: 'timeout' })
        .mockResolvedValueOnce({ status: 'unknown', reason: 'network' })
        .mockRejectedValueOnce(new Error('private provider detail')),
    } as unknown as TpayApiClient;
    const adapter = new TpayPaymentAdapter(client);
    await expect(adapter.createPayment(request)).resolves.toEqual({ status: 'unknown', reason: 'timeout' });
    await expect(adapter.createPayment(request)).resolves.toEqual({ status: 'unknown', reason: 'network' });
    await expect(adapter.createPayment(request)).resolves.toEqual({ status: 'unknown', reason: 'provider_error' });
    expect(client.createTransaction).toHaveBeenCalledTimes(3);
  });

});

describe('PAY-030 Tpay refund adapter', () => {
  const refund = {
    paymentId: request.paymentId,
    providerTransactionId: '01PAY030TRANSACTION',
    kind: 'partial' as const,
    amountMinor: toPaymentAmountMinor(1234),
    currency: 'PLN' as const,
  };

  it('maps an accepted request to pending without changing entitlements', async () => {
    const client = { requestRefund: jest.fn().mockResolvedValue({ status: 'pending', providerRefundId: 'rf_123' }) } as unknown as TpayApiClient;
    const adapter = new TpayPaymentAdapter(client);
    await expect(adapter.refundPayment(refund)).resolves.toEqual({ status: 'pending', providerRefundId: 'rf_123' });
    expect(client.requestRefund).toHaveBeenCalledWith({
      transactionId: refund.providerTransactionId,
      kind: refund.kind,
      amountMinor: refund.amountMinor,
    });
  });

  it('maps a definite 4xx rejection to failed', async () => {
    const client = { requestRefund: jest.fn().mockResolvedValue({ status: 'rejected', httpStatus: 400 }) } as unknown as TpayApiClient;
    await expect(new TpayPaymentAdapter(client).refundPayment(refund))
      .resolves.toEqual({ status: 'failed', providerRefundId: null });
  });

  it('holds an unknown outcome and does not submit another refund in this process', async () => {
    const client = { requestRefund: jest.fn().mockResolvedValue({ status: 'unknown', reason: 'timeout' }) } as unknown as TpayApiClient;
    const adapter = new TpayPaymentAdapter(client);
    await expect(adapter.refundPayment(refund)).resolves.toEqual({ status: 'unknown', providerRefundId: null });
    await expect(adapter.refundPayment(refund)).resolves.toEqual({ status: 'unknown', providerRefundId: null });
    expect(client.requestRefund).toHaveBeenCalledTimes(1);
  });

  it('shares one in-flight request for concurrent calls', async () => {
    let resolve!: (value: unknown) => void;
    const client = { requestRefund: jest.fn().mockImplementation(() => new Promise((done) => { resolve = done; })) } as unknown as TpayApiClient;
    const adapter = new TpayPaymentAdapter(client);
    const first = adapter.refundPayment(refund);
    const second = adapter.refundPayment(refund);
    resolve({ status: 'unknown', reason: 'network' });
    await expect(Promise.all([first, second])).resolves.toEqual([
      { status: 'unknown', providerRefundId: null },
      { status: 'unknown', providerRefundId: null },
    ]);
    expect(client.requestRefund).toHaveBeenCalledTimes(1);
  });
});
