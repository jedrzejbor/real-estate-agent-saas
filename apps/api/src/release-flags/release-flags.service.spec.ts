import { ReleaseFlagsService } from './release-flags.service';

describe('ReleaseFlagsService', () => {
  it('keeps agent listing marketplace rollout disabled by default', () => {
    const service = new ReleaseFlagsService({
      get: jest.fn().mockReturnValue(undefined),
    } as never);

    expect(service.getFlags().agentListingMarketplaceEnabled).toBe(false);
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
});
