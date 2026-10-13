-- PAY-014: remove obsolete Stripe plan price IDs from the local development schema.
-- Preserve every plan and fail if either column has acquired data since the audit.
BEGIN;

LOCK TABLE plan_catalog IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE
  has_values boolean;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'plan_catalog'
      AND column_name = 'stripe_price_id_monthly'
  ) THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM plan_catalog WHERE stripe_price_id_monthly IS NOT NULL)'
      INTO has_values;
    IF has_values THEN
      RAISE EXCEPTION 'PAY-014: stripe_price_id_monthly contains data; migration aborted';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'plan_catalog'
      AND column_name = 'stripe_price_id_yearly'
  ) THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM plan_catalog WHERE stripe_price_id_yearly IS NOT NULL)'
      INTO has_values;
    IF has_values THEN
      RAISE EXCEPTION 'PAY-014: stripe_price_id_yearly contains data; migration aborted';
    END IF;
  END IF;
END $$;

ALTER TABLE plan_catalog
  DROP COLUMN IF EXISTS stripe_price_id_monthly,
  DROP COLUMN IF EXISTS stripe_price_id_yearly;

COMMIT;
