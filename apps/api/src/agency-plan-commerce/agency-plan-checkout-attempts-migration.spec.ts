import { readFileSync } from 'fs';
import { join } from 'path';

const migration = readFileSync(
  join(process.cwd(), 'migrations', '20260917_agency_plan_checkout_attempts.sql'),
  'utf8',
);

describe('agency plan checkout attempts migration', () => {
  it('creates durable checkout attempts for agency plan quotes', () => {
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS agency_plan_checkout_attempts',
    );
    expect(migration).toContain(
      'quote_id uuid NOT NULL REFERENCES agency_plan_quotes(id)',
    );
    expect(migration).toContain(
      'CONSTRAINT uq_agency_plan_checkout_attempts_quote_number',
    );
  });

  it('keeps provider session and subscription references unique when present', () => {
    expect(migration).toContain(
      'uq_agency_plan_checkout_attempts_provider_session',
    );
    expect(migration).toContain(
      'WHERE provider_checkout_session_id IS NOT NULL',
    );
    expect(migration).toContain(
      'uq_agency_plan_checkout_attempts_provider_subscription',
    );
    expect(migration).toContain(
      'WHERE provider_subscription_id IS NOT NULL',
    );
  });

  it('indexes open attempts by expiry for reconciliation jobs', () => {
    expect(migration).toContain(
      'idx_agency_plan_checkout_attempts_open_expiry',
    );
    expect(migration).toContain("WHERE status IN ('creating', 'pending')");
  });
});
