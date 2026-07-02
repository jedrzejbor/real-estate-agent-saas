CREATE TABLE IF NOT EXISTS notification_rule_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  follow_up_overdue_days int NOT NULL DEFAULT 0,
  stale_listing_days int NOT NULL DEFAULT 14,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_rule_settings_agent_unique UNIQUE (agent_id),
  CONSTRAINT notification_rule_settings_follow_up_days_check
    CHECK (follow_up_overdue_days >= 0 AND follow_up_overdue_days <= 30),
  CONSTRAINT notification_rule_settings_stale_listing_days_check
    CHECK (stale_listing_days >= 1 AND stale_listing_days <= 120)
);
