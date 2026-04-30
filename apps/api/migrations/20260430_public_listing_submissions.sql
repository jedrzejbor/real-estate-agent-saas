-- Public listing submission model for accountless listing draft flow.
-- Safe to run more than once on PostgreSQL.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'public_listing_submissions_status_enum'
  ) THEN
    CREATE TYPE public_listing_submissions_status_enum AS ENUM (
      'draft',
      'pending_email_verification',
      'verified',
      'published',
      'claimed',
      'rejected',
      'expired'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'public_listing_submissions_source_enum'
  ) THEN
    CREATE TYPE public_listing_submissions_source_enum AS ENUM (
      'public_wizard',
      'embed',
      'partner',
      'other'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public_listing_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status public_listing_submissions_status_enum NOT NULL DEFAULT 'draft',
  source public_listing_submissions_source_enum NOT NULL DEFAULT 'public_wizard',
  owner_name varchar(255) NOT NULL,
  email varchar(255) NOT NULL,
  phone varchar(30) NOT NULL,
  agency_name varchar(255),
  contact_consent boolean NOT NULL DEFAULT false,
  terms_consent boolean NOT NULL DEFAULT false,
  marketing_consent boolean NOT NULL DEFAULT false,
  consent_text text,
  consented_at timestamptz,
  verification_token_hash varchar(128),
  claim_token_hash varchar(128),
  verification_expires_at timestamptz,
  verified_at timestamptz,
  published_at timestamptz,
  claimed_at timestamptz,
  rejected_at timestamptz,
  expired_at timestamptz,
  ip_hash varchar(128),
  user_agent varchar(500),
  payload jsonb NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_url varchar(500),
  referrer varchar(500),
  utm_source varchar(255),
  utm_medium varchar(255),
  utm_campaign varchar(255),
  published_listing_id uuid,
  claimed_agent_id uuid,
  claimed_agency_id uuid,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "FK_public_listing_submissions_published_listing"
    FOREIGN KEY (published_listing_id) REFERENCES listings(id) ON DELETE SET NULL,
  CONSTRAINT "FK_public_listing_submissions_claimed_agent"
    FOREIGN KEY (claimed_agent_id) REFERENCES agents(id) ON DELETE SET NULL,
  CONSTRAINT "FK_public_listing_submissions_claimed_agency"
    FOREIGN KEY (claimed_agency_id) REFERENCES agencies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IDX_public_listing_submissions_status"
  ON public_listing_submissions (status);

CREATE INDEX IF NOT EXISTS "IDX_public_listing_submissions_source"
  ON public_listing_submissions (source);

CREATE INDEX IF NOT EXISTS "IDX_public_listing_submissions_status_created"
  ON public_listing_submissions (status, "createdAt");

CREATE INDEX IF NOT EXISTS "IDX_public_listing_submissions_source_created"
  ON public_listing_submissions (source, "createdAt");

CREATE INDEX IF NOT EXISTS "IDX_public_listing_submissions_email_created"
  ON public_listing_submissions (email, "createdAt");

CREATE INDEX IF NOT EXISTS "IDX_public_listing_submissions_verification_token"
  ON public_listing_submissions (verification_token_hash);

CREATE INDEX IF NOT EXISTS "IDX_public_listing_submissions_claim_token"
  ON public_listing_submissions (claim_token_hash);

CREATE INDEX IF NOT EXISTS "IDX_public_listing_submissions_published_listing"
  ON public_listing_submissions (published_listing_id);

CREATE INDEX IF NOT EXISTS "IDX_public_listing_submissions_claimed_agent"
  ON public_listing_submissions (claimed_agent_id);

CREATE INDEX IF NOT EXISTS "IDX_public_listing_submissions_claimed_agency"
  ON public_listing_submissions (claimed_agency_id);

COMMIT;
