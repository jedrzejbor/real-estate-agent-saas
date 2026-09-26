import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('listing payment attempts migration', () => {
  const migration = readFileSync(
    resolve(
      __dirname,
      '../../migrations/20260907_listing_payment_attempts.sql',
    ),
    'utf8',
  );

  it('creates durable attempt history with provider uniqueness and expiry lookup', () => {
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS listing_payment_attempts',
    );
    expect(migration).toContain('UNIQUE (order_id, attempt_number)');
    expect(migration).toContain(
      'uq_listing_payment_attempts_provider_session',
    );
    expect(migration).toContain(
      'idx_listing_payment_attempts_open_expiry',
    );
    expect(migration).toContain(
      'REFERENCES listing_orders(id) ON DELETE CASCADE',
    );
  });

  it('backfills legacy provider sessions without overwriting attempts', () => {
    expect(migration).toContain('INSERT INTO listing_payment_attempts');
    expect(migration).toContain('FROM listing_orders');
    expect(migration).toContain('ON CONFLICT DO NOTHING');
  });
});
