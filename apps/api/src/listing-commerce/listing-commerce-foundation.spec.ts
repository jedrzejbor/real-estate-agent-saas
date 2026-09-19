import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PublicListingSubmissionStatus } from '../common/enums';
import {
  ListingEntitlementSource,
  ListingEntitlementStatus,
  ListingEntitlementType,
  ListingOrderStatus,
  ListingProductType,
} from './listing-commerce.types';

describe('listing commerce foundation', () => {
  const migration = readFileSync(
    join(
      __dirname,
      '../../migrations/20260906_listing_commerce_foundation.sql',
    ),
    'utf8',
  );

  it('keeps commerce states separate from publication and moderation', () => {
    expect(PublicListingSubmissionStatus.IN_REVIEW).toBe('in_review');
    expect(PublicListingSubmissionStatus.APPROVED).toBe('approved');
    expect(ListingOrderStatus.PENDING_PAYMENT).toBe('pending_payment');
    expect(ListingEntitlementStatus.ACTIVE).toBe('active');
  });

  it('defines provider-agnostic product and entitlement vocabulary', () => {
    expect(Object.values(ListingProductType)).toEqual([
      'publication',
      'renewal',
      'featured',
    ]);
    expect(Object.values(ListingEntitlementType)).toEqual([
      'publication',
      'featured',
    ]);
    expect(Object.values(ListingEntitlementSource)).toEqual([
      'order_item',
      'admin_grant',
      'migration',
    ]);
  });

  it('creates the complete persistence boundary', () => {
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS listing_product_catalog',
    );
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS listing_orders');
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS listing_order_items',
    );
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS listing_entitlements',
    );
  });

  it('protects monetary snapshots and entitlement periods with constraints', () => {
    expect(migration).toContain('chk_listing_orders_total_matches');
    expect(migration).toContain('chk_listing_order_items_subtotal_matches');
    expect(migration).toContain('chk_listing_order_items_total_matches');
    expect(migration).toContain('chk_listing_entitlements_period');
    expect(migration).toContain('chk_listing_entitlements_order_source');
  });

  it('seeds admin-editable V1 products without overwriting existing prices', () => {
    expect(migration).toContain("'publication_60_days'");
    expect(migration).toContain("'renewal_60_days'");
    expect(migration).toContain("'featured_7_days'");
    expect(migration).toContain('ON CONFLICT (code) DO NOTHING');
    expect(migration).not.toContain('DO UPDATE SET price_gross_amount');
  });

  it('leaves VAT unset until accounting and legal decisions are confirmed', () => {
    expect(migration).toContain('vat_rate_basis_points int');
    expect(migration).toContain("'PLN',\n    NULL,\n    60");
  });
});
