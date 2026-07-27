BEGIN;

ALTER TABLE listing_agent_proposals
  ADD COLUMN IF NOT EXISTS agent_deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS owner_deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_listing_agent_proposals_agent_visible
  ON listing_agent_proposals (agent_id, agent_deleted_at, status, updated_at);

CREATE INDEX IF NOT EXISTS idx_listing_agent_proposals_owner_visible
  ON listing_agent_proposals (owner_user_id, owner_deleted_at, status, updated_at);

COMMIT;
