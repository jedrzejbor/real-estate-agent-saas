import { TpayConfiguration } from './tpay.config';

const OAUTH_TIMEOUT_MS = 5_000;
const CHANNELS_TIMEOUT_MS = 5_000;

/** One-time payment channels reported as available by the merchant API. */
export interface TpayAvailablePaymentChannel {
  id: string;
  name: string;
  fullName?: string;
  groups: Array<{ id: string; name: string }>;
}

/** OAuth and read-only channel discovery; payment requests belong to later tasks. */
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

  /** GET /transactions/channels; this says nothing about recurring permissions. */
  async getAvailablePaymentChannels(): Promise<TpayAvailablePaymentChannel[]> {
    const token = await this.getAccessToken();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHANNELS_TIMEOUT_MS);
    let response: Response;
    try {
      response = await this.fetcher(`${this.config.apiUrl}/transactions/channels`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timeout);
      throw new Error(
        controller.signal.aborted
          ? 'Tpay payment channels request timed out'
          : 'Tpay payment channels request failed',
      );
    }

    try {
      if (response.status === 401) {
        throw new Error('Tpay payment channels authorization rejected');
      }
      if (!response.ok) throw new Error('Tpay payment channels request failed');

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new Error(
          controller.signal.aborted
            ? 'Tpay payment channels request timed out'
            : 'Tpay payment channels response is invalid',
        );
      }
      return parseAvailableChannels(payload);
    } finally {
      clearTimeout(timeout);
    }
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

function parseAvailableChannels(payload: unknown): TpayAvailablePaymentChannel[] {
  if (!isRecord(payload) || payload.result !== 'success' || !Array.isArray(payload.channels)) {
    throw new Error('Tpay payment channels response is invalid');
  }

  return payload.channels
    .filter((channel: unknown) => isRecord(channel) && channel.available === true)
    .map((channel: unknown) => {
      if (
        !isRecord(channel) ||
        !isChannelId(channel.id) ||
        typeof channel.name !== 'string' ||
        channel.name.trim().length === 0 ||
        (channel.groups !== undefined && !Array.isArray(channel.groups))
      ) {
        throw new Error('Tpay payment channels response is invalid');
      }
      const groups = (channel.groups ?? []) as unknown[];
      if (
        groups.some(
          (group) =>
            !isRecord(group) ||
            !isChannelId(group.id) ||
            typeof group.name !== 'string',
        )
      ) {
        throw new Error('Tpay payment channels response is invalid');
      }

      return {
        id: channel.id as string,
        name: channel.name as string,
        ...(typeof channel.fullName === 'string' ? { fullName: channel.fullName } : {}),
        groups: groups.map((group) => {
          const value = group as Record<string, unknown>;
          return { id: value.id as string, name: value.name as string };
        }),
      };
    });
}

function isChannelId(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9]\d*$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
