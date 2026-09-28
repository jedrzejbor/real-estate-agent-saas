import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { AdminPermission, UserRole } from '../common/enums';
import { AdminListingEntitlementsController } from './admin-listing-entitlements.controller';
import { AdminListingProductsController } from './admin-listing-products.controller';
import { AdminListingPromotionsController } from './admin-listing-promotions.controller';
import { ListingCheckoutController } from './listing-checkout.controller';
import { ListingOrdersController } from './listing-orders.controller';
import { ListingProductsController } from './listing-products.controller';

describe('listing product controller access', () => {
  it('protects the entire admin controller with the admin role', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminListingProductsController)).toEqual([
      UserRole.ADMIN,
    ]);
    expect(
      Reflect.getMetadata(ROLES_KEY, AdminListingPromotionsController),
    ).toEqual([UserRole.ADMIN]);
    expect(
      Reflect.getMetadata(ROLES_KEY, AdminListingEntitlementsController),
    ).toEqual([UserRole.ADMIN]);
  });

  it('requires granular admin commerce permissions for admin controllers', () => {
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, AdminListingProductsController),
    ).toEqual([AdminPermission.LISTING_COMMERCE_READ]);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        AdminListingProductsController.prototype.createProduct,
      ),
    ).toEqual([AdminPermission.LISTING_COMMERCE_MANAGE_PRODUCTS]);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, AdminListingPromotionsController),
    ).toEqual([AdminPermission.LISTING_COMMERCE_READ]);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        AdminListingPromotionsController.prototype.createCampaign,
      ),
    ).toEqual([AdminPermission.LISTING_COMMERCE_MANAGE_PROMOTIONS]);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, AdminListingEntitlementsController),
    ).toEqual([AdminPermission.LISTING_COMMERCE_READ]);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        AdminListingEntitlementsController.prototype.grantListingEntitlement,
      ),
    ).toEqual([AdminPermission.LISTING_COMMERCE_MANAGE_GRANTS]);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        AdminListingEntitlementsController.prototype.createManualAdjustment,
      ),
    ).toEqual([AdminPermission.LISTING_COMMERCE_MANAGE_ADJUSTMENTS]);
  });

  it('marks only the public catalog handler as public', () => {
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        ListingProductsController.prototype.findPublicProducts,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, AdminListingProductsController),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, AdminListingPromotionsController),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, AdminListingEntitlementsController),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        ListingCheckoutController.prototype.createQuote,
      ),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        ListingCheckoutController.prototype.createOrder,
      ),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        ListingOrdersController.prototype.findOwnedOrder,
      ),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        ListingOrdersController.prototype.findOwnedOrdersForListing,
      ),
    ).toBeUndefined();
  });
});
