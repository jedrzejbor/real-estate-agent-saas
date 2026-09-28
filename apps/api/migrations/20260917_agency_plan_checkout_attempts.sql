-- Durable checkout attempts for agency plan subscription checkout.
-- Safe to run more than once on PostgreSQL.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'agency_plan_checkout_attempt_status_enum'
  ) THEN
    CREATE TYPE agency_plan_checkout_attempt_status_enum AS ENUM (
      'creating',
      'pending',
      'succeeded',
      'failed',
      'expired',
      'cancelled'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS agency_plan_checkout_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES agency_plan_quotes(id) ON DELETE CASCADE,
  attempt_number int NOT NULL,
  status agency_plan_checkout_attempt_status_enum NOT NULL DEFAULT 'creating',
  provider varchar(50) NOT NULL,
  amount_gross int NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'PLN',
  provider_checkout_session_id varchar(255),
  provider_subscription_id varchar(255),
  failure_code varchar(100),
  failure_message text,
  expires_at timestamptz NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_agency_plan_checkout_attempts_quote_number
    UNIQUE (quote_id, attempt_number),
  CONSTRAINT chk_agency_plan_checkout_attempts_amount
    CHECK (amount_gross >= 0),
  CONSTRAINT chk_agency_plan_checkout_attempts_currency
    CHECK (currency = 'PLN'),
  CONSTRAINT chk_agency_plan_checkout_attempts_period
    CHECK (started_at < expires_at),
  CONSTRAINT chk_agency_plan_checkout_attempts_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_agency_plan_checkout_attempts_quote_created
  ON agency_plan_checkout_attempts (quote_id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS uq_agency_plan_checkout_attempts_provider_session
  ON agency_plan_checkout_attempts (provider, provider_checkout_session_id)
  WHERE provider_checkout_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_agency_plan_checkout_attempts_provider_subscription
  ON agency_plan_checkout_attempts (provider, provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agency_plan_checkout_attempts_open_expiry
  ON agency_plan_checkout_attempts (status, expires_at)
  WHERE status IN ('creating', 'pending');

COMMIT;
