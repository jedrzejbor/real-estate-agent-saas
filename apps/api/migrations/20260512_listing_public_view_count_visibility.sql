ALTER TABLE listings
ADD COLUMN IF NOT EXISTS "showPublicViewCount" boolean NOT NULL DEFAULT false;
