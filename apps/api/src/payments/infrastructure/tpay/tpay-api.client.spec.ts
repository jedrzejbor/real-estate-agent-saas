import { TpayApiClient } from './tpay-api.client';
import { TpayConfiguration } from './tpay.config';

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
