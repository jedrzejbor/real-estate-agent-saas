ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_listings_expires_at
  ON listings (expires_at);

ALTER TABLE public_listing_submissions
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_public_listing_submissions_expires_at
  ON public_listing_submissions (expires_at);
