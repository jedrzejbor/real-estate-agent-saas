export const PAYMENT_CONFIGURATION = Symbol('PAYMENT_CONFIGURATION');

export type PaymentConfiguration =
  | { provider: 'disabled' }
  | { provider: 'tpay'; tpay: TpayConfiguration };

export interface TpayConfiguration {
  environment: 'sandbox' | 'production';
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  merchantId: string;
}

type ReadEnvironmentVariable = (name: string) => string | undefined;

const TPAY_API_URLS = {
  sandbox: 'https://openapi.sandbox.tpay.com',
  production: 'https://api.tpay.com',
} as const;

/** Validate configuration at API startup without contacting the payment provider. */
export function loadPaymentConfiguration(
  read: ReadEnvironmentVariable,
): PaymentConfiguration {
  const provider = read('PAYMENT_PROVIDER')?.trim() || 'disabled';
  if (provider === 'disabled') return { provider };
  if (provider !== 'tpay') {
    throw new Error('PAYMENT_PROVIDER must be disabled or tpay');
  }

  const environment =
    read('NODE_ENV') === 'production' ? 'production' : 'sandbox';
  const apiUrl = required(read, 'TPAY_API_URL');
  const expectedApiUrl = TPAY_API_URLS[environment];
  if (!isExpectedApiUrl(apiUrl, expectedApiUrl)) {
    throw new Error(`TPAY_API_URL must use the ${environment} endpoint`);
  }

  const clientId = required(read, 'TPAY_CLIENT_ID');
  const clientSecret = required(read, 'TPAY_CLIENT_SECRET');
  const merchantId = required(read, 'TPAY_MERCHANT_ID');
  if (!/^\d+$/.test(merchantId)) {
    throw new Error('TPAY_MERCHANT_ID must contain digits only');
  }

  return {
    provider,
    tpay: {
      environment,
      apiUrl: expectedApiUrl,
      clientId,
      clientSecret,
      merchantId,
    },
  };
}

function required(read: ReadEnvironmentVariable, name: string): string {
  const value = read(name)?.trim();
  if (!value) throw new Error(`${name} is required when PAYMENT_PROVIDER=tpay`);
  return value;
}

function isExpectedApiUrl(value: string, expected: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.origin === expected &&
      url.pathname === '/' &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}
