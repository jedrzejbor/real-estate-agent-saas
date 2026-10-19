import { TpayConfiguration } from './tpay.config';
import { toPaymentAmountMinor } from '../../domain/payment.types';

const OAUTH_TIMEOUT_MS = 5_000;
const CHANNELS_TIMEOUT_MS = 5_000;
const CREATE_TRANSACTION_TIMEOUT_MS = 5_000;
const GET_TRANSACTION_TIMEOUT_MS = 5_000;
const REFUND_TIMEOUT_MS = 5_000;

export type TpayRefundResult =
  | { status: 'pending'; providerRefundId: string | null }
  | { status: 'rejected'; httpStatus: number }
  | { status: 'unknown'; reason: 'timeout' | 'network' | 'provider_error' | 'invalid_response'; httpStatus?: number };

export type TpayTransactionStatusResult =
  | { status: 'pending' | 'confirmed' | 'failed'; transactionId: string }
  | { status: 'unknown'; reason: 'not_found' | 'authorization' | 'provider_error' | 'timeout' | 'network' | 'invalid_response' };

export type TpayTransactionDetailsResult =
  | {
      status: 'pending' | 'confirmed' | 'failed';
      transactionId: string;
      amountMinor: number | null;
      currency: string | null;
    }
  | Extract<TpayTransactionStatusResult, { status: 'unknown' }>;

export interface TpayCreateTransactionInput {
  amountMinor: number;
  description: string;
  payer: { email: string; name: string };
  callbacks: { notificationUrl: string; successUrl: string; errorUrl: string };
  hiddenDescription?: string;
}

export type TpayCreateTransactionResult =
  | {
      status: 'pending';
      transactionId: string;
      title: string;
      transactionPaymentUrl: string;
    }
  | { status: 'rejected'; httpStatus: number }
  | {
      status: 'unknown';
      reason: 'timeout' | 'network' | 'provider_error' | 'invalid_response';
      httpStatus?: number;
    };

/** One-time payment channels reported as available by the merchant API. */
export interface TpayAvailablePaymentChannel {
  id: string;
  name: string;
  fullName?: string;
  groups: Array<{ id: string; name: string }>;
}

/** OAuth, channel discovery, isolated transaction creation and fallback status reads. */
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

  /** A failed or ambiguous POST is never retried here; callers must reconcile first. */
  async createTransaction(input: TpayCreateTransactionInput): Promise<TpayCreateTransactionResult> {
    const amountDecimal = formatAmountPln(input.amountMinor);
    const description = requiredText(input.description, 'description');
    const payerEmail = requiredText(input.payer.email, 'payer.email');
    const payerName = requiredText(input.payer.name, 'payer.name');
    const notificationUrl = requiredHttpsUrl(input.callbacks.notificationUrl, 'notificationUrl');
    const successUrl = requiredHttpsUrl(input.callbacks.successUrl, 'successUrl');
    const errorUrl = requiredHttpsUrl(input.callbacks.errorUrl, 'errorUrl');

    // The amount is inserted as a JSON decimal literal, avoiding PLN float arithmetic.
    const otherFields = JSON.stringify({
      description,
      ...(input.hiddenDescription === undefined
        ? {}
        : { hiddenDescription: requiredText(input.hiddenDescription, 'hiddenDescription') }),
      payer: { email: payerEmail, name: payerName },
      callbacks: {
        notification: { url: notificationUrl },
        payerUrls: { success: successUrl, error: errorUrl },
      },
    });
    const body = `{"amount":${amountDecimal},${otherFields.slice(1)}`;
    const token = await this.getAccessToken();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CREATE_TRANSACTION_TIMEOUT_MS);
    let response: Response;
    try {
      response = await this.fetcher(`${this.config.apiUrl}/transactions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body,
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timeout);
      return {
        status: 'unknown',
        reason: controller.signal.aborted ? 'timeout' : 'network',
      };
    }

    try {
      if (response.status >= 400 && response.status < 500 && response.status !== 408) {
        return { status: 'rejected', httpStatus: response.status };
      }
      if (!response.ok) {
        return { status: 'unknown', reason: 'provider_error', httpStatus: response.status };
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        return {
          status: 'unknown',
          reason: controller.signal.aborted ? 'timeout' : 'invalid_response',
        };
      }
      if (!isCreatedTransaction(payload)) {
        return { status: 'unknown', reason: 'invalid_response' };
      }
      return {
        status: 'pending',
        transactionId: payload.transactionId,
        title: payload.title,
        transactionPaymentUrl: payload.transactionPaymentUrl,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Reconciliation fallback only; callers must not poll every payment. */
  async getTransactionStatus(transactionId: string): Promise<TpayTransactionStatusResult> {
    const details = await this.getTransactionDetails(transactionId);
    if (details.status === 'unknown') return details;
    return { status: details.status, transactionId: details.transactionId };
  }

  /** Same single GET, with amount for an adapter to verify against the local ledger. */
  async getTransactionDetails(transactionId: string): Promise<TpayTransactionDetailsResult> {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(transactionId)) {
      throw new Error('Tpay transaction ID is invalid');
    }
    const token = await this.getAccessToken();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GET_TRANSACTION_TIMEOUT_MS);
    let response: Response;
    try {
      response = await this.fetcher(
        `${this.config.apiUrl}/transactions/${encodeURIComponent(transactionId)}`,
        { method: 'GET', headers: { Authorization: `Bearer ${token}` }, signal: controller.signal },
      );
    } catch {
      clearTimeout(timeout);
      return { status: 'unknown', reason: controller.signal.aborted ? 'timeout' : 'network' };
    }

    try {
      if (response.status === 404) return { status: 'unknown', reason: 'not_found' };
      if (response.status === 401 || response.status === 403) {
        return { status: 'unknown', reason: 'authorization' };
      }
      if (!response.ok) return { status: 'unknown', reason: 'provider_error' };

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        return { status: 'unknown', reason: controller.signal.aborted ? 'timeout' : 'invalid_response' };
      }
      const mapped = mapTransactionStatus(payload, transactionId);
      if (mapped.status === 'unknown') return mapped;
      const amountMinor = isRecord(payload) ? parseProviderAmountMinor(payload.amount) : null;
      return {
        ...mapped,
        amountMinor,
        currency: isRecord(payload) && typeof payload.currency === 'string' ? payload.currency : null,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Full refunds use {}; partial refunds provide decimal PLN. A POST is never retried here. */
  async requestRefund(input: {
    transactionId: string;
    kind: 'full' | 'partial';
    amountMinor: number;
  }): Promise<TpayRefundResult> {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(input.transactionId)) {
      throw new Error('Tpay transaction ID is invalid');
    }
    const amount = formatAmountPln(input.amountMinor);
    const body = input.kind === 'full' ? '{}' : `{"amount":${amount}}`;
    const token = await this.getAccessToken();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REFUND_TIMEOUT_MS);
    let response: Response;
    try {
      response = await this.fetcher(
        `${this.config.apiUrl}/transactions/${encodeURIComponent(input.transactionId)}/refunds`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body,
          signal: controller.signal,
        },
      );
    } catch {
      clearTimeout(timeout);
      return { status: 'unknown', reason: controller.signal.aborted ? 'timeout' : 'network' };
    }

    try {
      if (response.status >= 400 && response.status < 500 && response.status !== 408) {
        return { status: 'rejected', httpStatus: response.status };
      }
      if (!response.ok) {
        return { status: 'unknown', reason: 'provider_error', httpStatus: response.status };
      }
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        return { status: 'unknown', reason: controller.signal.aborted ? 'timeout' : 'invalid_response' };
      }
      if (!isRecord(payload) || payload.result !== 'success' ||
          payload.transactionId !== input.transactionId || !Array.isArray(payload.refundsList) ||
          payload.refundsList.length === 0) {
        return { status: 'unknown', reason: 'invalid_response' };
      }
      const refunds = payload.refundsList.filter((item: unknown) =>
        isRecord(item) && typeof item.refundId === 'string' && item.refundId.length > 0);
      // The response can include earlier partial refunds. No ID is safer than guessing.
      return {
        status: 'pending',
        providerRefundId: refunds.length === 1 ? refunds[0].refundId as string : null,
      };
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

function parseProviderAmountMinor(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const text = String(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fractional = ''] = text.split('.');
  const minor = Number(whole) * 100 + Number(fractional.padEnd(2, '0'));
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

function formatAmountPln(amountMinor: number): string {
  toPaymentAmountMinor(amountMinor);
  const whole = Math.floor(amountMinor / 100);
  const fraction = String(amountMinor % 100).padStart(2, '0');
  return `${whole}.${fraction}`;
}

function requiredText(value: string, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Tpay transaction ${name} is required`);
  }
  return value.trim();
}

function requiredHttpsUrl(value: string, name: string): string {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.toString();
  } catch {
    // Use the same safe validation error for malformed URLs.
  }
  throw new Error(`Tpay transaction ${name} must be an HTTPS URL`);
}

function isCreatedTransaction(value: unknown): value is {
  transactionId: string;
  title: string;
  transactionPaymentUrl: string;
} {
  if (!isRecord(value) || value.result !== 'success' || value.status !== 'pending') {
    return false;
  }
  if (
    typeof value.transactionId !== 'string' ||
    value.transactionId.length === 0 ||
    typeof value.title !== 'string' ||
    value.title.length === 0 ||
    typeof value.transactionPaymentUrl !== 'string'
  ) {
    return false;
  }
  try {
    return new URL(value.transactionPaymentUrl).protocol === 'https:';
  } catch {
    return false;
  }
}

function mapTransactionStatus(payload: unknown, transactionId: string): TpayTransactionStatusResult {
  if (
    !isRecord(payload) ||
    payload.result !== 'success' ||
    payload.transactionId !== transactionId ||
    !isRecord(payload.payments)
  ) {
    return { status: 'unknown', reason: 'invalid_response' };
  }

  const paymentStatus = payload.payments.status;
  // GET can return only payments.attempts for an untouched pending transaction.
  if (payload.status === 'pending' && (paymentStatus === 'pending' || paymentStatus === undefined)) {
    return { status: 'pending', transactionId };
  }
  if (payload.status === 'success' && (paymentStatus === 'correct' || paymentStatus === undefined)) {
    const amount = payload.amount;
    const amountPaid = payload.payments.amountPaid;
    const realization = isRecord(payload.date) ? payload.date.realization : undefined;
    if (
      payload.currency === 'PLN' &&
      typeof amount === 'number' && Number.isFinite(amount) && amount > 0 &&
      typeof realization === 'string' && realization.length > 0 &&
      (amountPaid === undefined ||
        (typeof amountPaid === 'number' && Number.isFinite(amountPaid) && amountPaid >= amount))
    ) {
      return { status: 'confirmed', transactionId };
    }
  }
  if (
    (payload.status === 'error' || payload.status === 'failed') &&
    (paymentStatus === 'error' || paymentStatus === 'failed')
  ) {
    return { status: 'failed', transactionId };
  }
  return { status: 'unknown', reason: 'invalid_response' };
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
