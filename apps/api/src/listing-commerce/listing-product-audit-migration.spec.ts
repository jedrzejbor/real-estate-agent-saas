import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('listing product audit migration', () => {
  const migration = readFileSync(
    join(
      __dirname,
      '../../migrations/20260907_listing_product_change_audit.sql',
    ),
    'utf8',
  );

  it('creates an append-only product change table with actor attribution', () => {
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS listing_product_changes',
    );
    expect(migration).toContain(
      'actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL',
    );
    expect(migration).toContain(
      'product_id uuid NOT NULL REFERENCES listing_product_catalog(id) ON DELETE RESTRICT',
    );
  });

  it('requires change entries to be stored as a JSON array', () => {
    expect(migration).toContain('chk_listing_product_changes_array');
    expect(migration).toContain("jsonb_typeof(changes) = 'array'");
  });
});
