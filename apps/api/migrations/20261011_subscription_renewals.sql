-- A renewal is one amount due for one period; charge attempts remain separate.
BEGIN;

CREATE TABLE IF NOT EXISTS subscription_renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  amount_minor int NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'PLN',
  status varchar(20) NOT NULL DEFAULT 'due',
  next_retry_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_subscription_renewals_period CHECK (period_end > period_start),
  CONSTRAINT chk_subscription_renewals_amount CHECK (amount_minor > 0),
  CONSTRAINT chk_subscription_renewals_currency CHECK (currency = 'PLN'),
  CONSTRAINT chk_subscription_renewals_status CHECK (
    status IN ('due', 'charging', 'unknown', 'paid', 'failed')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscription_renewals_period
  ON subscription_renewals (subscription_id, period_start);

CREATE INDEX IF NOT EXISTS idx_subscription_renewals_next_retry
  ON subscription_renewals (next_retry_at);

CREATE TABLE IF NOT EXISTS subscription_renewal_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_id uuid NOT NULL REFERENCES subscription_renewals(id) ON DELETE RESTRICT,
  attempt_no int NOT NULL,
  status varchar(20) NOT NULL,
  payment_id uuid,
  provider_transaction_id varchar(255),
  failure_code varchar(100),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_subscription_renewal_attempt_no CHECK (attempt_no > 0),
  CONSTRAINT chk_subscription_renewal_attempt_status CHECK (
    status IN ('charging', 'unknown', 'paid', 'failed')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscription_renewal_attempt_number
  ON subscription_renewal_attempts (renewal_id, attempt_no);

-- Unknown outcomes retain this slot until reconciled; paid also bars another charge.
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscription_renewal_open_attempt
  ON subscription_renewal_attempts (renewal_id)
  WHERE status IN ('charging', 'unknown', 'paid');

COMMIT;
