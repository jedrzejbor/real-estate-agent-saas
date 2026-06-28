DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'client_preference_transaction_type'
  ) THEN
    CREATE TYPE client_preference_transaction_type AS ENUM ('sale', 'rent');
  END IF;
END $$;

ALTER TABLE client_preferences
  ADD COLUMN IF NOT EXISTS transaction_type client_preference_transaction_type,
  ADD COLUMN IF NOT EXISTS preferred_district varchar(255);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'client_preferences' AND column_name = 'transactionType'
  ) THEN
    EXECUTE 'UPDATE client_preferences
      SET transaction_type = COALESCE(transaction_type, "transactionType"::text::client_preference_transaction_type)
      WHERE transaction_type IS NULL AND "transactionType" IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'client_preferences' AND column_name = 'preferredDistrict'
  ) THEN
    EXECUTE 'UPDATE client_preferences
      SET preferred_district = COALESCE(preferred_district, "preferredDistrict")
      WHERE preferred_district IS NULL AND "preferredDistrict" IS NOT NULL';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS matching_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE matching_dismissals
  DROP CONSTRAINT IF EXISTS uq_matching_dismissals_agent_client_listing;

ALTER TABLE matching_dismissals
  ADD CONSTRAINT uq_matching_dismissals_agent_client_listing
    UNIQUE (agent_id, client_id, listing_id);

CREATE INDEX IF NOT EXISTS idx_matching_dismissals_agent_id
  ON matching_dismissals (agent_id);

CREATE INDEX IF NOT EXISTS idx_matching_dismissals_client_id
  ON matching_dismissals (client_id);

CREATE INDEX IF NOT EXISTS idx_matching_dismissals_listing_id
  ON matching_dismissals (listing_id);

CREATE INDEX IF NOT EXISTS idx_matching_dismissals_agent_client
  ON matching_dismissals (agent_id, client_id);

CREATE INDEX IF NOT EXISTS idx_matching_dismissals_agent_listing
  ON matching_dismissals (agent_id, listing_id);
