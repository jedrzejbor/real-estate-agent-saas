-- Freemium public listings + activation analytics
-- Safe to run more than once on PostgreSQL.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'listings_publicationstatus_enum'
  ) THEN
    CREATE TYPE listings_publicationstatus_enum AS ENUM (
      'draft',
      'published',
      'unpublished'
    );
  END IF;
END $$;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS "publicSlug" varchar(160),
  ADD COLUMN IF NOT EXISTS "publicationStatus" listings_publicationstatus_enum NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS "publicTitle" varchar(255),
  ADD COLUMN IF NOT EXISTS "publicDescription" text,
  ADD COLUMN IF NOT EXISTS "seoTitle" varchar(70),
  ADD COLUMN IF NOT EXISTS "seoDescription" varchar(180),
  ADD COLUMN IF NOT EXISTS "shareImageUrl" varchar(500),
  ADD COLUMN IF NOT EXISTS "showPriceOnPublicPage" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "showExactAddressOnPublicPage" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "estateflowBrandingEnabled" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "unpublishedAt" timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_listings_publicSlug_unique"
  ON listings ("publicSlug")
  WHERE "publicSlug" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "IDX_listings_publicationStatus"
  ON listings ("publicationStatus");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'activity_logs_action_enum'
  ) THEN
    ALTER TYPE activity_logs_action_enum ADD VALUE IF NOT EXISTS 'published';
    ALTER TYPE activity_logs_action_enum ADD VALUE IF NOT EXISTS 'unpublished';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  user_id uuid NOT NULL,
  agent_id uuid,
  agency_id uuid,
  plan_code varchar(50),
  path varchar(500),
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_analytics_events_agency_name_created"
  ON analytics_events (agency_id, name, "createdAt");

CREATE INDEX IF NOT EXISTS "IDX_analytics_events_user_name_created"
  ON analytics_events (user_id, name, "createdAt");

COMMIT;
