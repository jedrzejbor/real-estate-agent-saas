-- Transactional audit history for administrator-managed listing products.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'listing_product_change_action_enum'
  ) THEN
    CREATE TYPE listing_product_change_action_enum AS ENUM (
      'created',
      'updated',
      'archived',
      'restored'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS listing_product_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES listing_product_catalog(id) ON DELETE RESTRICT,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action listing_product_change_action_enum NOT NULL,
  changes jsonb NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_listing_product_changes_array
    CHECK (jsonb_typeof(changes) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_listing_product_changes_product_created
  ON listing_product_changes (product_id, created_at DESC);

COMMIT;
