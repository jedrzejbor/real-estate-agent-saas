-- Durable, provider-neutral receipt of verified notifications. No raw payload or tokens.
BEGIN;

CREATE TABLE IF NOT EXISTS payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider varchar(50) NOT NULL,
  event_key varchar(64) NOT NULL,
  event_type varchar(32) NOT NULL,
  provider_reference varchar(255) NOT NULL,
  provider_status varchar(32) NOT NULL,
  merchant_reference varchar(64) NOT NULL,
  correlation_reference varchar(255),
  payment_id uuid REFERENCES payments(id) ON DELETE RESTRICT,
  amount_minor int,
  paid_minor int,
  currency varchar(3),
  received_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_payment_events_nonempty CHECK (
    length(trim(provider)) > 0 AND length(trim(event_key)) > 0
    AND length(trim(event_type)) > 0 AND length(trim(provider_reference)) > 0
    AND length(trim(provider_status)) > 0 AND length(trim(merchant_reference)) > 0
  ),
  CONSTRAINT chk_payment_events_amounts CHECK (
    (amount_minor IS NULL OR amount_minor >= 0) AND
    (paid_minor IS NULL OR paid_minor >= 0)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_events_provider_key
  ON payment_events (provider, event_key);

CREATE INDEX IF NOT EXISTS idx_payment_events_payment_received
  ON payment_events (payment_id, received_at);

COMMIT;
