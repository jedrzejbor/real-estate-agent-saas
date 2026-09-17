-- Agency plan promotion campaigns, quote snapshots and reservation/redemption foundation.
-- Safe to run more than once on PostgreSQL.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'agency_plan_promotion_status_enum'
  ) THEN
    CREATE TYPE agency_plan_promotion_status_enum AS ENUM (
      'draft',
      'active',
      'paused',
      'archived'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'agency_plan_promotion_discount_type_enum'
  ) THEN
    CREATE TYPE agency_plan_promotion_discount_type_enum AS ENUM (
      'percentage',
      'fixed_gross'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'agency_plan_promotion_target_scope_enum'
  ) THEN
    CREATE TYPE agency_plan_promotion_target_scope_enum AS ENUM (
      'all_plans',
      'plan_codes',
      'billing_intervals'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'agency_plan_promotion_application_timing_enum'
  ) THEN
    CREATE TYPE agency_plan_promotion_application_timing_enum AS ENUM (
      'initial_checkout',
      'next_invoice',
      'future_invoices'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'agency_plan_promotion_reservation_status_enum'
  ) THEN
    CREATE TYPE agency_plan_promotion_reservation_status_enum AS ENUM (
      'reserved',
      'applied',
      'released',
      'expired'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'agency_plan_billing_interval_enum'
  ) THEN
    CREATE TYPE agency_plan_billing_interval_enum AS ENUM (
      'monthly',
      'yearly'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'agency_plan_quote_status_enum'
  ) THEN
    CREATE TYPE agency_plan_quote_status_enum AS ENUM (
      'quoted',
      'reserved',
      'applied',
      'expired',
      'cancelled'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS agency_plan_promotion_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) NOT NULL,
  name varchar(160) NOT NULL,
  description text,
  status agency_plan_promotion_status_enum NOT NULL DEFAULT 'draft',
  discount_type agency_plan_promotion_discount_type_enum NOT NULL,
  discount_value int NOT NULL,
  max_discount_gross_amount int,
  target_scope agency_plan_promotion_target_scope_enum NOT NULL DEFAULT 'all_plans',
  target_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration_billing_cycles int NOT NULL DEFAULT 1,
  application_timing agency_plan_promotion_application_timing_enum NOT NULL DEFAULT 'initial_checkout',
  is_automatic boolean NOT NULL DEFAULT false,
  is_combinable boolean NOT NULL DEFAULT false,
  usage_limit_total int,
  usage_limit_per_account int,
  usage_count int NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_agency_plan_promotion_campaigns_code UNIQUE (code),
  CONSTRAINT chk_agency_plan_promotion_campaign_discount_value
    CHECK (
      (discount_type = 'percentage' AND discount_value BETWEEN 1 AND 10000)
      OR (discount_type = 'fixed_gross' AND discount_value > 0)
    ),
  CONSTRAINT chk_agency_plan_promotion_campaign_max_discount
    CHECK (max_discount_gross_amount IS NULL OR max_discount_gross_amount > 0),
  CONSTRAINT chk_agency_plan_promotion_campaign_duration
    CHECK (duration_billing_cycles > 0),
  CONSTRAINT chk_agency_plan_promotion_campaign_usage_total
    CHECK (usage_limit_total IS NULL OR usage_limit_total > 0),
  CONSTRAINT chk_agency_plan_promotion_campaign_usage_per_account
    CHECK (usage_limit_per_account IS NULL OR usage_limit_per_account > 0),
  CONSTRAINT chk_agency_plan_promotion_campaign_usage_count
    CHECK (
      usage_count >= 0
      AND (usage_limit_total IS NULL OR usage_count <= usage_limit_total)
    ),
  CONSTRAINT chk_agency_plan_promotion_campaign_period
    CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at),
  CONSTRAINT chk_agency_plan_promotion_campaign_target_rules_object
    CHECK (jsonb_typeof(target_rules) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_agency_plan_promotion_campaigns_status_period
  ON agency_plan_promotion_campaigns (status, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_agency_plan_promotion_campaigns_target_status
  ON agency_plan_promotion_campaigns (target_scope, status);

CREATE TABLE IF NOT EXISTS agency_plan_promotion_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES agency_plan_promotion_campaigns(id) ON DELETE CASCADE,
  code_hash varchar(64) NOT NULL,
  code_last4 varchar(12),
  label varchar(160) NOT NULL,
  status agency_plan_promotion_status_enum NOT NULL DEFAULT 'active',
  discount_type agency_plan_promotion_discount_type_enum,
  discount_value int,
  max_discount_gross_amount int,
  duration_billing_cycles int,
  application_timing agency_plan_promotion_application_timing_enum,
  is_combinable boolean,
  usage_limit_total int,
  usage_limit_per_account int,
  usage_count int NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_agency_plan_promotion_codes_hash UNIQUE (code_hash),
  CONSTRAINT chk_agency_plan_promotion_codes_hash_format
    CHECK (code_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT chk_agency_plan_promotion_codes_discount_pair
    CHECK (
      (discount_type IS NULL AND discount_value IS NULL)
      OR (discount_type IS NOT NULL AND discount_value IS NOT NULL)
    ),
  CONSTRAINT chk_agency_plan_promotion_codes_discount_value
    CHECK (
      discount_type IS NULL
      OR (discount_type = 'percentage' AND discount_value BETWEEN 1 AND 10000)
      OR (discount_type = 'fixed_gross' AND discount_value > 0)
    ),
  CONSTRAINT chk_agency_plan_promotion_codes_max_discount
    CHECK (max_discount_gross_amount IS NULL OR max_discount_gross_amount > 0),
  CONSTRAINT chk_agency_plan_promotion_codes_duration
    CHECK (duration_billing_cycles IS NULL OR duration_billing_cycles > 0),
  CONSTRAINT chk_agency_plan_promotion_codes_usage_total
    CHECK (usage_limit_total IS NULL OR usage_limit_total > 0),
  CONSTRAINT chk_agency_plan_promotion_codes_usage_per_account
    CHECK (usage_limit_per_account IS NULL OR usage_limit_per_account > 0),
  CONSTRAINT chk_agency_plan_promotion_codes_usage_count
    CHECK (
      usage_count >= 0
      AND (usage_limit_total IS NULL OR usage_count <= usage_limit_total)
    ),
  CONSTRAINT chk_agency_plan_promotion_codes_period
    CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at)
);

CREATE INDEX IF NOT EXISTS idx_agency_plan_promotion_codes_campaign_status
  ON agency_plan_promotion_codes (campaign_id, status);

CREATE INDEX IF NOT EXISTS idx_agency_plan_promotion_codes_status_period
  ON agency_plan_promotion_codes (status, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS agency_plan_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL,
  plan_code varchar(50) NOT NULL REFERENCES plan_catalog(code) ON DELETE RESTRICT,
  billing_interval agency_plan_billing_interval_enum NOT NULL,
  status agency_plan_quote_status_enum NOT NULL DEFAULT 'quoted',
  currency varchar(3) NOT NULL DEFAULT 'PLN',
  subtotal_gross_amount int NOT NULL,
  discount_gross_amount int NOT NULL DEFAULT 0,
  total_gross_amount int NOT NULL,
  pricing_snapshot jsonb NOT NULL,
  quoted_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_agency_plan_quotes_currency CHECK (currency = 'PLN'),
  CONSTRAINT chk_agency_plan_quotes_amounts
    CHECK (
      subtotal_gross_amount >= 0
      AND discount_gross_amount >= 0
      AND total_gross_amount >= 0
      AND discount_gross_amount <= subtotal_gross_amount
      AND total_gross_amount = subtotal_gross_amount - discount_gross_amount
    ),
  CONSTRAINT chk_agency_plan_quotes_pricing_snapshot_object
    CHECK (jsonb_typeof(pricing_snapshot) = 'object'),
  CONSTRAINT chk_agency_plan_quotes_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT chk_agency_plan_quotes_period CHECK (quoted_at < expires_at)
);

CREATE INDEX IF NOT EXISTS idx_agency_plan_quotes_agency_created
  ON agency_plan_quotes (agency_id, created_at);

CREATE INDEX IF NOT EXISTS idx_agency_plan_quotes_user_created
  ON agency_plan_quotes (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_agency_plan_quotes_status_expires
  ON agency_plan_quotes (status, expires_at);

CREATE TABLE IF NOT EXISTS agency_plan_promotion_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES agency_plan_quotes(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES agency_plan_promotion_campaigns(id) ON DELETE RESTRICT,
  code_id uuid REFERENCES agency_plan_promotion_codes(id) ON DELETE RESTRICT,
  agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL,
  status agency_plan_promotion_reservation_status_enum NOT NULL DEFAULT 'reserved',
  discount_gross_amount int NOT NULL,
  duration_billing_cycles int NOT NULL,
  application_timing agency_plan_promotion_application_timing_enum NOT NULL,
  reserved_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  applied_at timestamptz,
  released_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_agency_plan_promotion_reservation_amount
    CHECK (discount_gross_amount > 0),
  CONSTRAINT chk_agency_plan_promotion_reservation_duration
    CHECK (duration_billing_cycles > 0),
  CONSTRAINT chk_agency_plan_promotion_reservation_period
    CHECK (reserved_at < expires_at),
  CONSTRAINT chk_agency_plan_promotion_reservation_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_agency_plan_promotion_reservations_quote_status
  ON agency_plan_promotion_reservations (quote_id, status);

CREATE INDEX IF NOT EXISTS idx_agency_plan_promotion_reservations_campaign_status
  ON agency_plan_promotion_reservations (campaign_id, status);

CREATE INDEX IF NOT EXISTS idx_agency_plan_promotion_reservations_code_status
  ON agency_plan_promotion_reservations (code_id, status);

CREATE INDEX IF NOT EXISTS idx_agency_plan_promotion_reservations_status_expires
  ON agency_plan_promotion_reservations (status, expires_at);

CREATE TABLE IF NOT EXISTS agency_plan_promotion_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL,
  quote_id uuid REFERENCES agency_plan_quotes(id) ON DELETE SET NULL,
  campaign_id uuid NOT NULL REFERENCES agency_plan_promotion_campaigns(id) ON DELETE RESTRICT,
  code_id uuid REFERENCES agency_plan_promotion_codes(id) ON DELETE RESTRICT,
  reservation_id uuid REFERENCES agency_plan_promotion_reservations(id) ON DELETE SET NULL,
  plan_code varchar(50) NOT NULL,
  billing_interval agency_plan_billing_interval_enum NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'PLN',
  subtotal_gross_amount int NOT NULL,
  discount_gross_amount int NOT NULL,
  total_gross_amount int NOT NULL,
  duration_billing_cycles int NOT NULL,
  application_timing agency_plan_promotion_application_timing_enum NOT NULL,
  source_type varchar(32) NOT NULL,
  pricing_snapshot jsonb NOT NULL,
  billing_event_id varchar(255),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_agency_plan_promotion_redemptions_reservation UNIQUE (reservation_id),
  CONSTRAINT chk_agency_plan_promotion_redemption_currency CHECK (currency = 'PLN'),
  CONSTRAINT chk_agency_plan_promotion_redemption_source
    CHECK (source_type IN ('campaign', 'promotion_code', 'customer_benefit')),
  CONSTRAINT chk_agency_plan_promotion_redemption_amounts
    CHECK (
      subtotal_gross_amount >= 0
      AND discount_gross_amount > 0
      AND total_gross_amount >= 0
      AND discount_gross_amount <= subtotal_gross_amount
      AND total_gross_amount = subtotal_gross_amount - discount_gross_amount
    ),
  CONSTRAINT chk_agency_plan_promotion_redemption_duration
    CHECK (duration_billing_cycles > 0),
  CONSTRAINT chk_agency_plan_promotion_redemption_snapshot_object
    CHECK (jsonb_typeof(pricing_snapshot) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_agency_plan_promotion_redemptions_agency_created
  ON agency_plan_promotion_redemptions (agency_id, created_at);

CREATE INDEX IF NOT EXISTS idx_agency_plan_promotion_redemptions_campaign_created
  ON agency_plan_promotion_redemptions (campaign_id, created_at);

CREATE INDEX IF NOT EXISTS idx_agency_plan_promotion_redemptions_code_created
  ON agency_plan_promotion_redemptions (code_id, created_at);

COMMIT;
