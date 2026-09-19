BEGIN;

CREATE TABLE IF NOT EXISTS listing_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider varchar(50) NOT NULL,
  event_id varchar(255) NOT NULL,
  event_type varchar(80) NOT NULL,
  status varchar(40) NOT NULL,
  order_id uuid REFERENCES listing_orders(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  occurred_at timestamptz NOT NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_listing_payment_events_provider_event
    UNIQUE (provider, event_id),
  CONSTRAINT chk_listing_payment_events_type
    CHECK (event_type IN ('payment_succeeded', 'payment_failed', 'checkout_expired')),
  CONSTRAINT chk_listing_payment_events_status
    CHECK (status IN ('processed', 'failed')),
  CONSTRAINT chk_listing_payment_events_payload_object
    CHECK (jsonb_typeof(payload) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_listing_payment_events_order_created
  ON listing_payment_events (order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_payment_events_failed
  ON listing_payment_events (updated_at DESC)
  WHERE status = 'failed';

COMMIT;
