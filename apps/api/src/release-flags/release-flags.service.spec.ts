import { ReleaseFlagsService } from './release-flags.service';

describe('ReleaseFlagsService', () => {
  it('keeps staged commerce capabilities disabled by default', () => {
    const service = new ReleaseFlagsService({
      get: jest.fn().mockReturnValue(undefined),
    } as never);

    expect(service.getFlags()).toMatchObject({
      agentListingMarketplaceEnabled: false,
      privateListingPricingEnabled: false,
      privateListingCheckoutEnabled: false,
      privateListingFeaturedEnabled: false,
      privateListingPromotionsEnabled: false,
    });
  });

  it('resolves agent listing marketplace rollout from env-like boolean values', () => {
    const configService = {
      get: jest.fn((key: string) =>
        key === 'RELEASE_FLAG_AGENT_LISTING_MARKETPLACE_ENABLED'
          ? 'true'
          : undefined,
      ),
    };
    const service = new ReleaseFlagsService(configService as never);

    expect(service.getFlags().agentListingMarketplaceEnabled).toBe(true);
  });

  it('resolves private listing commerce flags independently', () => {
    const enabledFlags = new Set([
      'RELEASE_FLAG_PRIVATE_LISTING_PRICING_ENABLED',
      'RELEASE_FLAG_PRIVATE_LISTING_FEATURED_ENABLED',
    ]);
    const configService = {
      get: jest.fn((key: string) => (enabledFlags.has(key) ? 'true' : 'false')),
    };
    const service = new ReleaseFlagsService(configService as never);

    expect(service.getFlags()).toMatchObject({
      privateListingPricingEnabled: true,
      privateListingCheckoutEnabled: false,
      privateListingFeaturedEnabled: true,
      privateListingPromotionsEnabled: false,
    });
  });
});
