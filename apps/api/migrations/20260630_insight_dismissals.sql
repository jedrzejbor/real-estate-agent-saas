CREATE TABLE IF NOT EXISTS insight_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  insight_id varchar(160) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE insight_dismissals
  DROP CONSTRAINT IF EXISTS uq_insight_dismissals_user_insight;

ALTER TABLE insight_dismissals
  ADD CONSTRAINT uq_insight_dismissals_user_insight
  UNIQUE (user_id, insight_id);

CREATE INDEX IF NOT EXISTS idx_insight_dismissals_user_id
  ON insight_dismissals (user_id);

CREATE INDEX IF NOT EXISTS idx_insight_dismissals_insight_id
  ON insight_dismissals (insight_id);
