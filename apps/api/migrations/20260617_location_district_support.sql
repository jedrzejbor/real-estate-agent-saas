ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS parent_normalized_name varchar(255),
  ADD COLUMN IF NOT EXISTS aliases jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE locations
SET parent_normalized_name = lower(
  regexp_replace(
    translate(
      parent_name,
      'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ',
      'acelnoszzACELNOSZZ'
    ),
    '[^a-zA-Z0-9]+',
    ' ',
    'g'
  )
)
WHERE parent_name IS NOT NULL
  AND parent_normalized_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_locations_kind_parent_normalized_name
  ON locations (kind, parent_normalized_name, normalized_name);

INSERT INTO locations (
  name,
  normalized_name,
  natural_key,
  search_text,
  municipality,
  parent_name,
  parent_normalized_name,
  county,
  voivodeship,
  kind,
  kind_code,
  aliases,
  lat,
  lng,
  priority,
  source,
  active
)
VALUES
  (
    'Fordon',
    'fordon',
    'fordon|kujawsko pomorskie|bydgoszcz|bydgoszcz|bydgoszcz|district|',
    'fordon bydgoszcz kujawsko pomorskie district',
    'Bydgoszcz',
    'Bydgoszcz',
    'bydgoszcz',
    'Bydgoszcz',
    'kujawsko-pomorskie',
    'district',
    NULL,
    '[]'::jsonb,
    53.148,
    18.17,
    80,
    'public-district-seed',
    true
  ),
  (
    'Śródmieście',
    'srodmiescie',
    'srodmiescie|kujawsko pomorskie|bydgoszcz|bydgoszcz|bydgoszcz|district|',
    'srodmiescie centrum bydgoszcz kujawsko pomorskie district',
    'Bydgoszcz',
    'Bydgoszcz',
    'bydgoszcz',
    'Bydgoszcz',
    'kujawsko-pomorskie',
    'district',
    NULL,
    '["centrum", "srodmiescie", "śródmieście"]'::jsonb,
    53.123,
    18.002,
    80,
    'public-district-seed',
    true
  )
ON CONFLICT (natural_key) DO UPDATE SET
  search_text = EXCLUDED.search_text,
  parent_normalized_name = EXCLUDED.parent_normalized_name,
  aliases = EXCLUDED.aliases,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  priority = EXCLUDED.priority,
  source = EXCLUDED.source,
  active = EXCLUDED.active,
  "updatedAt" = now();
