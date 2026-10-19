import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';
import { TpayApiClient, TpayCreateTransactionInput } from './tpay-api.client';
import { loadPaymentConfiguration, TpayConfiguration } from './tpay.config';

const config: TpayConfiguration = {
  environment: 'sandbox',
  apiUrl: 'https://openapi.sandbox.tpay.com',
  clientId: 'unit-client-id',
  clientSecret: 'unit-client-secret',
  merchantId: '123',
};

function ok(token = 'unit-access-token', expiresIn = 120): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ access_token: token, expires_in: expiresIn }),
  } as Response;
}

describe('PAY-016 Tpay OAuth client', () => {
  it('posts form credentials once and reuses a valid cached token', async () => {
    let currentTime = 1_000;
    const fetcher = jest.fn().mockResolvedValue(ok());
    const client = new TpayApiClient(config, fetcher, () => currentTime);

    await expect(client.getAccessToken()).resolves.toBe('unit-access-token');
    currentTime += 10_000;
    await expect(client.getAccessToken()).resolves.toBe('unit-access-token');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe('https://openapi.sandbox.tpay.com/oauth/auth');
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(fetcher.mock.calls[0][1].body).toBeInstanceOf(URLSearchParams);
    expect(fetcher.mock.calls[0][1].body.get('client_secret')).toBe(config.clientSecret);
  });

  it('refreshes at the safety margin before expiry', async () => {
    let currentTime = 1_000;
    const fetcher = jest.fn().mockResolvedValueOnce(ok('first', 120)).mockResolvedValueOnce(ok('second'));
    const client = new TpayApiClient(config, fetcher, () => currentTime);

    await expect(client.getAccessToken()).resolves.toBe('first');
    currentTime += 107_999;
    await expect(client.getAccessToken()).resolves.toBe('first');
    currentTime += 1;
    await expect(client.getAccessToken()).resolves.toBe('second');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('shares one in-flight refresh across concurrent callers', async () => {
    let resolveRequest!: (response: Response) => void;
    const fetcher = jest.fn().mockImplementation(
      () => new Promise<Response>((resolve) => { resolveRequest = resolve; }),
    );
    const client = new TpayApiClient(config, fetcher);

    const requests = [client.getAccessToken(), client.getAccessToken(), client.getAccessToken()];
    expect(fetcher).toHaveBeenCalledTimes(1);
    resolveRequest(ok());
    await expect(Promise.all(requests)).resolves.toEqual([
      'unit-access-token', 'unit-access-token', 'unit-access-token',
    ]);
  });

  it('masks a 401 response and permits a later retry', async () => {
    const fetcher = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ secret: config.clientSecret }) })
      .mockResolvedValueOnce(ok());
    const client = new TpayApiClient(config, fetcher);

    await expect(client.getAccessToken()).rejects.toThrow('Tpay OAuth authorization rejected');
    await expect(client.getAccessToken()).resolves.toBe('unit-access-token');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('times out and does not expose secrets or tokens in errors or logs', async () => {
    jest.useFakeTimers();
    const log = jest.spyOn(console, 'log').mockImplementation();
    const error = jest.spyOn(console, 'error').mockImplementation();
    try {
      const fetcher = jest.fn().mockImplementation((_: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error(config.clientSecret)));
        }),
      );
      const client = new TpayApiClient(config, fetcher);
      const result = client.getAccessToken().catch((failure: Error) => failure.message);
      await jest.advanceTimersByTimeAsync(5_000);
      const message = await result;
      expect(message).toBe('Tpay OAuth request timed out');
      expect(message).not.toContain(config.clientSecret);
      expect(JSON.stringify([...log.mock.calls, ...error.mock.calls])).not.toContain(config.clientSecret);
    } finally {
      log.mockRestore();
      error.mockRestore();
      jest.useRealTimers();
    }
  });
});

describe('PAY-030 Tpay refund request', () => {
  const transactionId = '01PAY030TRANSACTION';
  const refundResponse = {
    result: 'success', transactionId,
    refundsList: [{ refundId: 'rf_PAY030', status: 'pending', amount: 12.34, currency: 'PLN' }],
  };
  const makeClient = (refund: Response) => {
    const fetcher = jest.fn()
      .mockResolvedValueOnce(ok('unit-access-token'))
      .mockResolvedValueOnce(refund);
    return { client: new TpayApiClient(config, fetcher), fetcher };
  };
  const reply = (status: number, payload: unknown): Response => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response);

  it('sends full {} and partial decimal PLN exactly and maps an accepted request to pending', async () => {
    const full = makeClient(reply(200, refundResponse));
    await expect(full.client.requestRefund({ transactionId, kind: 'full', amountMinor: 1234 }))
      .resolves.toEqual({ status: 'pending', providerRefundId: 'rf_PAY030' });
    expect(full.fetcher.mock.calls[1][0]).toBe(`https://openapi.sandbox.tpay.com/transactions/${transactionId}/refunds`);
    expect(full.fetcher.mock.calls[1][1]).toMatchObject({
      method: 'POST', body: '{}',
      headers: { Authorization: 'Bearer unit-access-token', 'Content-Type': 'application/json' },
    });

    const partial = makeClient(reply(200, refundResponse));
    await expect(partial.client.requestRefund({ transactionId, kind: 'partial', amountMinor: 1234 }))
      .resolves.toEqual({ status: 'pending', providerRefundId: 'rf_PAY030' });
    expect(partial.fetcher.mock.calls[1][1].body).toBe('{"amount":12.34}');
    expect(partial.fetcher).toHaveBeenCalledTimes(2);
  });

  it('separates definite 4xx from uncertain 5xx and ambiguous 200 without another POST', async () => {
    const bad = makeClient(reply(400, { result: 'failed' }));
    await expect(bad.client.requestRefund({ transactionId, kind: 'partial', amountMinor: 1234 }))
      .resolves.toEqual({ status: 'rejected', httpStatus: 400 });
    const server = makeClient(reply(503, { result: 'failed' }));
    await expect(server.client.requestRefund({ transactionId, kind: 'partial', amountMinor: 1234 }))
      .resolves.toEqual({ status: 'unknown', reason: 'provider_error', httpStatus: 503 });
    const malformed = makeClient(reply(200, { result: 'success', transactionId: 'other', refundsList: [] }));
    await expect(malformed.client.requestRefund({ transactionId, kind: 'full', amountMinor: 1234 }))
      .resolves.toEqual({ status: 'unknown', reason: 'invalid_response' });
    expect(bad.fetcher).toHaveBeenCalledTimes(2);
    expect(server.fetcher).toHaveBeenCalledTimes(2);
    expect(malformed.fetcher).toHaveBeenCalledTimes(2);
  });

  it('keeps timeout unknown and sends only one POST', async () => {
    jest.useFakeTimers();
    try {
      const fetcher = jest.fn()
        .mockResolvedValueOnce(ok('unit-access-token'))
        .mockImplementationOnce((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('hidden-test-data')));
        }));
      const client = new TpayApiClient(config, fetcher);
      const result = client.requestRefund({ transactionId, kind: 'partial', amountMinor: 1234 });
      await jest.advanceTimersByTimeAsync(5_000);
      await expect(result).resolves.toEqual({ status: 'unknown', reason: 'timeout' });
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps a broken connection unknown and does not retry the POST', async () => {
    const fetcher = jest.fn()
      .mockResolvedValueOnce(ok('unit-access-token'))
      .mockRejectedValueOnce(new Error('private transport detail'));
    const client = new TpayApiClient(config, fetcher);
    await expect(client.requestRefund({ transactionId, kind: 'partial', amountMinor: 1 }))
      .resolves.toEqual({ status: 'unknown', reason: 'network' });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

async function startOAuthServer(
  handle: (request: IncomingMessage, response: ServerResponse) => Promise<void>,
) {
  const server = createServer((request, response) => {
    void handle(request, response).catch(() => {
      response.writeHead(500).end();
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address() as AddressInfo;
  return {
    apiUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

async function readForm(request: IncomingMessage): Promise<URLSearchParams> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
}

describe('PAY-017 OAuth HTTP integration', () => {
  it('sends a form POST and refreshes after the HTTP response expires', async () => {
    let requests = 0;
    let currentTime = 1_000;
    const server = await startOAuthServer(async (request, response) => {
      requests += 1;
      const form = await readForm(request);
      if (
        request.method !== 'POST' ||
        request.url !== '/oauth/auth' ||
        request.headers['content-type'] !== 'application/x-www-form-urlencoded' ||
        form.get('client_id') !== config.clientId ||
        form.get('client_secret') !== config.clientSecret
      ) {
        response.writeHead(400).end();
        return;
      }
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ access_token: `local-token-${requests}`, expires_in: 30 }));
    });

    try {
      const client = new TpayApiClient(
        { ...config, apiUrl: server.apiUrl },
        fetch,
        () => currentTime,
      );
      await expect(client.getAccessToken()).resolves.toBe('local-token-1');
      currentTime += 26_999;
      await expect(client.getAccessToken()).resolves.toBe('local-token-1');
      expect(requests).toBe(1);
      currentTime += 1;
      await expect(client.getAccessToken()).resolves.toBe('local-token-2');
      expect(requests).toBe(2);
    } finally {
      await server.close();
    }
  });

  it('rejects an invalid client secret without exposing the HTTP response', async () => {
    const rejectedSecret = 'local-bad-secret';
    const leakedToken = 'should-never-appear';
    const server = await startOAuthServer(async (request, response) => {
      const form = await readForm(request);
      expect(form.get('client_secret')).toBe(rejectedSecret);
      response.writeHead(401, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: rejectedSecret, access_token: leakedToken }));
    });

    try {
      const client = new TpayApiClient({ ...config, apiUrl: server.apiUrl, clientSecret: rejectedSecret });
      const message = await client.getAccessToken().catch((error: Error) => error.message);
      expect(message).toBe('Tpay OAuth authorization rejected');
      expect(message).not.toContain(rejectedSecret);
      expect(message).not.toContain(leakedToken);
    } finally {
      await server.close();
    }
  });

  it('masks malformed successful responses and provider errors', async () => {
    let requests = 0;
    const secret = 'local-secret-value';
    const server = await startOAuthServer(async (request, response) => {
      await readForm(request);
      requests += 1;
      response.writeHead(requests === 1 ? 200 : 503, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: secret, access_token: 'unsafe-provider-token' }));
    });

    try {
      const client = new TpayApiClient({ ...config, apiUrl: server.apiUrl, clientSecret: secret });
      const first = await client.getAccessToken().catch((error: Error) => error.message);
      const second = await client.getAccessToken().catch((error: Error) => error.message);
      expect(first).toBe('Tpay OAuth response is invalid');
      expect(second).toBe('Tpay OAuth request failed');
      expect(`${first} ${second}`).not.toContain(secret);
      expect(`${first} ${second}`).not.toContain('unsafe-provider-token');
    } finally {
      await server.close();
    }
  });
});

/** Explicit opt-in: ordinary Jest runs never contact Tpay Sandbox. */
const liveSandboxTest = process.env.TPAY_OAUTH_LIVE_TEST === '1' ? it : it.skip;
liveSandboxTest('PAY-017 live Sandbox OAuth (opt-in)', async () => {
  const paymentConfig = loadPaymentConfiguration((name) => process.env[name]);
  if (paymentConfig.provider !== 'tpay' || paymentConfig.tpay.environment !== 'sandbox') {
    throw new Error('Tpay Sandbox configuration is required for the opt-in OAuth test');
  }

  let expiresIn: unknown;
  const capturingFetch: typeof fetch = async (input, init) => {
    const response = await fetch(input, init);
    if (response.ok) {
      const payload: unknown = await response.clone().json();
      if (typeof payload === 'object' && payload !== null && 'expires_in' in payload) {
        expiresIn = payload.expires_in;
      }
    }
    return response;
  };
  const client = new TpayApiClient(paymentConfig.tpay, capturingFetch);
  const token = await client.getAccessToken();
  expect(token.length).toBeGreaterThan(0);
  expect(typeof expiresIn).toBe('number');
  expect(expiresIn as number).toBeGreaterThan(0);
});

describe('PAY-018 one-time payment channels', () => {
  it('returns only channels explicitly marked available', async () => {
    const fetcher = jest.fn()
      .mockResolvedValueOnce(ok())
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ result: 'success', channels: [
          { id: '64', name: 'BLIK', fullName: 'BLIK', available: true, groups: [{ id: '150', name: 'BLIK' }] },
          { id: '53', name: 'Card', available: false, groups: [{ id: '103', name: 'Card' }] },
          { id: '68', name: 'Google Pay', groups: [{ id: '166', name: 'Wallet' }] },
        ] }),
      });
    const client = new TpayApiClient(config, fetcher);

    await expect(client.getAvailablePaymentChannels()).resolves.toEqual([
      { id: '64', name: 'BLIK', fullName: 'BLIK', groups: [{ id: '150', name: 'BLIK' }] },
    ]);
    expect(fetcher.mock.calls[1][0]).toBe('https://openapi.sandbox.tpay.com/transactions/channels');
    expect(fetcher.mock.calls[1][1]).toMatchObject({
      method: 'GET',
      headers: { Authorization: 'Bearer unit-access-token' },
    });
  });

  it('uses OAuth over HTTP and does not advertise a disabled card channel', async () => {
    let authRequests = 0;
    let channelRequests = 0;
    const server = await startOAuthServer(async (request, response) => {
      if (request.url === '/oauth/auth') {
        authRequests += 1;
        await readForm(request);
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ access_token: 'local-integration-token', expires_in: 120 }));
        return;
      }
      if (request.url === '/transactions/channels') {
        channelRequests += 1;
        if (request.method !== 'GET' || request.headers.authorization !== 'Bearer local-integration-token') {
          response.writeHead(401).end();
          return;
        }
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ result: 'success', channels: [
          { id: '64', name: 'BLIK', available: true, groups: [{ id: '150', name: 'BLIK' }] },
          { id: '53', name: 'Card', available: false, groups: [{ id: '103', name: 'Card' }] },
        ] }));
        return;
      }
      response.writeHead(404).end();
    });

    try {
      const client = new TpayApiClient({ ...config, apiUrl: server.apiUrl });
      await expect(client.getAvailablePaymentChannels()).resolves.toEqual([
        { id: '64', name: 'BLIK', groups: [{ id: '150', name: 'BLIK' }] },
      ]);
      expect(authRequests).toBe(1);
      expect(channelRequests).toBe(1);
    } finally {
      await server.close();
    }
  });

  it('masks an authorization error and provider response data', async () => {
    const fetcher = jest.fn()
      .mockResolvedValueOnce(ok('private-test-token'))
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: config.clientSecret, token: 'private-test-token' }),
      });
    const client = new TpayApiClient(config, fetcher);

    const message = await client.getAvailablePaymentChannels().catch((error: Error) => error.message);
    expect(message).toBe('Tpay payment channels authorization rejected');
    expect(message).not.toContain(config.clientSecret);
    expect(message).not.toContain('private-test-token');
  });

  it('rejects provider errors and malformed lists instead of declaring availability', async () => {
    const fetcher = jest.fn()
      .mockResolvedValueOnce(ok())
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ channels: null }) });
    const client = new TpayApiClient(config, fetcher);

    await expect(client.getAvailablePaymentChannels()).rejects.toThrow('Tpay payment channels request failed');
    await expect(client.getAvailablePaymentChannels()).rejects.toThrow('Tpay payment channels response is invalid');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});

const transactionInput: TpayCreateTransactionInput = {
  amountMinor: 4999,
  description: 'PodAdresem sandbox test',
  hiddenDescription: 'pay-019-local-test',
  payer: { email: 'test@example.com', name: 'Test User' },
  callbacks: {
    notificationUrl: 'https://example.com/tpay/notification',
    successUrl: 'https://example.com/tpay/success',
    errorUrl: 'https://example.com/tpay/error',
  },
};

function createdTransaction(): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      result: 'success',
      status: 'pending',
      transactionId: '01TESTPAY019TRANSACTION',
      title: 'TR-TEST-PAY019',
      transactionPaymentUrl: 'https://secure.sandbox.tpay.com/test-payment',
    }),
  } as Response;
}

describe('PAY-019 create transaction', () => {
  it('serializes grosze as exact JSON decimal PLN without float arithmetic', async () => {
    const fetcher = jest.fn().mockImplementation((url: string) =>
      Promise.resolve(url.endsWith('/oauth/auth') ? ok() : createdTransaction()),
    );
    const client = new TpayApiClient(config, fetcher);

    for (const amountMinor of [1, 100, 4999, Number.MAX_SAFE_INTEGER]) {
      await expect(client.createTransaction({ ...transactionInput, amountMinor })).resolves.toMatchObject({
        status: 'pending',
      });
    }
    const bodies = fetcher.mock.calls
      .filter(([url]) => url.endsWith('/transactions'))
      .map(([, init]) => init.body as string);
    expect(bodies).toHaveLength(4);
    expect(bodies[0]).toContain('"amount":0.01,');
    expect(bodies[1]).toContain('"amount":1.00,');
    expect(bodies[2]).toContain('"amount":49.99,');
    expect(bodies[3]).toContain('"amount":90071992547409.91,');
    await expect(client.createTransaction({ ...transactionInput, amountMinor: 49.99 }))
      .rejects.toThrow('Payment amount must be a positive safe integer in grosze');
    expect(fetcher).toHaveBeenCalledTimes(5);
  });

  it('creates a pending transaction over local HTTP with payer and callbacks', async () => {
    let transactionPosts = 0;
    const server = await startOAuthServer(async (request, response) => {
      if (request.url === '/oauth/auth') {
        await readForm(request);
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ access_token: 'local-oauth-token', expires_in: 120 }));
        return;
      }
      if (request.url === '/transactions') {
        transactionPosts += 1;
        const chunks: Buffer[] = [];
        for await (const chunk of request) chunks.push(Buffer.from(chunk));
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        expect(request.method).toBe('POST');
        expect(request.headers.authorization).toBe('Bearer local-oauth-token');
        expect(request.headers['content-type']).toBe('application/json');
        expect(body).toMatchObject({
          amount: 49.99,
          description: transactionInput.description,
          hiddenDescription: transactionInput.hiddenDescription,
          payer: transactionInput.payer,
          callbacks: {
            notification: { url: transactionInput.callbacks.notificationUrl },
            payerUrls: {
              success: transactionInput.callbacks.successUrl,
              error: transactionInput.callbacks.errorUrl,
            },
          },
        });
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(await createdTransaction().json()));
        return;
      }
      response.writeHead(404).end();
    });

    try {
      const client = new TpayApiClient({ ...config, apiUrl: server.apiUrl });
      await expect(client.createTransaction(transactionInput)).resolves.toEqual({
        status: 'pending',
        transactionId: '01TESTPAY019TRANSACTION',
        title: 'TR-TEST-PAY019',
        transactionPaymentUrl: 'https://secure.sandbox.tpay.com/test-payment',
      });
      expect(transactionPosts).toBe(1);
    } finally {
      await server.close();
    }
  });

  it('classifies a definite 4xx rejection without returning provider error details', async () => {
    const fetcher = jest.fn().mockResolvedValueOnce(ok()).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ secret: config.clientSecret }),
    });
    const client = new TpayApiClient(config, fetcher);
    await expect(client.createTransaction(transactionInput)).resolves.toEqual({
      status: 'rejected',
      httpStatus: 400,
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('classifies a 5xx response as unknown and never retries the POST', async () => {
    const fetcher = jest.fn().mockResolvedValueOnce(ok()).mockResolvedValueOnce({
      ok: false,
      status: 503,
    });
    const client = new TpayApiClient(config, fetcher);
    await expect(client.createTransaction(transactionInput)).resolves.toEqual({
      status: 'unknown',
      reason: 'provider_error',
      httpStatus: 503,
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('classifies timeout and broken connection as unknown without retrying', async () => {
    jest.useFakeTimers();
    try {
      const fetcher = jest.fn()
        .mockResolvedValueOnce(ok())
        .mockImplementationOnce((_: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new Error('network details')));
          }),
        )
        .mockRejectedValueOnce(new Error('connection reset with private details'));
      const client = new TpayApiClient(config, fetcher);
      const pending = client.createTransaction(transactionInput);
      await jest.advanceTimersByTimeAsync(5_000);
      await expect(pending).resolves.toEqual({ status: 'unknown', reason: 'timeout' });
      await expect(client.createTransaction(transactionInput)).resolves.toEqual({
        status: 'unknown',
        reason: 'network',
      });
      expect(fetcher).toHaveBeenCalledTimes(3);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('PAY-020 transaction status fallback', () => {
  const transactionId = '01M4Z0P95T0JKTHVYZWVW201J4';
  const transaction = (status: string, paymentStatus: string, amountPaid: number) => ({
    result: 'success',
    transactionId,
    status,
    amount: 1,
    currency: 'PLN',
    date: { realization: status === 'success' ? '2026-10-15 10:00:00' : null },
    payments: { status: paymentStatus, amountPaid },
  });
  const clientFor = (payload: unknown, responseStatus = 200) => {
    const fetcher = jest.fn()
      .mockResolvedValueOnce(ok('private-test-token'))
      .mockResolvedValueOnce({
        ok: responseStatus === 200,
        status: responseStatus,
        json: async () => payload,
      });
    return { client: new TpayApiClient(config, fetcher), fetcher };
  };

  it('maps a pending transaction without confirming it', async () => {
    const { client, fetcher } = clientFor(transaction('pending', 'pending', 0));
    await expect(client.getTransactionStatus(transactionId)).resolves.toEqual({
      status: 'pending', transactionId,
    });
    expect(fetcher.mock.calls[1][0]).toBe(
      `https://openapi.sandbox.tpay.com/transactions/${transactionId}`,
    );
    expect(fetcher.mock.calls[1][1]).toMatchObject({
      method: 'GET', headers: { Authorization: 'Bearer private-test-token' },
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    const sparse = clientFor({
      result: 'success', transactionId, status: 'pending', payments: { attempts: [] },
    });
    await expect(sparse.client.getTransactionStatus(transactionId)).resolves.toEqual({
      status: 'pending', transactionId,
    });
  });

  it('maps a fully paid and consistent transaction to confirmed', async () => {
    const { client } = clientFor(transaction('success', 'correct', 1));
    await expect(client.getTransactionStatus(transactionId)).resolves.toEqual({
      status: 'confirmed', transactionId,
    });
    const sparse = clientFor({
      result: 'success', transactionId, status: 'success', amount: 1, currency: 'PLN',
      date: { realization: '2026-10-15 10:00:00' }, payments: { attempts: [] },
    });
    await expect(sparse.client.getTransactionStatus(transactionId)).resolves.toEqual({
      status: 'confirmed', transactionId,
    });
  });

  it('maps a definitive failed transaction to failed', async () => {
    const { client } = clientFor(transaction('error', 'error', 0));
    await expect(client.getTransactionStatus(transactionId)).resolves.toEqual({
      status: 'failed', transactionId,
    });
  });

  it('keeps a missing transaction unknown', async () => {
    const { client, fetcher } = clientFor({ secret: config.clientSecret }, 404);
    await expect(client.getTransactionStatus(transactionId)).resolves.toEqual({
      status: 'unknown', reason: 'not_found',
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('never confirms mismatched, underpaid, malformed or ambiguous responses', async () => {
    const cases = [
      transaction('pending', 'correct', 1),
      transaction('success', 'pending', 1),
      transaction('success', 'correct', 0.5),
      { ...transaction('success', 'correct', 1), date: { realization: null } },
      { ...transaction('success', 'correct', 1), transactionId: 'OTHER' },
      { ...transaction('success', 'correct', 1), currency: 'EUR' },
      { ...transaction('success', 'correct', 1), result: 'failed' },
      { result: 'success', status: 'success', transactionId },
    ];
    for (const payload of cases) {
      const { client } = clientFor(payload);
      await expect(client.getTransactionStatus(transactionId)).resolves.toEqual({
        status: 'unknown', reason: 'invalid_response',
      });
    }
  });
});
