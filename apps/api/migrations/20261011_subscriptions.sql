-- Local billing state; existing agency entitlements and Stripe data are untouched.
BEGIN;

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE RESTRICT,
  plan_code varchar(50) NOT NULL,
  price_amount_minor int NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'PLN',
  billing_interval varchar(20) NOT NULL DEFAULT 'monthly',
  status varchar(20) NOT NULL,
  current_period_start timestamptz,
  current_period_end timestamptz,
  next_billing_at timestamptz,
  grace_ends_at timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  cancelled_at timestamptz,
  provider varchar(50),
  authorization_id uuid,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_subscriptions_price_positive CHECK (price_amount_minor > 0),
  CONSTRAINT chk_subscriptions_currency CHECK (currency = 'PLN'),
  CONSTRAINT chk_subscriptions_monthly CHECK (billing_interval = 'monthly'),
  CONSTRAINT chk_subscriptions_status CHECK (
    status IN ('pending', 'active', 'past_due', 'cancelled', 'expired')
  ),
  CONSTRAINT chk_subscriptions_period CHECK (
    (current_period_start IS NULL AND current_period_end IS NULL)
    OR (current_period_start IS NOT NULL AND current_period_end > current_period_start)
  ),
  CONSTRAINT chk_subscriptions_version_positive CHECK (version > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_agency_open
  ON subscriptions (agency_id)
  WHERE status IN ('active', 'past_due');

CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing
  ON subscriptions (next_billing_at);

COMMIT;
