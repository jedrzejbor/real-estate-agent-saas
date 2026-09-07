import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('listing payment reconciliation migration', () => {
  const migration = readFileSync(
    join(
      __dirname,
      '../../migrations/20260907_listing_payment_reconciliation.sql',
    ),
    'utf8',
  );

  it('adds a partial index for bounded paid-order reconciliation', () => {
    expect(migration).toContain(
      'CREATE INDEX IF NOT EXISTS idx_listing_orders_paid_reconciliation',
    );
    expect(migration).toContain("WHERE status = 'paid'");
  });
});
