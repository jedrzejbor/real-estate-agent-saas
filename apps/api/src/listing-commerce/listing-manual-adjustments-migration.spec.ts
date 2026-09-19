import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('listing manual adjustments migration', () => {
  const migration = readFileSync(
    join(
      __dirname,
      '../../migrations/20260912_listing_manual_adjustments.sql',
    ),
    'utf8',
  );

  it('creates listing-scoped manual adjustments with audit fields', () => {
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS listing_manual_adjustments',
    );
    expect(migration).toContain(
      'listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE',
    );
    expect(migration).toContain('created_by_user_id uuid REFERENCES users(id)');
    expect(migration).toContain('archived_by_user_id uuid REFERENCES users(id)');
    expect(migration).toContain('archived_reason text');
  });

  it('enforces valid discounts, periods and archive audit state', () => {
    expect(migration).toContain('chk_listing_manual_adjustments_discount_value');
    expect(migration).toContain('chk_listing_manual_adjustments_period');
    expect(migration).toContain('chk_listing_manual_adjustments_archived_state');
    expect(migration).toContain(
      'idx_listing_manual_adjustments_listing_period',
    );
  });
});
