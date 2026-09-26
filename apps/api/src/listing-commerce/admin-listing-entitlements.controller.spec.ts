import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { AdminListingEntitlementsController } from './admin-listing-entitlements.controller';
import {
  ListingProductType,
  ListingPromotionDiscountType,
} from './listing-commerce.types';

function buildController() {
  const entitlementsService = {
    findAdminCommerceSummary: jest.fn(),
    grantAdminEntitlement: jest.fn(),
    revokeAdminEntitlement: jest.fn(),
  };
  const manualAdjustmentsService = {
    createAdjustment: jest.fn(),
    archiveAdjustment: jest.fn(),
  };
  const controller = new AdminListingEntitlementsController(
    entitlementsService as never,
    manualAdjustmentsService as never,
  );
  return { controller, entitlementsService, manualAdjustmentsService };
}

describe('AdminListingEntitlementsController', () => {
  it('protects the controller with the admin role', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, AdminListingEntitlementsController),
    ).toEqual([UserRole.ADMIN]);
  });

  it('grants an entitlement as the current admin user', async () => {
    const { controller, entitlementsService } = buildController();
    entitlementsService.grantAdminEntitlement.mockResolvedValue({
      id: 'entitlement-1',
    });

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
    expect(entitlementsService.grantAdminEntitlement).toHaveBeenCalledWith({
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
    const { controller, entitlementsService } = buildController();
    entitlementsService.findAdminCommerceSummary.mockResolvedValue({
      listing: { id: '550e8400-e29b-41d4-a716-446655440000' },
      entitlements: [],
      manualAdjustments: [],
    });

    await expect(
      controller.findCommerceSummary(
        '550e8400-e29b-41d4-a716-446655440000',
      ),
    ).resolves.toEqual({
      listing: { id: '550e8400-e29b-41d4-a716-446655440000' },
      entitlements: [],
      manualAdjustments: [],
    });
    expect(entitlementsService.findAdminCommerceSummary).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
    );
  });

  it('revokes an admin entitlement as the current admin user', async () => {
    const { controller, entitlementsService } = buildController();
    entitlementsService.revokeAdminEntitlement.mockResolvedValue({
      id: 'entitlement-1',
    });

    await expect(
      controller.revokeListingEntitlement(
        'admin-2',
        '550e8400-e29b-41d4-a716-446655440000',
        '650e8400-e29b-41d4-a716-446655440000',
        { reason: 'Grant przyznany omyłkowo' },
      ),
    ).resolves.toEqual({ id: 'entitlement-1' });
    expect(entitlementsService.revokeAdminEntitlement).toHaveBeenCalledWith({
      actorUserId: 'admin-2',
      listingId: '550e8400-e29b-41d4-a716-446655440000',
      entitlementId: '650e8400-e29b-41d4-a716-446655440000',
      reason: 'Grant przyznany omyłkowo',
    });
  });

  it('creates a manual adjustment as the current admin user', async () => {
    const { controller, manualAdjustmentsService } = buildController();
    manualAdjustmentsService.createAdjustment.mockResolvedValue({
      id: 'adjustment-1',
    });

    await expect(
      controller.createManualAdjustment(
        'admin-1',
        '550e8400-e29b-41d4-a716-446655440000',
        {
          label: 'Ręczna korekta ceny',
          reason: 'Rekompensata po kontakcie z supportem',
          discountType: ListingPromotionDiscountType.FIXED_GROSS,
          discountValue: 1_000,
          endsAt: '2026-09-20T10:00:00.000Z',
        },
      ),
    ).resolves.toEqual({ id: 'adjustment-1' });
    expect(manualAdjustmentsService.createAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'admin-1',
        listingId: '550e8400-e29b-41d4-a716-446655440000',
        label: 'Ręczna korekta ceny',
        reason: 'Rekompensata po kontakcie z supportem',
        discountType: ListingPromotionDiscountType.FIXED_GROSS,
        discountValue: 1_000,
        endsAt: new Date('2026-09-20T10:00:00.000Z'),
      }),
    );
  });

  it('archives a manual adjustment as the current admin user', async () => {
    const { controller, manualAdjustmentsService } = buildController();
    manualAdjustmentsService.archiveAdjustment.mockResolvedValue({
      id: 'adjustment-1',
    });

    await expect(
      controller.archiveManualAdjustment(
        'admin-2',
        '550e8400-e29b-41d4-a716-446655440000',
        '650e8400-e29b-41d4-a716-446655440000',
        { reason: 'Korekta nie jest już potrzebna' },
      ),
    ).resolves.toEqual({ id: 'adjustment-1' });
    expect(manualAdjustmentsService.archiveAdjustment).toHaveBeenCalledWith({
      actorUserId: 'admin-2',
      listingId: '550e8400-e29b-41d4-a716-446655440000',
      adjustmentId: '650e8400-e29b-41d4-a716-446655440000',
      reason: 'Korekta nie jest już potrzebna',
    });
  });
});
