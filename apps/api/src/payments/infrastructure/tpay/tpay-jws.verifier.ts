import { createVerify, X509Certificate, constants } from 'node:crypto';

// Tpay's documented signing certificate and CA. Never use x5u as a fetch URL.
export const TPAY_JWS_CERT_URL = 'https://secure.tpay.com/x509/notifications-jws.pem';
export const TPAY_JWS_CA_URL = 'https://secure.tpay.com/x509/tpay-jws-root.pem';

const CERTIFICATE_TIMEOUT_MS = 5_000;
const CERTIFICATE_CACHE_MS = 60 * 60 * 1_000;
const MAX_CERTIFICATE_BYTES = 64 * 1_024;
const MAX_JWS_LENGTH = 8_192;

export interface TpayJwsCertificates {
  signingCertificate: string;
  trustedCa: string;
}

export type TpayJwsCertificateSource = () => Promise<TpayJwsCertificates>;

/** Fetches only the two fixed certificate URLs from Tpay, without redirects. */
export function createTpayJwsCertificateSource(
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now,
): TpayJwsCertificateSource {
  let cached: { value: TpayJwsCertificates; validUntil: number } | null = null;
  let inFlight: Promise<TpayJwsCertificates> | null = null;

  return async () => {
    if (cached && now() < cached.validUntil) return cached.value;
    if (inFlight) return inFlight;

    const request = Promise.all([
      fetchCertificate(TPAY_JWS_CERT_URL, fetcher),
      fetchCertificate(TPAY_JWS_CA_URL, fetcher),
    ]).then(([signingCertificate, trustedCa]) => {
      const value = { signingCertificate, trustedCa };
      cached = { value, validUntil: now() + CERTIFICATE_CACHE_MS };
      return value;
    });
    inFlight = request;
    try {
      return await request;
    } finally {
      if (inFlight === request) inFlight = null;
    }
  };
}

async function fetchCertificate(url: string, fetcher: typeof fetch): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CERTIFICATE_TIMEOUT_MS);
  try {
    const response = await fetcher(url, {
      method: 'GET',
      redirect: 'error',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('Tpay JWS certificate is unavailable');
    if (!response.body) throw new Error('Tpay JWS certificate is invalid');
    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_CERTIFICATE_BYTES) {
        await reader.cancel();
        throw new Error('Tpay JWS certificate is invalid');
      }
      chunks.push(Buffer.from(value));
    }
    if (totalBytes === 0) {
      throw new Error('Tpay JWS certificate is invalid');
    }
    return Buffer.concat(chunks, totalBytes).toString('utf8');
  } finally {
    clearTimeout(timeout);
  }
}

/** Verifies detached compact JWS over the exact bytes received by Nest rawBody. */
export class TpayJwsVerifier {
  constructor(
    private readonly certificates: TpayJwsCertificateSource = createTpayJwsCertificateSource(),
    private readonly now: () => number = Date.now,
  ) {}

  async verify(jws: string | undefined, rawBody: Buffer | undefined): Promise<boolean> {
    if (!Buffer.isBuffer(rawBody) || typeof jws !== 'string' || jws.length > MAX_JWS_LENGTH) {
      return false;
    }

    const segments = jws.split('.');
    if (segments.length !== 3 || segments[1] !== '') return false;
    const [encodedHeader, , encodedSignature] = segments;
    const headerBytes = decodeBase64Url(encodedHeader);
    const signature = decodeBase64Url(encodedSignature);
    if (!headerBytes || !signature || signature.length === 0) return false;

    let header: unknown;
    try {
      header = JSON.parse(headerBytes.toString('utf8'));
    } catch {
      return false;
    }
    if (!isSupportedHeader(header)) return false;

    try {
      const { signingCertificate, trustedCa } = await this.certificates();
      const signer = new X509Certificate(signingCertificate);
      const root = new X509Certificate(trustedCa);
      const currentTime = this.now();
      if (
        !root.ca || signer.ca ||
        !isValidAt(root, currentTime) || !isValidAt(signer, currentTime) ||
        !root.checkIssued(root) || !root.verify(root.publicKey) ||
        !signer.checkIssued(root) || !signer.verify(root.publicKey) ||
        signer.publicKey.asymmetricKeyType !== 'rsa'
      ) return false;

      const signingInput = `${encodedHeader}.${rawBody.toString('base64url')}`;
      const verifier = createVerify('RSA-SHA256');
      verifier.update(signingInput, 'ascii');
      verifier.end();
      return verifier.verify(
        { key: signer.publicKey, padding: constants.RSA_PKCS1_PADDING },
        signature,
      );
    } catch {
      // Certificate loading, parsing and cryptographic errors fail closed.
      return false;
    }
  }
}

function isSupportedHeader(value: unknown): value is { alg: 'RS256'; x5u: typeof TPAY_JWS_CERT_URL } {
  return typeof value === 'object' && value !== null && !Array.isArray(value) &&
    'alg' in value && value.alg === 'RS256' &&
    'x5u' in value && value.x5u === TPAY_JWS_CERT_URL &&
    !('crit' in value) && !('b64' in value);
}

function decodeBase64Url(value: string): Buffer | null {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const decoded = Buffer.from(value, 'base64url');
  return decoded.toString('base64url') === value ? decoded : null;
}

function isValidAt(certificate: X509Certificate, timestamp: number): boolean {
  const start = Date.parse(certificate.validFrom);
  const end = Date.parse(certificate.validTo);
  return Number.isFinite(start) && Number.isFinite(end) && start <= timestamp && timestamp <= end;
}
