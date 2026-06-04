-- Blog analytics support.
-- Allows central public blog events that are not scoped to a specific user/agent.

BEGIN;

ALTER TABLE analytics_events
  ALTER COLUMN user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "IDX_analytics_events_blog_slug_name_created"
  ON analytics_events ((properties ->> 'postSlug'), name, "createdAt")
  WHERE name IN ('blog_article_viewed', 'blog_cta_clicked');

COMMIT;
