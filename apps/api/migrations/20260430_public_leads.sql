-- Public listing lead capture model.
-- Safe to run more than once on PostgreSQL.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'public_leads_source_enum'
  ) THEN
    CREATE TYPE public_leads_source_enum AS ENUM (
      'public_listing_page',
      'public_listing_share',
      'public_profile',
      'qr_code',
      'embed',
      'other'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'public_leads_status_enum'
  ) THEN
    CREATE TYPE public_leads_status_enum AS ENUM (
      'new',
      'contacted',
      'qualified',
      'converted_to_client',
      'spam',
      'archived'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "fullName" varchar(255) NOT NULL,
  email varchar(255),
  phone varchar(30),
  message text,
  source public_leads_source_enum NOT NULL DEFAULT 'public_listing_page',
  status public_leads_status_enum NOT NULL DEFAULT 'new',
  public_slug_snapshot varchar(160) NOT NULL,
  source_url varchar(500),
  referrer varchar(500),
  utm_source varchar(255),
  utm_medium varchar(255),
  utm_campaign varchar(255),
  utm_term varchar(255),
  utm_content varchar(255),
  contact_consent boolean NOT NULL DEFAULT false,
  marketing_consent boolean NOT NULL DEFAULT false,
  consent_text text,
  consented_at timestamptz,
  ip_hash varchar(128),
  user_agent varchar(500),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  handled_at timestamptz,
  converted_at timestamptz,
  archived_at timestamptz,
  listing_id uuid,
  agent_id uuid NOT NULL,
  agency_id uuid,
  converted_client_id uuid,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "FK_public_leads_listing"
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL,
  CONSTRAINT "FK_public_leads_agent"
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  CONSTRAINT "FK_public_leads_agency"
    FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL,
  CONSTRAINT "FK_public_leads_converted_client"
    FOREIGN KEY (converted_client_id) REFERENCES clients(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IDX_public_leads_source"
  ON public_leads (source);

CREATE INDEX IF NOT EXISTS "IDX_public_leads_status"
  ON public_leads (status);

CREATE INDEX IF NOT EXISTS "IDX_public_leads_listing_status_created"
  ON public_leads (listing_id, status, "createdAt");

CREATE INDEX IF NOT EXISTS "IDX_public_leads_agent_status_created"
  ON public_leads (agent_id, status, "createdAt");

CREATE INDEX IF NOT EXISTS "IDX_public_leads_agency_status_created"
  ON public_leads (agency_id, status, "createdAt");

CREATE INDEX IF NOT EXISTS "IDX_public_leads_converted_client"
  ON public_leads (converted_client_id);

COMMIT;
