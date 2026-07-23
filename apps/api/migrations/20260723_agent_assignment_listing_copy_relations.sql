BEGIN;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS source_listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agent_assignment_id uuid REFERENCES listing_agent_assignments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_listings_source_listing_id
  ON listings (source_listing_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_listings_agent_assignment_id
  ON listings (agent_assignment_id)
  WHERE agent_assignment_id IS NOT NULL;

COMMIT;
