import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { AdminListingEntitlementsController } from './admin-listing-entitlements.controller';
import { ListingProductType } from './listing-commerce.types';

describe('AdminListingEntitlementsController', () => {
  it('protects the controller with the admin role', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, AdminListingEntitlementsController),
    ).toEqual([UserRole.ADMIN]);
  });

  it('grants an entitlement as the current admin user', async () => {
    const service = {
      findAdminCommerceSummary: jest.fn(),
      grantAdminEntitlement: jest.fn().mockResolvedValue({
        id: 'entitlement-1',
      }),
    };
    const controller = new AdminListingEntitlementsController(service as never);

    await expect(
      controller.grantListingEntitlement(
        'admin-1',
        '550e8400-e29b-41d4-a716-446655440000',
        {
          productType: ListingProductType.FEATURED,
          durationDays: 7,
          reason: 'Promocyjne wyróżnienie po rozmowie z klientem',
          featuredTier: 'standard',
          priorityWeight: 100,
        },
      ),
    ).resolves.toEqual({ id: 'entitlement-1' });
    expect(service.grantAdminEntitlement).toHaveBeenCalledWith({
      actorUserId: 'admin-1',
      listingId: '550e8400-e29b-41d4-a716-446655440000',
      productType: ListingProductType.FEATURED,
      durationDays: 7,
      reason: 'Promocyjne wyróżnienie po rozmowie z klientem',
      featuredTier: 'standard',
      priorityWeight: 100,
    });
  });

  it('returns the commerce summary for a listing', async () => {
    const service = {
      findAdminCommerceSummary: jest.fn().mockResolvedValue({
        listing: { id: '550e8400-e29b-41d4-a716-446655440000' },
        entitlements: [],
      }),
      grantAdminEntitlement: jest.fn(),
    };
    const controller = new AdminListingEntitlementsController(service as never);

    await expect(
      controller.findCommerceSummary(
        '550e8400-e29b-41d4-a716-446655440000',
      ),
    ).resolves.toEqual({
      listing: { id: '550e8400-e29b-41d4-a716-446655440000' },
      entitlements: [],
    });
    expect(service.findAdminCommerceSummary).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
    );
  });
});
