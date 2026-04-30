-- Public listing submission email verification retry metadata.
-- Safe to run more than once on PostgreSQL.

BEGIN;

ALTER TABLE public_listing_submissions
  ADD COLUMN IF NOT EXISTS verification_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_email_count int NOT NULL DEFAULT 0;

COMMIT;
