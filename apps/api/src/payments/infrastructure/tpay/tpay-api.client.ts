import { TpayConfiguration } from './tpay.config';

const OAUTH_TIMEOUT_MS = 5_000;

/** Only the OAuth endpoint is supported here. Payment requests belong to later tasks. */
export class TpayApiClient {
  private cachedToken: { value: string; validUntil: number } | null = null;
  private refreshInFlight: Promise<string> | null = null;

  constructor(
    private readonly config: TpayConfiguration,
    private readonly fetcher: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  getAccessToken(): Promise<string> {
    if (this.cachedToken && this.now() < this.cachedToken.validUntil) {
      return Promise.resolve(this.cachedToken.value);
    }
    if (this.refreshInFlight) return this.refreshInFlight;

    const refresh = this.requestToken();
    this.refreshInFlight = refresh;
    void refresh.finally(() => {
      if (this.refreshInFlight === refresh) this.refreshInFlight = null;
    }).catch(() => undefined);
    return refresh;
  }

  private async requestToken(): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OAUTH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await this.fetcher(`${this.config.apiUrl}/oauth/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }),
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timeout);
      throw new Error(
        controller.signal.aborted ? 'Tpay OAuth request timed out' : 'Tpay OAuth request failed',
      );
    }

    try {
      if (response.status === 401) throw new Error('Tpay OAuth authorization rejected');
      if (!response.ok) throw new Error('Tpay OAuth request failed');

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new Error(
          controller.signal.aborted ? 'Tpay OAuth request timed out' : 'Tpay OAuth response is invalid',
        );
      }
      if (!isTokenResponse(payload)) throw new Error('Tpay OAuth response is invalid');

      const lifetimeMs = payload.expires_in * 1_000;
      const safetyMarginMs = Math.min(60_000, lifetimeMs * 0.1);
      this.cachedToken = {
        value: payload.access_token,
        validUntil: this.now() + lifetimeMs - safetyMarginMs,
      };
      return payload.access_token;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function isTokenResponse(value: unknown): value is {
  access_token: string;
  expires_in: number;
} {
  if (typeof value !== 'object' || value === null) return false;
  const response = value as Record<string, unknown>;
  return (
    typeof response.access_token === 'string' &&
    response.access_token.length > 0 &&
    typeof response.expires_in === 'number' &&
    Number.isFinite(response.expires_in) &&
    response.expires_in > 0
  );
}
