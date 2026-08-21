import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('listing quality details migration regression', () => {
  it('adds listing_details as a constrained jsonb object', () => {
    const migration = readFileSync(
      join(
        __dirname,
        '../../migrations/20260821_listing_quality_details.sql',
      ),
      'utf8',
    );

    expect(migration).toContain('ADD COLUMN IF NOT EXISTS listing_details jsonb');
    expect(migration).toContain('chk_listings_listing_details_object');
    expect(migration).toContain("jsonb_typeof(listing_details) = 'object'");
  });
});
