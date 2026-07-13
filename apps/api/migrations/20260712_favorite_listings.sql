CREATE TABLE IF NOT EXISTS favorite_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE favorite_listings
  DROP CONSTRAINT IF EXISTS uq_favorite_listings_user_listing;

ALTER TABLE favorite_listings
  ADD CONSTRAINT uq_favorite_listings_user_listing
  UNIQUE (user_id, listing_id);

CREATE INDEX IF NOT EXISTS idx_favorite_listings_user_created
  ON favorite_listings (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_favorite_listings_listing_id
  ON favorite_listings (listing_id);
