BEGIN;

UPDATE listings AS listing
SET
  agent_collaboration_enabled = submission.agent_collaboration_enabled,
  agent_collaboration_mode = submission.agent_collaboration_mode::text::listings_agent_collaboration_mode_enum,
  agent_collaboration_status = submission.agent_collaboration_status::text::listings_agent_collaboration_status_enum,
  agent_collaboration_preferences = submission.agent_collaboration_preferences,
  agent_collaboration_opened_at = submission.agent_collaboration_opened_at,
  agent_collaboration_closed_at = submission.agent_collaboration_closed_at
FROM public_listing_submissions AS submission
WHERE submission.published_listing_id = listing.id
  AND submission.agent_collaboration_enabled = true
  AND listing.agent_collaboration_enabled = false;

COMMIT;
