-- Manual listing-level pricing adjustments for admin support operations.
-- Safe to run more than once on PostgreSQL.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS listing_manual_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  label varchar(160) NOT NULL,
  reason text NOT NULL,
  discount_type listing_promotion_discount_type_enum NOT NULL,
  discount_value int NOT NULL,
  max_discount_gross_amount int,
  target_scope listing_promotion_target_scope_enum NOT NULL DEFAULT 'all_products',
  target_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  archived_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  archived_reason text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_listing_manual_adjustments_label
    CHECK (length(trim(label)) > 0),
  CONSTRAINT chk_listing_manual_adjustments_reason
    CHECK (length(trim(reason)) >= 3),
  CONSTRAINT chk_listing_manual_adjustments_discount_value
    CHECK (
      (discount_type = 'percentage' AND discount_value BETWEEN 1 AND 10000)
      OR (discount_type = 'fixed_gross' AND discount_value > 0)
    ),
  CONSTRAINT chk_listing_manual_adjustments_max_discount
    CHECK (max_discount_gross_amount IS NULL OR max_discount_gross_amount > 0),
  CONSTRAINT chk_listing_manual_adjustments_period
    CHECK (starts_at < ends_at),
  CONSTRAINT chk_listing_manual_adjustments_target_rules_object
    CHECK (jsonb_typeof(target_rules) = 'object'),
  CONSTRAINT chk_listing_manual_adjustments_archived_state
    CHECK (
      (archived_at IS NULL AND archived_by_user_id IS NULL AND archived_reason IS NULL)
      OR (archived_at IS NOT NULL AND archived_reason IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_listing_manual_adjustments_listing_period
  ON listing_manual_adjustments (listing_id, starts_at, ends_at)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_listing_manual_adjustments_archived_at
  ON listing_manual_adjustments (archived_at);

COMMIT;
