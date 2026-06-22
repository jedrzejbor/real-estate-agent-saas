CREATE TABLE IF NOT EXISTS agency_retained_listing_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_agency_retained_listing_choices_agency_listing UNIQUE (agency_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_retained_listing_choices_agency_created
  ON agency_retained_listing_choices (agency_id, created_at);

CREATE INDEX IF NOT EXISTS idx_agency_retained_listing_choices_listing
  ON agency_retained_listing_choices (listing_id);
