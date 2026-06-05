-- Agency billing fields and editable plan catalog.

BEGIN;

ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS plan_overrides jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS billing_customer_id varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS billing_subscription_id varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS billing_interval varchar(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS plan_changed_at timestamptz DEFAULT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_agencies_billing_interval'
  ) THEN
    ALTER TABLE agencies
      ADD CONSTRAINT chk_agencies_billing_interval
      CHECK (billing_interval IS NULL OR billing_interval IN ('monthly', 'yearly'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_agencies_billing_customer
  ON agencies(billing_customer_id);

CREATE INDEX IF NOT EXISTS idx_agencies_billing_subscription
  ON agencies(billing_subscription_id);

CREATE TABLE IF NOT EXISTS plan_catalog (
  code varchar(50) PRIMARY KEY,
  label varchar(100) NOT NULL,
  description text,
  price_monthly_pln int NOT NULL DEFAULT 0,
  price_yearly_pln int NOT NULL DEFAULT 0,
  stripe_price_id_monthly varchar(255),
  stripe_price_id_yearly varchar(255),
  limits jsonb NOT NULL DEFAULT '{}',
  features jsonb NOT NULL DEFAULT '{}',
  is_public boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_plan_catalog_price_monthly_non_negative CHECK (price_monthly_pln >= 0),
  CONSTRAINT chk_plan_catalog_price_yearly_non_negative CHECK (price_yearly_pln >= 0),
  CONSTRAINT chk_plan_catalog_limits_object CHECK (jsonb_typeof(limits) = 'object'),
  CONSTRAINT chk_plan_catalog_features_object CHECK (jsonb_typeof(features) = 'object')
);

INSERT INTO plan_catalog (
  code,
  label,
  description,
  price_monthly_pln,
  price_yearly_pln,
  limits,
  features,
  is_public,
  sort_order
) VALUES
(
  'free',
  'Free',
  'Plan startowy dla nowych agentów i małych testów produktu.',
  0,
  0,
  '{"activeListings":5,"clients":25,"monthlyAppointments":20,"users":1,"imagesPerListing":15}',
  '{"reportsOverview":true,"reportsListingsBasic":true,"reportsClientsBasic":true,"reportsAppointmentsBasic":false,"publicListings":true,"publicLeadForms":true,"customBranding":false,"multiUser":false,"customDomain":false,"apiAccess":false,"dedicatedSupport":false}',
  true,
  0
),
(
  'starter',
  'Starter',
  'Plan dla solo agenta, który zaczął realnie pracować na pipeline.',
  9900,
  99000,
  '{"activeListings":25,"clients":250,"monthlyAppointments":150,"users":1,"imagesPerListing":30}',
  '{"reportsOverview":true,"reportsListingsBasic":true,"reportsClientsBasic":true,"reportsAppointmentsBasic":true,"publicListings":true,"publicLeadForms":true,"customBranding":false,"multiUser":false,"customDomain":false,"apiAccess":false,"dedicatedSupport":false}',
  true,
  1
),
(
  'professional',
  'Professional',
  'Plan dla agentów i małych biur, które aktywnie publikują oferty i obsługują leady.',
  24900,
  249000,
  '{"activeListings":200,"clients":2500,"monthlyAppointments":1000,"users":5,"imagesPerListing":50}',
  '{"reportsOverview":true,"reportsListingsBasic":true,"reportsClientsBasic":true,"reportsAppointmentsBasic":true,"publicListings":true,"publicLeadForms":true,"customBranding":true,"multiUser":true,"customDomain":false,"apiAccess":false,"dedicatedSupport":false}',
  true,
  2
),
(
  'enterprise',
  'Enterprise',
  'Plan dla większych zespołów, sieci biur i wdrożeń z indywidualnymi wymaganiami.',
  0,
  0,
  '{"activeListings":null,"clients":null,"monthlyAppointments":null,"users":null,"imagesPerListing":null}',
  '{"reportsOverview":true,"reportsListingsBasic":true,"reportsClientsBasic":true,"reportsAppointmentsBasic":true,"publicListings":true,"publicLeadForms":true,"customBranding":true,"multiUser":true,"customDomain":true,"apiAccess":true,"dedicatedSupport":true}',
  true,
  3
)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  price_monthly_pln = EXCLUDED.price_monthly_pln,
  price_yearly_pln = EXCLUDED.price_yearly_pln,
  limits = EXCLUDED.limits,
  features = EXCLUDED.features,
  is_public = EXCLUDED.is_public,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

COMMIT;
