-- One-off listing commerce foundation.
-- Safe to run more than once on PostgreSQL. Product seeds never overwrite
-- values edited by an administrator.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'listing_product_type_enum'
  ) THEN
    CREATE TYPE listing_product_type_enum AS ENUM (
      'publication',
      'renewal',
      'featured'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'listing_order_status_enum'
  ) THEN
    CREATE TYPE listing_order_status_enum AS ENUM (
      'draft',
      'pending_payment',
      'paid',
      'payment_failed',
      'expired',
      'cancelled',
      'partially_refunded',
      'refunded'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'listing_entitlement_type_enum'
  ) THEN
    CREATE TYPE listing_entitlement_type_enum AS ENUM (
      'publication',
      'featured'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'listing_entitlement_status_enum'
  ) THEN
    CREATE TYPE listing_entitlement_status_enum AS ENUM (
      'scheduled',
      'active',
      'expired',
      'revoked',
      'cancelled'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'listing_entitlement_source_enum'
  ) THEN
    CREATE TYPE listing_entitlement_source_enum AS ENUM (
      'order_item',
      'admin_grant',
      'migration'
    );
  END IF;
END $$;

ALTER TYPE public_listing_submissions_status_enum
  ADD VALUE IF NOT EXISTS 'in_review';

ALTER TYPE public_listing_submissions_status_enum
  ADD VALUE IF NOT EXISTS 'approved';

CREATE TABLE IF NOT EXISTS listing_product_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) NOT NULL,
  name varchar(160) NOT NULL,
  description text,
  type listing_product_type_enum NOT NULL,
  price_gross_amount int NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'PLN',
  vat_rate_basis_points int,
  duration_days int NOT NULL,
  featured_tier varchar(50),
  priority_weight int NOT NULL DEFAULT 0,
  fulfillment_parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  provider_price_reference varchar(255),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_listing_product_catalog_code UNIQUE (code),
  CONSTRAINT chk_listing_product_price_non_negative
    CHECK (price_gross_amount >= 0),
  CONSTRAINT chk_listing_product_vat_rate
    CHECK (vat_rate_basis_points IS NULL OR vat_rate_basis_points BETWEEN 0 AND 10000),
  CONSTRAINT chk_listing_product_duration_positive CHECK (duration_days > 0),
  CONSTRAINT chk_listing_product_priority_non_negative CHECK (priority_weight >= 0),
  CONSTRAINT chk_listing_product_sort_order_non_negative CHECK (sort_order >= 0),
  CONSTRAINT chk_listing_product_currency_uppercase
    CHECK (currency = upper(currency)),
  CONSTRAINT chk_listing_product_parameters_object
    CHECK (jsonb_typeof(fulfillment_parameters) = 'object'),
  CONSTRAINT chk_listing_product_featured_tier
    CHECK (
      (type = 'featured' AND featured_tier IS NOT NULL)
      OR (type <> 'featured' AND featured_tier IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_listing_product_catalog_public_sort
  ON listing_product_catalog (is_active, is_public, sort_order);

CREATE INDEX IF NOT EXISTS idx_listing_product_catalog_type
  ON listing_product_catalog (type);

CREATE TABLE IF NOT EXISTS listing_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number varchar(40) NOT NULL,
  idempotency_key varchar(120) NOT NULL,
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  buyer_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status listing_order_status_enum NOT NULL DEFAULT 'draft',
  currency varchar(3) NOT NULL DEFAULT 'PLN',
  subtotal_gross_amount int NOT NULL,
  discount_gross_amount int NOT NULL DEFAULT 0,
  total_gross_amount int NOT NULL,
  vat_gross_amount int,
  buyer_snapshot jsonb NOT NULL,
  pricing_snapshot jsonb NOT NULL,
  quote_expires_at timestamptz NOT NULL,
  provider varchar(50),
  provider_checkout_session_id varchar(255),
  provider_payment_id varchar(255),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  paid_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_listing_orders_order_number UNIQUE (order_number),
  CONSTRAINT uq_listing_orders_idempotency_key UNIQUE (idempotency_key),
  CONSTRAINT chk_listing_orders_subtotal_non_negative
    CHECK (subtotal_gross_amount >= 0),
  CONSTRAINT chk_listing_orders_discount_range
    CHECK (discount_gross_amount BETWEEN 0 AND subtotal_gross_amount),
  CONSTRAINT chk_listing_orders_total_matches
    CHECK (total_gross_amount = subtotal_gross_amount - discount_gross_amount),
  CONSTRAINT chk_listing_orders_vat_range
    CHECK (vat_gross_amount IS NULL OR vat_gross_amount BETWEEN 0 AND total_gross_amount),
  CONSTRAINT chk_listing_orders_currency_uppercase
    CHECK (currency = upper(currency)),
  CONSTRAINT chk_listing_orders_buyer_snapshot_object
    CHECK (jsonb_typeof(buyer_snapshot) = 'object'),
  CONSTRAINT chk_listing_orders_pricing_snapshot_object
    CHECK (jsonb_typeof(pricing_snapshot) = 'object'),
  CONSTRAINT chk_listing_orders_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_listing_orders_provider_checkout_session
  ON listing_orders (provider, provider_checkout_session_id)
  WHERE provider IS NOT NULL AND provider_checkout_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_listing_orders_provider_payment
  ON listing_orders (provider, provider_payment_id)
  WHERE provider IS NOT NULL AND provider_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listing_orders_buyer_created
  ON listing_orders (buyer_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_orders_listing_created
  ON listing_orders (listing_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_orders_status_created
  ON listing_orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_orders_quote_expiry
  ON listing_orders (quote_expires_at)
  WHERE status IN ('draft', 'pending_payment');

CREATE TABLE IF NOT EXISTS listing_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES listing_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES listing_product_catalog(id) ON DELETE RESTRICT,
  product_code_snapshot varchar(80) NOT NULL,
  product_name_snapshot varchar(160) NOT NULL,
  product_type_snapshot listing_product_type_enum NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  unit_gross_amount int NOT NULL,
  subtotal_gross_amount int NOT NULL,
  discount_gross_amount int NOT NULL DEFAULT 0,
  total_gross_amount int NOT NULL,
  vat_rate_basis_points int,
  vat_gross_amount int,
  duration_days int NOT NULL,
  fulfillment_parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_listing_order_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT chk_listing_order_items_unit_non_negative CHECK (unit_gross_amount >= 0),
  CONSTRAINT chk_listing_order_items_subtotal_matches
    CHECK (subtotal_gross_amount = unit_gross_amount * quantity),
  CONSTRAINT chk_listing_order_items_discount_range
    CHECK (discount_gross_amount BETWEEN 0 AND subtotal_gross_amount),
  CONSTRAINT chk_listing_order_items_total_matches
    CHECK (total_gross_amount = subtotal_gross_amount - discount_gross_amount),
  CONSTRAINT chk_listing_order_items_vat_rate
    CHECK (vat_rate_basis_points IS NULL OR vat_rate_basis_points BETWEEN 0 AND 10000),
  CONSTRAINT chk_listing_order_items_vat_range
    CHECK (vat_gross_amount IS NULL OR vat_gross_amount BETWEEN 0 AND total_gross_amount),
  CONSTRAINT chk_listing_order_items_duration_positive CHECK (duration_days > 0),
  CONSTRAINT chk_listing_order_items_parameters_object
    CHECK (jsonb_typeof(fulfillment_parameters) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_listing_order_items_order_created
  ON listing_order_items (order_id, created_at);

CREATE INDEX IF NOT EXISTS idx_listing_order_items_product
  ON listing_order_items (product_id);

CREATE TABLE IF NOT EXISTS listing_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  type listing_entitlement_type_enum NOT NULL,
  status listing_entitlement_status_enum NOT NULL DEFAULT 'scheduled',
  tier varchar(50),
  source_type listing_entitlement_source_enum NOT NULL,
  order_item_id uuid REFERENCES listing_order_items(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  granted_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  revoked_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  revoked_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_listing_entitlements_order_item UNIQUE (order_item_id),
  CONSTRAINT chk_listing_entitlements_period CHECK (ends_at > starts_at),
  CONSTRAINT chk_listing_entitlements_parameters_object
    CHECK (jsonb_typeof(parameters) = 'object'),
  CONSTRAINT chk_listing_entitlements_order_source
    CHECK (
      (source_type = 'order_item' AND order_item_id IS NOT NULL)
      OR (source_type <> 'order_item' AND order_item_id IS NULL)
    ),
  CONSTRAINT chk_listing_entitlements_featured_tier
    CHECK (
      (type = 'featured' AND tier IS NOT NULL)
      OR (type = 'publication' AND tier IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_listing_entitlements_listing_type_status_end
  ON listing_entitlements (listing_id, type, status, ends_at);

CREATE INDEX IF NOT EXISTS idx_listing_entitlements_status_end
  ON listing_entitlements (status, ends_at);

INSERT INTO listing_product_catalog (
  code,
  name,
  description,
  type,
  price_gross_amount,
  currency,
  vat_rate_basis_points,
  duration_days,
  featured_tier,
  priority_weight,
  fulfillment_parameters,
  is_public,
  is_active,
  sort_order
)
VALUES
  (
    'publication_60_days',
    'Publikacja ogłoszenia',
    'Publikacja prywatnego ogłoszenia na 60 dni.',
    'publication',
    4900,
    'PLN',
    NULL,
    60,
    NULL,
    0,
    '{"durationDays":60}'::jsonb,
    true,
    true,
    10
  ),
  (
    'renewal_60_days',
    'Odnowienie ogłoszenia',
    'Przedłużenie publikacji prywatnego ogłoszenia o 60 dni.',
    'renewal',
    3900,
    'PLN',
    NULL,
    60,
    NULL,
    0,
    '{"durationDays":60}'::jsonb,
    true,
    true,
    20
  ),
  (
    'featured_7_days',
    'Wyróżnienie ogłoszenia',
    'Wyróżnienie aktywnego ogłoszenia na 7 dni.',
    'featured',
    1900,
    'PLN',
    NULL,
    7,
    'standard',
    100,
    '{"durationDays":7,"featuredTier":"standard","priorityWeight":100}'::jsonb,
    true,
    true,
    30
  )
ON CONFLICT (code) DO NOTHING;

COMMIT;
