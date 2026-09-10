import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
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
