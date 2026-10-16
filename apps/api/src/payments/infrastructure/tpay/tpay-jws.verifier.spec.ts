import { createSign } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createTpayJwsCertificateSource,
  TPAY_JWS_CA_URL,
  TPAY_JWS_CERT_URL,
  TpayJwsVerifier,
} from './tpay-jws.verifier';

describe('TpayJwsVerifier', () => {
  let fixtureDir: string;
  let signerKey: string;
  let signingCertificate: string;
  let trustedCa: string;
  let otherCa: string;
  const body = Buffer.from('id=123&tr_id=TR-TEST&tr_amount=49.00', 'utf8');

  beforeAll(() => {
    fixtureDir = mkdtempSync(join(tmpdir(), 'tpay-jws-test-'));
    const path = (name: string) => join(fixtureDir, name);
    const run = (...args: string[]) => execFileSync('openssl', args, { stdio: 'ignore' });

    run('req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2',
      '-subj', '/CN=Local Test Root', '-addext', 'basicConstraints=critical,CA:TRUE',
      '-keyout', path('root.key'), '-out', path('root.pem'));
    run('req', '-newkey', 'rsa:2048', '-nodes', '-subj', '/CN=Local Test Signer',
      '-keyout', path('signer.key'), '-out', path('signer.csr'));
    writeFileSync(path('signer.ext'), 'basicConstraints=critical,CA:FALSE\nkeyUsage=digitalSignature\n');
    run('x509', '-req', '-in', path('signer.csr'), '-CA', path('root.pem'),
      '-CAkey', path('root.key'), '-CAcreateserial', '-days', '2',
      '-extfile', path('signer.ext'), '-out', path('signer.pem'));
    run('req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2',
      '-subj', '/CN=Other Local Root', '-addext', 'basicConstraints=critical,CA:TRUE',
      '-keyout', path('other.key'), '-out', path('other.pem'));

    signerKey = readFileSync(path('signer.key'), 'utf8');
    signingCertificate = readFileSync(path('signer.pem'), 'utf8');
    trustedCa = readFileSync(path('root.pem'), 'utf8');
    otherCa = readFileSync(path('other.pem'), 'utf8');
  });

  afterAll(() => {
    if (fixtureDir) rmSync(fixtureDir, { recursive: true, force: true });
  });

  const sign = (
    payload: Buffer,
    header: Record<string, unknown> = { alg: 'RS256', x5u: TPAY_JWS_CERT_URL },
  ) => {
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const signingInput = `${encodedHeader}.${payload.toString('base64url')}`;
    const signer = createSign('RSA-SHA256');
    signer.update(signingInput, 'ascii');
    signer.end();
    return `${encodedHeader}..${signer.sign(signerKey).toString('base64url')}`;
  };

  const verifier = (ca = trustedCa) =>
    new TpayJwsVerifier(async () => ({ signingCertificate, trustedCa: ca }));

  it('accepts a valid detached RS256 signature over the exact raw body', async () => {
    expect(await verifier().verify(sign(body), body)).toBe(true);
  });

  it('rejects an invalid signature and a changed raw body', async () => {
    const signed = sign(body);
    const [header] = signed.split('.');
    expect(await verifier().verify(`${header}..${Buffer.alloc(256).toString('base64url')}`, body)).toBe(false);
    expect(await verifier().verify(signed, Buffer.from('id=123&tr_id=TR-TEST&tr_amount=49.01'))).toBe(false);
    expect(await verifier().verify(signed, Buffer.from('tr_id=TR-TEST&id=123&tr_amount=49.00'))).toBe(false);
  });

  it('rejects a signer not trusted by the selected CA', async () => {
    expect(await verifier(otherCa).verify(sign(body), body)).toBe(false);
  });

  it('rejects disallowed x5u URLs without consulting the certificate source', async () => {
    const source = jest.fn(async () => ({ signingCertificate, trustedCa }));
    const check = new TpayJwsVerifier(source);
    for (const x5u of [
      'https://secure.tpay.com.evil.example/x509/notifications-jws.pem',
      'http://secure.tpay.com/x509/notifications-jws.pem',
      'https://secure.tpay.com/redirect',
    ]) {
      expect(await check.verify(sign(body, { alg: 'RS256', x5u }), body)).toBe(false);
    }
    expect(source).not.toHaveBeenCalled();
  });

  it('rejects unsupported algorithms and critical header changes', async () => {
    expect(await verifier().verify(sign(body, { alg: 'HS256', x5u: TPAY_JWS_CERT_URL }), body)).toBe(false);
    expect(await verifier().verify(sign(body, { alg: 'none', x5u: TPAY_JWS_CERT_URL }), body)).toBe(false);
    expect(await verifier().verify(sign(body, { alg: 'RS256', x5u: TPAY_JWS_CERT_URL, b64: false }), body)).toBe(false);
  });

  it('rejects missing or malformed signature data', async () => {
    const check = verifier();
    expect(await check.verify(undefined, body)).toBe(false);
    expect(await check.verify(sign(body), undefined)).toBe(false);
    expect(await check.verify('invalid', body)).toBe(false);
    expect(await check.verify(`${Buffer.from('{}').toString('base64url')}..`, body)).toBe(false);
    expect(await check.verify(sign(body).replace('..', '.embedded.'), body)).toBe(false);
  });

  it('loads only fixed Tpay certificate URLs and caches them', async () => {
    const fetcher = jest.fn(async (url: string) =>
      new Response(url === TPAY_JWS_CERT_URL ? signingCertificate : trustedCa, { status: 200 }));
    const source = createTpayJwsCertificateSource(fetcher as unknown as typeof fetch);
    await source();
    await source();
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([TPAY_JWS_CERT_URL, TPAY_JWS_CA_URL]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
