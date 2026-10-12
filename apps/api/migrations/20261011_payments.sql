-- Provider-neutral payment ledger. No Stripe backfill or provider API calls.
-- Forward-only migration; safe to re-run on PostgreSQL.

BEGIN;

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind varchar(32) NOT NULL,
  order_id uuid REFERENCES listing_orders(id) ON DELETE RESTRICT,
  quote_id uuid REFERENCES agency_plan_quotes(id) ON DELETE RESTRICT,
  renewal_id uuid,
  buyer_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  agency_id uuid REFERENCES agencies(id) ON DELETE RESTRICT,
  correlation_id uuid,
  amount_minor int NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'PLN',
  status varchar(32) NOT NULL,
  provider varchar(50) NOT NULL,
  provider_transaction_id varchar(255),
  provider_title varchar(255),
  attempt_no int NOT NULL DEFAULT 1,
  failure_code varchar(100),
  confirmed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_payments_kind CHECK (
    kind IN ('listing', 'subscription_initial', 'subscription_renewal')
  ),
  CONSTRAINT chk_payments_amount_positive CHECK (amount_minor > 0),
  CONSTRAINT chk_payments_currency CHECK (currency = 'PLN'),
  CONSTRAINT chk_payments_status CHECK (
    status IN (
      'created', 'pending', 'unknown', 'confirmed', 'failed', 'expired',
      'partially_refunded', 'refunded'
    )
  ),
  CONSTRAINT chk_payments_provider_nonempty CHECK (length(trim(provider)) > 0),
  CONSTRAINT chk_payments_attempt_positive CHECK (attempt_no > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_transaction
  ON payments (provider, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_order_created
  ON payments (order_id, created_at);

CREATE INDEX IF NOT EXISTS idx_payments_quote_created
  ON payments (quote_id, created_at);

CREATE INDEX IF NOT EXISTS idx_payments_renewal_created
  ON payments (renewal_id, created_at);

COMMIT;
