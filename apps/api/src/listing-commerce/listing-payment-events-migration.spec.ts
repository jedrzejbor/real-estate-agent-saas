import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('listing payment events migration', () => {
  const migration = readFileSync(
    resolve(
      __dirname,
      '../../migrations/20260907_listing_payment_events.sql',
    ),
    'utf8',
  );

  it('persists unique provider events and failure audit data', () => {
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS listing_payment_events',
    );
    expect(migration).toContain(
      'UNIQUE (provider, event_id)',
    );
    expect(migration).toContain("WHERE status = 'failed'");
    expect(migration).toContain('REFERENCES listing_orders(id) ON DELETE SET NULL');
  });
});
