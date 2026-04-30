BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'activity_logs_action_enum'
  ) THEN
    ALTER TYPE activity_logs_action_enum ADD VALUE IF NOT EXISTS 'claimed';
  END IF;
END $$;

COMMIT;
