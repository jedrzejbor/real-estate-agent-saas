CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider varchar(50) NOT NULL,
  event_id varchar(255) NOT NULL,
  event_type varchar(80) NOT NULL,
  status varchar(40) NOT NULL,
  agency_id uuid NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_billing_webhook_events_provider_event UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_webhook_events_agency_processed
  ON billing_webhook_events (agency_id, processed_at DESC);
