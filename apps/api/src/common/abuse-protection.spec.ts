import { createHash } from 'crypto';
import type { Request } from 'express';
import { getRequestFingerprint } from './abuse-protection';

describe('getRequestFingerprint', () => {
  it('uses the Express-resolved IP instead of an untrusted forwarded header', () => {
    const request = {
      ip: '203.0.113.10',
      get: (name: string) =>
        name.toLowerCase() === 'x-forwarded-for'
          ? '198.51.100.42'
          : undefined,
    } as unknown as Request;

    expect(getRequestFingerprint(request).ipHash).toBe(
      createHash('sha256').update('203.0.113.10').digest('hex'),
    );
  });
});
