BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'listings_agent_collaboration_mode_enum'
  ) THEN
    CREATE TYPE listings_agent_collaboration_mode_enum AS ENUM (
      'single_agent',
      'multi_agent'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'listings_agent_collaboration_status_enum'
  ) THEN
    CREATE TYPE listings_agent_collaboration_status_enum AS ENUM (
      'open',
      'paused',
      'closed',
      'assigned'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'public_listing_submissions_agent_collaboration_mode_enum'
  ) THEN
    CREATE TYPE public_listing_submissions_agent_collaboration_mode_enum AS ENUM (
      'single_agent',
      'multi_agent'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'public_listing_submissions_agent_collaboration_status_enum'
  ) THEN
    CREATE TYPE public_listing_submissions_agent_collaboration_status_enum AS ENUM (
      'open',
      'paused',
      'closed',
      'assigned'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'listing_agent_proposals_status_enum'
  ) THEN
    CREATE TYPE listing_agent_proposals_status_enum AS ENUM (
      'draft',
      'sent',
      'updated',
      'accepted',
      'rejected',
      'withdrawn',
      'expired',
      'closed'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'listing_agent_proposals_commission_type_enum'
  ) THEN
    CREATE TYPE listing_agent_proposals_commission_type_enum AS ENUM (
      'percentage',
      'fixed',
      'mixed',
      'none'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'listing_agent_proposals_exclusivity_enum'
  ) THEN
    CREATE TYPE listing_agent_proposals_exclusivity_enum AS ENUM (
      'exclusive',
      'open',
      'flexible'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'listing_agent_assignments_status_enum'
  ) THEN
    CREATE TYPE listing_agent_assignments_status_enum AS ENUM (
      'active',
      'revoked',
      'completed'
    );
  END IF;
END $$;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS agent_collaboration_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agent_collaboration_mode listings_agent_collaboration_mode_enum,
  ADD COLUMN IF NOT EXISTS agent_collaboration_status listings_agent_collaboration_status_enum,
  ADD COLUMN IF NOT EXISTS agent_collaboration_preferences jsonb,
  ADD COLUMN IF NOT EXISTS agent_collaboration_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS agent_collaboration_closed_at timestamptz;

ALTER TABLE public_listing_submissions
  ADD COLUMN IF NOT EXISTS agent_collaboration_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agent_collaboration_mode public_listing_submissions_agent_collaboration_mode_enum,
  ADD COLUMN IF NOT EXISTS agent_collaboration_status public_listing_submissions_agent_collaboration_status_enum,
  ADD COLUMN IF NOT EXISTS agent_collaboration_preferences jsonb,
  ADD COLUMN IF NOT EXISTS agent_collaboration_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS agent_collaboration_closed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_listings_agent_collaboration_enabled
  ON listings (agent_collaboration_enabled);

CREATE INDEX IF NOT EXISTS idx_listings_agent_collaboration_status
  ON listings (agent_collaboration_status);

CREATE INDEX IF NOT EXISTS idx_public_listing_submissions_agent_collaboration_enabled
  ON public_listing_submissions (agent_collaboration_enabled);

CREATE INDEX IF NOT EXISTS idx_public_listing_submissions_agent_collaboration_status
  ON public_listing_submissions (agent_collaboration_status);

CREATE TABLE IF NOT EXISTS listing_agent_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL,
  status listing_agent_proposals_status_enum NOT NULL DEFAULT 'sent',
  commission_type listing_agent_proposals_commission_type_enum,
  commission_value numeric(12, 2),
  minimum_contract_months int,
  exclusivity listing_agent_proposals_exclusivity_enum,
  services jsonb NOT NULL DEFAULT '[]'::jsonb,
  marketing_plan text,
  valuation_opinion text,
  proposed_price numeric(12, 2),
  availability text,
  message text,
  valid_until timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_listing_agent_proposals_services_array
    CHECK (jsonb_typeof(services) = 'array')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_listing_agent_proposals_active_agent
  ON listing_agent_proposals (listing_id, agent_id)
  WHERE status IN ('draft', 'sent', 'updated');

CREATE INDEX IF NOT EXISTS idx_listing_agent_proposals_agent_status_created
  ON listing_agent_proposals (agent_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_listing_agent_proposals_owner_status_created
  ON listing_agent_proposals (owner_user_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_listing_agent_proposals_listing_status_created
  ON listing_agent_proposals (listing_id, status, created_at);

CREATE TABLE IF NOT EXISTS listing_agent_proposal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES listing_agent_proposals(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL,
  read_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_listing_agent_proposal_messages_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_listing_agent_proposal_messages_proposal_created
  ON listing_agent_proposal_messages (proposal_id, created_at);

CREATE TABLE IF NOT EXISTS listing_agent_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  proposal_id uuid NOT NULL REFERENCES listing_agent_proposals(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL,
  status listing_agent_assignments_status_enum NOT NULL DEFAULT 'active',
  accepted_terms_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  agent_listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  completed_at timestamptz,
  CONSTRAINT chk_listing_agent_assignments_terms_object
    CHECK (jsonb_typeof(accepted_terms_snapshot) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_listing_agent_assignments_active_agent
  ON listing_agent_assignments (listing_id, agent_id)
  WHERE status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS uq_listing_agent_assignments_proposal
  ON listing_agent_assignments (proposal_id);

CREATE INDEX IF NOT EXISTS idx_listing_agent_assignments_agent_status_created
  ON listing_agent_assignments (agent_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_listing_agent_assignments_owner_status_created
  ON listing_agent_assignments (owner_user_id, status, created_at);

UPDATE plan_catalog
SET features = features || jsonb_build_object(
  'agentListingMarket',
  CASE WHEN code = 'free' THEN false ELSE true END
)
WHERE code IN ('free', 'starter', 'professional', 'enterprise');

COMMIT;
