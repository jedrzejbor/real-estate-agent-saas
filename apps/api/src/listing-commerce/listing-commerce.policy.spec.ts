import {
  ListingEntitlementStatus,
  ListingEntitlementType,
  ListingOrderStatus,
  ListingProductType,
} from './listing-commerce.types';
import {
  assertListingEntitlementStatusTransition,
  assertListingOrderStatusTransition,
  calculateGrossAmountTotals,
  canTransitionListingEntitlementStatus,
  canTransitionListingOrderStatus,
  getEntitlementTypeForProduct,
  getListingQuoteExpiry,
  InvalidListingCommerceTransitionError,
} from './listing-commerce.policy';

describe('listing commerce policies', () => {
  describe('order lifecycle', () => {
    it('allows payment retry without reopening terminal orders', () => {
      expect(
        canTransitionListingOrderStatus(
          ListingOrderStatus.PAYMENT_FAILED,
          ListingOrderStatus.PENDING_PAYMENT,
        ),
      ).toBe(true);
      expect(
        canTransitionListingOrderStatus(
          ListingOrderStatus.REFUNDED,
          ListingOrderStatus.PENDING_PAYMENT,
        ),
      ).toBe(false);
    });

    it('allows a zero-value draft to finalize directly as paid', () => {
      expect(
        canTransitionListingOrderStatus(
          ListingOrderStatus.DRAFT,
          ListingOrderStatus.PAID,
        ),
      ).toBe(true);
    });

    it('allows an authoritative late success to recover a failed, expired or cancelled order', () => {
      expect(
        canTransitionListingOrderStatus(
          ListingOrderStatus.PAYMENT_FAILED,
          ListingOrderStatus.PAID,
        ),
      ).toBe(true);
      expect(
        canTransitionListingOrderStatus(
          ListingOrderStatus.EXPIRED,
          ListingOrderStatus.PAID,
        ),
      ).toBe(true);
      expect(
        canTransitionListingOrderStatus(
          ListingOrderStatus.CANCELLED,
          ListingOrderStatus.PAID,
        ),
      ).toBe(true);
    });

    it('rejects invalid transitions with a domain error', () => {
      expect(() =>
        assertListingOrderStatusTransition(
          ListingOrderStatus.PAID,
          ListingOrderStatus.PENDING_PAYMENT,
        ),
      ).toThrow(InvalidListingCommerceTransitionError);
    });
  });

  describe('entitlement lifecycle', () => {
    it('supports activation, expiry and controlled revocation', () => {
      expect(
        canTransitionListingEntitlementStatus(
          ListingEntitlementStatus.SCHEDULED,
          ListingEntitlementStatus.ACTIVE,
        ),
      ).toBe(true);
      expect(
        canTransitionListingEntitlementStatus(
          ListingEntitlementStatus.ACTIVE,
          ListingEntitlementStatus.EXPIRED,
        ),
      ).toBe(true);
      expect(
        canTransitionListingEntitlementStatus(
          ListingEntitlementStatus.ACTIVE,
          ListingEntitlementStatus.REVOKED,
        ),
      ).toBe(true);
    });

    it('keeps terminal entitlements closed', () => {
      expect(() =>
        assertListingEntitlementStatusTransition(
          ListingEntitlementStatus.REVOKED,
          ListingEntitlementStatus.ACTIVE,
        ),
      ).toThrow(InvalidListingCommerceTransitionError);
    });
  });

  it.each([
    [ListingProductType.PUBLICATION, ListingEntitlementType.PUBLICATION],
    [ListingProductType.RENEWAL, ListingEntitlementType.PUBLICATION],
    [ListingProductType.FEATURED, ListingEntitlementType.FEATURED],
  ])('maps %s products to %s entitlements', (productType, entitlementType) => {
    expect(getEntitlementTypeForProduct(productType)).toBe(entitlementType);
  });

  it('creates a quote expiry exactly 30 minutes after quoting', () => {
    const quotedAt = new Date('2026-09-07T10:15:00.000Z');

    expect(getListingQuoteExpiry(quotedAt).toISOString()).toBe(
      '2026-09-07T10:45:00.000Z',
    );
    expect(quotedAt.toISOString()).toBe('2026-09-07T10:15:00.000Z');
  });

  describe('gross amount arithmetic', () => {
    it('calculates totals using integer minor units', () => {
      expect(
        calculateGrossAmountTotals([
          { unitGrossAmount: 4900, quantity: 1, discountGrossAmount: 500 },
          { unitGrossAmount: 1900, quantity: 2, discountGrossAmount: 0 },
        ]),
      ).toEqual({
        subtotalGrossAmount: 8700,
        discountGrossAmount: 500,
        totalGrossAmount: 8200,
      });
    });

    it.each([
      [{ unitGrossAmount: -1, quantity: 1, discountGrossAmount: 0 }],
      [{ unitGrossAmount: 100, quantity: 0, discountGrossAmount: 0 }],
      [{ unitGrossAmount: 100, quantity: 1, discountGrossAmount: 101 }],
      [{ unitGrossAmount: 10.5, quantity: 1, discountGrossAmount: 0 }],
    ])('rejects unsafe monetary input %#', (line) => {
      expect(() => calculateGrossAmountTotals([line])).toThrow(RangeError);
    });
  });
});
