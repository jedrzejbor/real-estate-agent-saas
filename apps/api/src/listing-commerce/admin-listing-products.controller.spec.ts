import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { AdminListingProductsController } from './admin-listing-products.controller';
import { ListingProductsController } from './listing-products.controller';

describe('listing product controller access', () => {
  it('protects the entire admin controller with the admin role', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminListingProductsController)).toEqual([
      UserRole.ADMIN,
    ]);
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
  });
});
