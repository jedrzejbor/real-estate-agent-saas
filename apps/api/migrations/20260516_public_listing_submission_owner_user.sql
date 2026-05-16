ALTER TABLE public_listing_submissions
  ADD COLUMN IF NOT EXISTS owner_user_id uuid NULL;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS owner_user_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_public_listing_submissions_owner_user_id
  ON public_listing_submissions(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_listings_owner_user_id
  ON listings(owner_user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_public_listing_submissions_owner_user'
  ) THEN
    ALTER TABLE public_listing_submissions
      ADD CONSTRAINT fk_public_listing_submissions_owner_user
      FOREIGN KEY (owner_user_id)
      REFERENCES users(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_listings_owner_user'
  ) THEN
    ALTER TABLE listings
      ADD CONSTRAINT fk_listings_owner_user
      FOREIGN KEY (owner_user_id)
      REFERENCES users(id)
      ON DELETE SET NULL;
  END IF;
END $$;
