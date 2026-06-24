DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM ('todo', 'done', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
    CREATE TYPE task_priority AS ENUM ('low', 'normal', 'high');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_type') THEN
    CREATE TYPE task_type AS ENUM ('follow_up', 'call', 'email', 'document', 'other');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_related_entity_type') THEN
    CREATE TYPE task_related_entity_type AS ENUM ('appointment', 'client', 'listing');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  description text,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'normal',
  type task_type NOT NULL DEFAULT 'other',
  related_entity_type task_related_entity_type,
  related_entity_id uuid,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_agent_status_due_at
  ON tasks(agent_id, status, due_at);

CREATE INDEX IF NOT EXISTS idx_tasks_agent_appointment
  ON tasks(agent_id, appointment_id);

CREATE INDEX IF NOT EXISTS idx_tasks_agent_client
  ON tasks(agent_id, client_id);

CREATE INDEX IF NOT EXISTS idx_tasks_agent_listing
  ON tasks(agent_id, listing_id);
