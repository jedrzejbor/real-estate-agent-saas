ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS client_id uuid NULL,
  ADD COLUMN IF NOT EXISTS listing_id uuid NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'clientId'
  ) THEN
    EXECUTE 'UPDATE appointments SET client_id = COALESCE(client_id, "clientId") WHERE client_id IS NULL AND "clientId" IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'listingId'
  ) THEN
    EXECUTE 'UPDATE appointments SET listing_id = COALESCE(listing_id, "listingId") WHERE listing_id IS NULL AND "listingId" IS NOT NULL';
  END IF;
END $$;

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS fk_appointments_client,
  DROP CONSTRAINT IF EXISTS fk_appointments_listing;

ALTER TABLE appointments
  ADD CONSTRAINT fk_appointments_client
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_appointments_listing
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_client_id
  ON appointments (client_id);

CREATE INDEX IF NOT EXISTS idx_appointments_listing_id
  ON appointments (listing_id);
