import { readFileSync } from 'fs';
import { join } from 'path';

const migration = readFileSync(
  join(
    process.cwd(),
    'migrations',
    '20260916_agency_plan_promotions_foundation.sql',
  ),
  'utf8',
);

describe('agency plan promotions foundation migration', () => {
  it('creates campaign, code, quote, reservation and redemption tables', () => {
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS agency_plan_promotion_campaigns',
    );
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS agency_plan_promotion_codes',
    );
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS agency_plan_quotes');
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS agency_plan_promotion_reservations',
    );
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS agency_plan_promotion_redemptions',
    );
  });

  it('models multi-cycle discounts and existing-customer benefit timing', () => {
    expect(migration).toContain('duration_billing_cycles');
    expect(migration).toContain('agency_plan_promotion_application_timing_enum');
    expect(migration).toContain('initial_checkout');
    expect(migration).toContain('next_invoice');
    expect(migration).toContain('future_invoices');
  });

  it('stores promotion codes as hashes rather than plaintext', () => {
    const codesTableStart = migration.indexOf(
      'CREATE TABLE IF NOT EXISTS agency_plan_promotion_codes',
    );
    const reservationsTableStart = migration.indexOf(
      'CREATE TABLE IF NOT EXISTS agency_plan_quotes',
    );
    const codesTable = migration.slice(codesTableStart, reservationsTableStart);

    expect(codesTable).toContain('code_hash varchar(64) NOT NULL');
    expect(codesTable).toContain('code_last4 varchar(12)');
    expect(codesTable).not.toContain('plaintext');
    expect(codesTable).not.toContain('code varchar');
    expect(migration).toContain('chk_agency_plan_promotion_codes_hash_format');
  });

  it('keeps quote snapshots immutable and tied to plan catalog', () => {
    expect(migration).toContain(
      'plan_code varchar(50) NOT NULL REFERENCES plan_catalog(code)',
    );
    expect(migration).toContain('pricing_snapshot jsonb NOT NULL');
    expect(migration).toContain('chk_agency_plan_quotes_amounts');
    expect(migration).toContain('chk_agency_plan_quotes_period');
  });
});
