-- Plan downgrade grace-period tracking for limit enforcement.

BEGIN;

ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS limit_grace_started_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS limit_grace_ends_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS limit_grace_enforced_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_agencies_limit_grace_ends_at
  ON agencies(limit_grace_ends_at)
  WHERE limit_grace_ends_at IS NOT NULL;

COMMIT;
