BEGIN;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS listing_details jsonb;

ALTER TABLE listings
  DROP CONSTRAINT IF EXISTS chk_listings_listing_details_object;

ALTER TABLE listings
  ADD CONSTRAINT chk_listings_listing_details_object
    CHECK (
      listing_details IS NULL
      OR jsonb_typeof(listing_details) = 'object'
    );

COMMIT;
