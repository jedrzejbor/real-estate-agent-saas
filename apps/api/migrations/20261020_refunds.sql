-- Durable refund intents; no existing payment, order or entitlement data is rewritten.
BEGIN;

CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  intent_key varchar(128) NOT NULL,
  kind varchar(16) NOT NULL,
  amount_minor int NOT NULL,
  currency varchar(3) NOT NULL,
  provider varchar(50) NOT NULL,
  provider_transaction_id varchar(255) NOT NULL,
  provider_refund_id varchar(255),
  status varchar(20) NOT NULL,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_refunds_kind CHECK (kind IN ('full', 'partial')),
  CONSTRAINT chk_refunds_amount_positive CHECK (amount_minor > 0),
  CONSTRAINT chk_refunds_currency CHECK (currency = 'PLN'),
  CONSTRAINT chk_refunds_status CHECK (status IN ('requesting', 'unknown', 'pending', 'confirmed', 'failed')),
  CONSTRAINT chk_refunds_intent_nonempty CHECK (length(trim(intent_key)) > 0),
  CONSTRAINT chk_refunds_provider_nonempty CHECK (length(trim(provider)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_refunds_payment_intent ON refunds(payment_id, intent_key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_refunds_provider_reference
  ON refunds(provider, provider_refund_id) WHERE provider_refund_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_refunds_payment_status ON refunds(payment_id, status);

COMMIT;
