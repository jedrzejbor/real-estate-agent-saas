-- Indexes used by bounded payment reconciliation batches.
-- Safe to run more than once on PostgreSQL.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_listing_orders_paid_reconciliation
  ON listing_orders (paid_at, id)
  WHERE status = 'paid' AND paid_at IS NOT NULL;

COMMIT;
