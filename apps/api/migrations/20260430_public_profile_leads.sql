-- Public profile lead source for agent / agency profile contact forms.
-- Safe to run more than once on PostgreSQL.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'public_leads_source_enum'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'public_leads_source_enum'
      AND e.enumlabel = 'public_profile'
  ) THEN
    ALTER TYPE public_leads_source_enum ADD VALUE 'public_profile';
  END IF;
END $$;

COMMIT;
