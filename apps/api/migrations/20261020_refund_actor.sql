-- PAY-032: retain the explicitly authorized actor on each refund intent.
BEGIN;

ALTER TABLE refunds
  ADD COLUMN IF NOT EXISTS requested_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_refunds_requested_by_created
  ON refunds(requested_by_user_id, created_at);

COMMIT;
