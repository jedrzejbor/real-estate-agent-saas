import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ListingPromotionCampaignStatus,
  ListingPromotionDiscountType,
  ListingPromotionReservationStatus,
  ListingPromotionTargetScope,
} from './listing-commerce.types';

describe('listing promotions foundation migration', () => {
  const migration = readFileSync(
    join(
      __dirname,
      '../../migrations/20260910_listing_promotions_foundation.sql',
    ),
    'utf8',
  );

  it('defines provider-agnostic promotion vocabulary', () => {
    expect(Object.values(ListingPromotionCampaignStatus)).toEqual([
      'draft',
      'active',
      'paused',
      'archived',
    ]);
    expect(Object.values(ListingPromotionDiscountType)).toEqual([
      'percentage',
      'fixed_gross',
    ]);
    expect(Object.values(ListingPromotionTargetScope)).toEqual([
      'all_products',
      'product_types',
      'product_codes',
    ]);
    expect(Object.values(ListingPromotionReservationStatus)).toEqual([
      'reserved',
      'applied',
      'released',
      'expired',
    ]);
  });

  it('creates campaigns, codes, reservations and redemptions', () => {
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS listing_promotion_campaigns',
    );
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS listing_promotion_codes',
    );
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS listing_promotion_reservations',
    );
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS listing_promotion_redemptions',
    );
  });

  it('stores promotion codes as hashes rather than plaintext', () => {
    const promotionCodesTable = migration.slice(
      migration.indexOf('CREATE TABLE IF NOT EXISTS listing_promotion_codes'),
      migration.indexOf(
        'CREATE INDEX IF NOT EXISTS idx_listing_promotion_codes_campaign_status',
      ),
    );

    expect(migration).toContain('code_hash varchar(64) NOT NULL');
    expect(migration).toContain('chk_listing_promotion_codes_hash_format');
    expect(promotionCodesTable).not.toContain('\n  code varchar');
    expect(promotionCodesTable).not.toContain('code_value');
  });

  it('protects discounts, date windows and usage counters with constraints', () => {
    expect(migration).toContain('chk_listing_promotion_campaign_discount_value');
    expect(migration).toContain('chk_listing_promotion_campaign_period');
    expect(migration).toContain('chk_listing_promotion_campaign_usage_count');
    expect(migration).toContain('chk_listing_promotion_codes_discount_pair');
    expect(migration).toContain('chk_listing_promotion_reservations_period');
    expect(migration).toContain('chk_listing_promotion_redemptions_discount');
  });

  it('indexes orders while keeping redemption idempotency on reservations', () => {
    expect(migration).toContain('idx_listing_promotion_reservations_order');
    expect(migration).toContain('idx_listing_promotion_redemptions_order');
    expect(migration).toContain('uq_listing_promotion_redemptions_reservation');
  });
});

describe('listing promotion order indexes migration', () => {
  const migration = readFileSync(
    join(
      __dirname,
      '../../migrations/20260910_listing_promotion_order_indexes.sql',
    ),
    'utf8',
  );

  it('keeps order lookup indexes non-unique so one order can have multiple discounts', () => {
    expect(migration).toContain(
      'DROP INDEX IF EXISTS uq_listing_promotion_reservations_order',
    );
    expect(migration).toContain(
      'DROP CONSTRAINT IF EXISTS uq_listing_promotion_redemptions_order',
    );
    expect(migration).toContain(
      'CREATE INDEX IF NOT EXISTS idx_listing_promotion_reservations_order',
    );
    expect(migration).toContain(
      'CREATE INDEX IF NOT EXISTS idx_listing_promotion_redemptions_order',
    );
    expect(migration).not.toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS uq_listing_promotion_reservations_order',
    );
    expect(migration).not.toContain(
      'CONSTRAINT uq_listing_promotion_redemptions_order UNIQUE',
    );
  });
});
