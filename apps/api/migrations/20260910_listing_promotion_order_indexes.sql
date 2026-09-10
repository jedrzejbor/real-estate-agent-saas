-- Allow multiple promotion reservations/redemptions per listing order.
-- Individual reservation redemption remains idempotent by reservation_id.

BEGIN;

DROP INDEX IF EXISTS uq_listing_promotion_reservations_order;
ALTER TABLE listing_promotion_redemptions
  DROP CONSTRAINT IF EXISTS uq_listing_promotion_redemptions_order;

CREATE INDEX IF NOT EXISTS idx_listing_promotion_reservations_order
  ON listing_promotion_reservations (order_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listing_promotion_redemptions_order
  ON listing_promotion_redemptions (order_id);

COMMIT;
