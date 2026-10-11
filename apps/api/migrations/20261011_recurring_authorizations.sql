-- Provider references are stored only as authenticated ciphertext.
BEGIN;

CREATE TABLE IF NOT EXISTS recurring_authorizations (
  id uuid PRIMARY KEY,
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
  provider varchar(50) NOT NULL,
  provider_reference_type varchar(32) NOT NULL,
  provider_reference_ciphertext bytea NOT NULL,
  status varchar(20) NOT NULL,
  consented_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  last4 varchar(4),
  brand varchar(32),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_recurring_authorizations_provider CHECK (length(trim(provider)) > 0),
  CONSTRAINT chk_recurring_authorizations_type CHECK (
    provider_reference_type IN ('CARD_TOKEN', 'RECURRING_ALIAS')
  ),
  CONSTRAINT chk_recurring_authorizations_ciphertext CHECK (
    octet_length(provider_reference_ciphertext) >= 30
    AND get_byte(provider_reference_ciphertext, 0) = 1
  ),
  CONSTRAINT chk_recurring_authorizations_status CHECK (
    status IN ('pending', 'active', 'revoked', 'expired')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_recurring_authorizations_active_method
  ON recurring_authorizations (subscription_id, provider_reference_type)
  WHERE status = 'active';

COMMIT;
