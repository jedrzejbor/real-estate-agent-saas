-- Durable payment attempts for safe checkout retries and late webhooks.
-- Safe to run more than once on PostgreSQL.

BEGIN;

CREATE TABLE IF NOT EXISTS listing_payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES listing_orders(id) ON DELETE CASCADE,
  attempt_number int NOT NULL,
  status varchar(40) NOT NULL,
  provider varchar(50) NOT NULL,
  amount_gross int NOT NULL,
  currency varchar(3) NOT NULL,
  provider_checkout_session_id varchar(255),
  provider_payment_id varchar(255),
  failure_code varchar(100),
  failure_message text,
  expires_at timestamptz NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_listing_payment_attempts_order_number
    UNIQUE (order_id, attempt_number),
  CONSTRAINT chk_listing_payment_attempts_number_positive
    CHECK (attempt_number > 0),
  CONSTRAINT chk_listing_payment_attempts_status
    CHECK (status IN (
      'creating', 'pending', 'succeeded', 'failed', 'expired', 'cancelled'
    )),
  CONSTRAINT chk_listing_payment_attempts_amount_positive
    CHECK (amount_gross > 0),
  CONSTRAINT chk_listing_payment_attempts_currency_uppercase
    CHECK (currency = upper(currency))
);

-- Compatibility backfill for sessions created before payment attempts were
-- introduced. It never overwrites a previously migrated or runtime attempt.
INSERT INTO listing_payment_attempts (
  order_id,
  attempt_number,
  status,
  provider,
  amount_gross,
  currency,
  provider_checkout_session_id,
  provider_payment_id,
  expires_at,
  started_at,
  completed_at
)
SELECT
  id,
  1,
  CASE
    WHEN status IN ('paid', 'partially_refunded', 'refunded') THEN 'succeeded'
    WHEN status = 'payment_failed' THEN 'failed'
    WHEN status = 'expired' THEN 'expired'
    WHEN status = 'cancelled' THEN 'cancelled'
    ELSE 'pending'
  END,
  provider,
  total_gross_amount,
  currency,
  provider_checkout_session_id,
  provider_payment_id,
  quote_expires_at,
  created_at,
  COALESCE(paid_at, cancelled_at, refunded_at)
FROM listing_orders
WHERE total_gross_amount > 0
  AND provider IS NOT NULL
  AND provider_checkout_session_id IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS uq_listing_payment_attempts_provider_session
  ON listing_payment_attempts (provider, provider_checkout_session_id)
  WHERE provider_checkout_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_listing_payment_attempts_provider_payment
  ON listing_payment_attempts (provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listing_payment_attempts_order_created
  ON listing_payment_attempts (order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_payment_attempts_open_expiry
  ON listing_payment_attempts (expires_at)
  WHERE status IN ('creating', 'pending');

COMMIT;
