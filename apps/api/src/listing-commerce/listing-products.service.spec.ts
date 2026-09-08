import { IsNull } from 'typeorm';
import { ListingProductCatalog } from './entities';
import { ListingProductType } from './listing-commerce.types';
import { ListingProductsService } from './listing-products.service';

function buildProduct(
  overrides: Partial<ListingProductCatalog> = {},
): ListingProductCatalog {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    code: 'publication_60_days',
    name: 'Publikacja ogłoszenia',
    description: 'Publikacja na 60 dni',
    type: ListingProductType.PUBLICATION,
    priceGrossAmount: 4900,
    currency: 'PLN',
    vatRateBasisPoints: null,
    durationDays: 60,
    featuredTier: null,
    priorityWeight: 0,
    fulfillmentParameters: { durationDays: 60 },
    isPublic: true,
    isActive: true,
    sortOrder: 10,
    providerPriceReference: 'price_internal',
    archivedAt: null,
    createdAt: new Date('2026-09-07T10:00:00.000Z'),
    updatedAt: new Date('2026-09-07T10:00:00.000Z'),
    ...overrides,
  };
}

describe('ListingProductsService', () => {
  it('does not query or expose products while the pricing flag is disabled', async () => {
    const productRepo = { find: jest.fn() };
    const releaseFlagsService = {
      getFlags: jest.fn().mockReturnValue({
        privateListingPricingEnabled: false,
      }),
    };
    const service = new ListingProductsService(
      productRepo as never,
      releaseFlagsService as never,
    );

    await expect(service.findPublicProducts()).resolves.toEqual([]);
    expect(productRepo.find).not.toHaveBeenCalled();
  });

  it('returns only the safe public contract from active public products', async () => {
    const productRepo = {
      find: jest.fn().mockResolvedValue([buildProduct()]),
    };
    const releaseFlagsService = {
      getFlags: jest.fn().mockReturnValue({
        privateListingPricingEnabled: true,
      }),
    };
    const service = new ListingProductsService(
      productRepo as never,
      releaseFlagsService as never,
    );

    const products = await service.findPublicProducts();

    expect(productRepo.find).toHaveBeenCalledWith({
      where: {
        isActive: true,
        isPublic: true,
        archivedAt: IsNull(),
      },
      order: { sortOrder: 'ASC', code: 'ASC' },
    });
    expect(products).toEqual([
      expect.objectContaining({
        code: 'publication_60_days',
        priceGrossAmount: 4900,
        durationDays: 60,
      }),
    ]);
    expect(products[0]).not.toHaveProperty('id');
    expect(products[0]).not.toHaveProperty('isPublic');
    expect(products[0]).not.toHaveProperty('isActive');
    expect(products[0]).not.toHaveProperty('providerPriceReference');
    expect(products[0]).not.toHaveProperty('archivedAt');
    expect(products[0]).not.toHaveProperty('priorityWeight');
    expect(products[0]).not.toHaveProperty('fulfillmentParameters');
  });

  it('hides featured products until the independent rollout flag is enabled', async () => {
    const featured = buildProduct({
      id: '22222222-2222-4222-8222-222222222222',
      code: 'featured_7_days',
      name: 'Wyróżnienie ogłoszenia',
      type: ListingProductType.FEATURED,
      durationDays: 7,
      featuredTier: 'standard',
      priorityWeight: 100,
    });
    const productRepo = { find: jest.fn().mockResolvedValue([featured]) };
    const flags = { privateListingPricingEnabled: true, privateListingFeaturedEnabled: false };
    const releaseFlagsService = { getFlags: jest.fn().mockReturnValue(flags) };
    const service = new ListingProductsService(productRepo as never, releaseFlagsService as never);

    await expect(service.findPublicProducts()).resolves.toEqual([]);
    flags.privateListingFeaturedEnabled = true;
    await expect(service.findPublicProducts()).resolves.toHaveLength(1);
  });
});
