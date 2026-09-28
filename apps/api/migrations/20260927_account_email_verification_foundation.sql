-- Account email verification foundation. This migration only adds state;
-- registration and authorization behavior changes in later rollout stages.
-- Existing accounts intentionally remain unverified until ownership is proven.

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS email_verification_token_hash varchar(64) NULL,
  ADD COLUMN IF NOT EXISTS email_verification_expires_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS email_verification_sent_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS email_verification_window_started_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS email_verification_send_count integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_verification_token_hash
  ON users (email_verification_token_hash)
  WHERE email_verification_token_hash IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_users_email_verification_token_state'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT chk_users_email_verification_token_state
      CHECK (
        (email_verification_token_hash IS NULL) =
        (email_verification_expires_at IS NULL)
        AND (email_verified_at IS NULL OR email_verification_token_hash IS NULL)
        AND (
          email_verification_token_hash IS NULL OR
          email_verification_token_hash ~ '^[0-9a-f]{64}$'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_users_email_verification_send_count'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT chk_users_email_verification_send_count
      CHECK (
        email_verification_send_count >= 0
        AND (
          email_verification_send_count = 0 OR
          email_verification_window_started_at IS NOT NULL
        )
      );
  END IF;
END $$;

COMMIT;
