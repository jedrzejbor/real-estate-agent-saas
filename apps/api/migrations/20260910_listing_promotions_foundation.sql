-- Listing promotion campaigns, promotion codes and atomic usage tracking.
-- Safe to run more than once on PostgreSQL.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'listing_promotion_campaign_status_enum'
  ) THEN
    CREATE TYPE listing_promotion_campaign_status_enum AS ENUM (
      'draft',
      'active',
      'paused',
      'archived'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'listing_promotion_discount_type_enum'
  ) THEN
    CREATE TYPE listing_promotion_discount_type_enum AS ENUM (
      'percentage',
      'fixed_gross'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'listing_promotion_target_scope_enum'
  ) THEN
    CREATE TYPE listing_promotion_target_scope_enum AS ENUM (
      'all_products',
      'product_types',
      'product_codes'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'listing_promotion_reservation_status_enum'
  ) THEN
    CREATE TYPE listing_promotion_reservation_status_enum AS ENUM (
      'reserved',
      'applied',
      'released',
      'expired'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS listing_promotion_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) NOT NULL,
  name varchar(160) NOT NULL,
  description text,
  status listing_promotion_campaign_status_enum NOT NULL DEFAULT 'draft',
  discount_type listing_promotion_discount_type_enum NOT NULL,
  discount_value int NOT NULL,
  max_discount_gross_amount int,
  target_scope listing_promotion_target_scope_enum NOT NULL DEFAULT 'all_products',
  target_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_automatic boolean NOT NULL DEFAULT false,
  is_combinable boolean NOT NULL DEFAULT false,
  usage_limit_total int,
  usage_limit_per_user int,
  usage_count int NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_listing_promotion_campaigns_code UNIQUE (code),
  CONSTRAINT chk_listing_promotion_campaign_discount_value
    CHECK (
      (discount_type = 'percentage' AND discount_value BETWEEN 1 AND 10000)
      OR (discount_type = 'fixed_gross' AND discount_value > 0)
    ),
  CONSTRAINT chk_listing_promotion_campaign_max_discount
    CHECK (max_discount_gross_amount IS NULL OR max_discount_gross_amount > 0),
  CONSTRAINT chk_listing_promotion_campaign_usage_total
    CHECK (usage_limit_total IS NULL OR usage_limit_total > 0),
  CONSTRAINT chk_listing_promotion_campaign_usage_per_user
    CHECK (usage_limit_per_user IS NULL OR usage_limit_per_user > 0),
  CONSTRAINT chk_listing_promotion_campaign_usage_count
    CHECK (
      usage_count >= 0
      AND (usage_limit_total IS NULL OR usage_count <= usage_limit_total)
    ),
  CONSTRAINT chk_listing_promotion_campaign_period
    CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at),
  CONSTRAINT chk_listing_promotion_campaign_target_rules_object
    CHECK (jsonb_typeof(target_rules) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_listing_promotion_campaigns_status_period
  ON listing_promotion_campaigns (status, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_listing_promotion_campaigns_target_status
  ON listing_promotion_campaigns (target_scope, status);

CREATE TABLE IF NOT EXISTS listing_promotion_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES listing_promotion_campaigns(id) ON DELETE CASCADE,
  code_hash varchar(64) NOT NULL,
  code_last4 varchar(12),
  label varchar(160) NOT NULL,
  status listing_promotion_campaign_status_enum NOT NULL DEFAULT 'active',
  discount_type listing_promotion_discount_type_enum,
  discount_value int,
  max_discount_gross_amount int,
  is_combinable boolean,
  usage_limit_total int,
  usage_limit_per_user int,
  usage_count int NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_listing_promotion_codes_hash UNIQUE (code_hash),
  CONSTRAINT chk_listing_promotion_codes_hash_format
    CHECK (code_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT chk_listing_promotion_codes_discount_pair
    CHECK (
      (discount_type IS NULL AND discount_value IS NULL)
      OR (discount_type IS NOT NULL AND discount_value IS NOT NULL)
    ),
  CONSTRAINT chk_listing_promotion_codes_discount_value
    CHECK (
      discount_type IS NULL
      OR (discount_type = 'percentage' AND discount_value BETWEEN 1 AND 10000)
      OR (discount_type = 'fixed_gross' AND discount_value > 0)
    ),
  CONSTRAINT chk_listing_promotion_codes_max_discount
    CHECK (max_discount_gross_amount IS NULL OR max_discount_gross_amount > 0),
  CONSTRAINT chk_listing_promotion_codes_usage_total
    CHECK (usage_limit_total IS NULL OR usage_limit_total > 0),
  CONSTRAINT chk_listing_promotion_codes_usage_per_user
    CHECK (usage_limit_per_user IS NULL OR usage_limit_per_user > 0),
  CONSTRAINT chk_listing_promotion_codes_usage_count
    CHECK (
      usage_count >= 0
      AND (usage_limit_total IS NULL OR usage_count <= usage_limit_total)
    ),
  CONSTRAINT chk_listing_promotion_codes_period
    CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at)
);

CREATE INDEX IF NOT EXISTS idx_listing_promotion_codes_campaign_status
  ON listing_promotion_codes (campaign_id, status);

CREATE INDEX IF NOT EXISTS idx_listing_promotion_codes_status_period
  ON listing_promotion_codes (status, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS listing_promotion_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES listing_promotion_campaigns(id) ON DELETE RESTRICT,
  code_id uuid REFERENCES listing_promotion_codes(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES listing_orders(id) ON DELETE SET NULL,
  buyer_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status listing_promotion_reservation_status_enum NOT NULL DEFAULT 'reserved',
  currency varchar(3) NOT NULL,
  discount_gross_amount int NOT NULL,
  pricing_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  reserved_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  released_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_listing_promotion_reservations_currency_uppercase
    CHECK (currency = upper(currency)),
  CONSTRAINT chk_listing_promotion_reservations_discount
    CHECK (discount_gross_amount > 0),
  CONSTRAINT chk_listing_promotion_reservations_snapshot_object
    CHECK (jsonb_typeof(pricing_snapshot) = 'object'),
  CONSTRAINT chk_listing_promotion_reservations_period
    CHECK (reserved_at < expires_at),
  CONSTRAINT chk_listing_promotion_reservations_released_state
    CHECK ((status = 'released') = (released_at IS NOT NULL)),
  CONSTRAINT chk_listing_promotion_reservations_applied_state
    CHECK ((status = 'applied') = (applied_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_listing_promotion_reservations_order
  ON listing_promotion_reservations (order_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listing_promotion_reservations_campaign_status
  ON listing_promotion_reservations (campaign_id, status);

CREATE INDEX IF NOT EXISTS idx_listing_promotion_reservations_code_status
  ON listing_promotion_reservations (code_id, status);

CREATE INDEX IF NOT EXISTS idx_listing_promotion_reservations_buyer_status
  ON listing_promotion_reservations (buyer_user_id, status);

CREATE INDEX IF NOT EXISTS idx_listing_promotion_reservations_expiry_status
  ON listing_promotion_reservations (expires_at, status);

CREATE TABLE IF NOT EXISTS listing_promotion_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES listing_promotion_campaigns(id) ON DELETE RESTRICT,
  code_id uuid REFERENCES listing_promotion_codes(id) ON DELETE RESTRICT,
  reservation_id uuid REFERENCES listing_promotion_reservations(id) ON DELETE SET NULL,
  order_id uuid NOT NULL REFERENCES listing_orders(id) ON DELETE RESTRICT,
  buyer_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  currency varchar(3) NOT NULL,
  discount_gross_amount int NOT NULL,
  pricing_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_listing_promotion_redemptions_currency_uppercase
    CHECK (currency = upper(currency)),
  CONSTRAINT chk_listing_promotion_redemptions_discount
    CHECK (discount_gross_amount > 0),
  CONSTRAINT chk_listing_promotion_redemptions_snapshot_object
    CHECK (jsonb_typeof(pricing_snapshot) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_listing_promotion_redemptions_reservation
  ON listing_promotion_redemptions (reservation_id)
  WHERE reservation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listing_promotion_redemptions_order
  ON listing_promotion_redemptions (order_id);

CREATE INDEX IF NOT EXISTS idx_listing_promotion_redemptions_campaign_created
  ON listing_promotion_redemptions (campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_promotion_redemptions_code_created
  ON listing_promotion_redemptions (code_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_promotion_redemptions_buyer_created
  ON listing_promotion_redemptions (buyer_user_id, created_at DESC);

COMMIT;
