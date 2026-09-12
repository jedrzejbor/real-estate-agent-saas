jest.mock('./api-client', () => ({ apiFetch: jest.fn() }));

import { apiFetch } from './api-client';
import {
  archiveAdminListingManualAdjustment,
  createAdminListingManualAdjustment,
  createEmptyAdminEntitlementGrantForm,
  fetchAdminListingCommerceSummary,
  grantAdminListingEntitlement,
  ListingProductType,
  ListingPromotionDiscountType,
  revokeAdminListingEntitlement,
  toGrantListingEntitlementInput,
  validateRevokeListingEntitlementReason,
  validateAdminEntitlementGrantForm,
} from './listing-entitlements';

const apiFetchMock = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('listing entitlement admin boundary', () => {
  beforeEach(() => apiFetchMock.mockReset());

  it('validates and converts an admin publication grant form', () => {
    const values = {
      ...createEmptyAdminEntitlementGrantForm(),
      durationDays: '60',
      reason: 'Rekompensata po zgłoszeniu klienta',
    };

    expect(validateAdminEntitlementGrantForm(values).errors).toEqual({});
    expect(toGrantListingEntitlementInput(values)).toEqual({
      productType: ListingProductType.PUBLICATION,
      durationDays: 60,
      reason: 'Rekompensata po zgłoszeniu klienta',
      featuredTier: null,
    });
  });

  it('requires featured tier only for featured grants', () => {
    const featuredWithoutTier = validateAdminEntitlementGrantForm({
      ...createEmptyAdminEntitlementGrantForm(),
      productType: ListingProductType.FEATURED,
      durationDays: '7',
      reason: 'Promocyjne wyróżnienie',
      featuredTier: '',
      priorityWeight: '100',
    });
    const publicationWithTier = validateAdminEntitlementGrantForm({
      ...createEmptyAdminEntitlementGrantForm(),
      productType: ListingProductType.PUBLICATION,
      durationDays: '60',
      reason: 'Rekompensata po zgłoszeniu klienta',
      featuredTier: 'standard',
    });

    expect(featuredWithoutTier.errors.featuredTier).toBeDefined();
    expect(publicationWithTier.errors.featuredTier).toBeDefined();
  });

  it('converts featured grant fields for API payload', () => {
    expect(
      toGrantListingEntitlementInput({
        ...createEmptyAdminEntitlementGrantForm(),
        productType: ListingProductType.FEATURED,
        durationDays: '7',
        reason: 'Promocyjne wyróżnienie po kontakcie z supportem',
        featuredTier: 'standard',
        priorityWeight: '100',
      }),
    ).toEqual({
      productType: ListingProductType.FEATURED,
      durationDays: 7,
      reason: 'Promocyjne wyróżnienie po kontakcie z supportem',
      featuredTier: 'standard',
      priorityWeight: 100,
    });
  });

  it('fetches the admin commerce summary for a listing', async () => {
    apiFetchMock.mockResolvedValueOnce({ entitlements: [] });

    await fetchAdminListingCommerceSummary('listing-1');

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/admin/listings/listing-1/commerce-summary',
    );
  });

  it('posts an admin grant request for a listing', async () => {
    apiFetchMock.mockResolvedValueOnce({ id: 'entitlement-1' });

    await grantAdminListingEntitlement('listing-1', {
      productType: ListingProductType.RENEWAL,
      durationDays: 60,
      reason: 'Przedłużenie obsługi posprzedażowej',
      featuredTier: null,
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/admin/listings/listing-1/entitlement-grants',
      {
        method: 'POST',
        body: {
          productType: ListingProductType.RENEWAL,
          durationDays: 60,
          reason: 'Przedłużenie obsługi posprzedażowej',
          featuredTier: null,
        },
      },
    );
  });

  it('validates revoke reasons before sending an admin operation', () => {
    expect(validateRevokeListingEntitlementReason('x')).toBe(
      'Podaj powód cofnięcia grantu',
    );
    expect(
      validateRevokeListingEntitlementReason('Grant przyznany omyłkowo'),
    ).toBeNull();
  });

  it('posts an admin revoke request for a grant', async () => {
    apiFetchMock.mockResolvedValueOnce({ id: 'entitlement-1' });

    await revokeAdminListingEntitlement('listing-1', 'entitlement-1', {
      reason: ' Grant przyznany omyłkowo ',
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/admin/listings/listing-1/entitlements/entitlement-1/revoke',
      {
        method: 'POST',
        body: { reason: 'Grant przyznany omyłkowo' },
      },
    );
  });

  it('posts an admin manual adjustment request for a listing', async () => {
    apiFetchMock.mockResolvedValueOnce({ id: 'adjustment-1' });

    await createAdminListingManualAdjustment('listing-1', {
      label: ' Ręczna korekta ceny ',
      reason: ' Rekompensata po kontakcie z supportem ',
      discountType: ListingPromotionDiscountType.FIXED_GROSS,
      discountValue: 1_000,
      endsAt: '2026-09-20T10:00:00.000Z',
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/admin/listings/listing-1/manual-adjustments',
      {
        method: 'POST',
        body: {
          label: 'Ręczna korekta ceny',
          reason: 'Rekompensata po kontakcie z supportem',
          discountType: ListingPromotionDiscountType.FIXED_GROSS,
          discountValue: 1_000,
          endsAt: '2026-09-20T10:00:00.000Z',
        },
      },
    );
  });

  it('posts an admin archive request for a manual adjustment', async () => {
    apiFetchMock.mockResolvedValueOnce({ id: 'adjustment-1' });

    await archiveAdminListingManualAdjustment('listing-1', 'adjustment-1', {
      reason: ' Korekta nie jest już potrzebna ',
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/admin/listings/listing-1/manual-adjustments/adjustment-1/archive',
      {
        method: 'POST',
        body: { reason: 'Korekta nie jest już potrzebna' },
      },
    );
  });
});
