BEGIN;
ALTER TABLE public_listing_submissions
  ADD COLUMN IF NOT EXISTS pending_claim_user_id uuid NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_public_listing_submissions_pending_claim_user'
      AND conrelid = 'public_listing_submissions'::regclass
  ) THEN
    ALTER TABLE public_listing_submissions
      ADD CONSTRAINT fk_public_listing_submissions_pending_claim_user
      FOREIGN KEY (pending_claim_user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_public_listing_submissions_pending_claim_user_id
  ON public_listing_submissions (pending_claim_user_id)
  WHERE pending_claim_user_id IS NOT NULL;
COMMIT;
