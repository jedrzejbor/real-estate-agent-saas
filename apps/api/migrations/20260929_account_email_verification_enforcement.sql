-- Transitional rollout marker. Existing accounts retain access until their
-- mailbox verification is scheduled explicitly; new enforced accounts do not.
BEGIN;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verification_required_at timestamptz NULL;
COMMIT;
