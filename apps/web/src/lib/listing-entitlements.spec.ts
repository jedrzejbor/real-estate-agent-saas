jest.mock('./api-client', () => ({ apiFetch: jest.fn() }));

import { apiFetch } from './api-client';
import {
  createEmptyAdminEntitlementGrantForm,
  fetchAdminListingCommerceSummary,
  grantAdminListingEntitlement,
  ListingProductType,
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
});
