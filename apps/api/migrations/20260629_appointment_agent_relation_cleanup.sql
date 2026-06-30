ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS agent_id uuid NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'appointments'
      AND column_name = 'agentId'
  ) THEN
    EXECUTE 'UPDATE appointments SET agent_id = COALESCE(agent_id, "agentId") WHERE agent_id IS NULL AND "agentId" IS NOT NULL';
    EXECUTE 'ALTER TABLE appointments ALTER COLUMN "agentId" DROP NOT NULL';
  END IF;
END $$;

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS fk_appointments_agent;

ALTER TABLE appointments
  ADD CONSTRAINT fk_appointments_agent
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;

ALTER TABLE appointments
  ALTER COLUMN agent_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_agent_id
  ON appointments (agent_id);
