CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS geocoding_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider varchar(40) NOT NULL,
  normalized_query_hash varchar(64) NOT NULL,
  normalized_query text NULL,
  lat numeric(10, 7) NULL,
  lng numeric(10, 7) NULL,
  formatted_address text NULL,
  precision varchar(40) NULL,
  confidence numeric(4, 3) NULL,
  warning varchar(255) NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_geocoding_cache_provider_query_hash
  ON geocoding_cache (provider, normalized_query_hash);

CREATE INDEX IF NOT EXISTS idx_geocoding_cache_expires_at
  ON geocoding_cache (expires_at);
