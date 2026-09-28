export interface ReleaseFlags {
  publicListingsEnabled: boolean;
  publicLeadFormsEnabled: boolean;
  publicClaimFlowEnabled: boolean;
  freemiumUpsellEnabled: boolean;
  premiumReportsEnabled: boolean;
  agentListingMarketplaceEnabled: boolean;
  privateListingPricingEnabled: boolean;
  privateListingCheckoutEnabled: boolean;
  privateListingFeaturedEnabled: boolean;
  privateListingPromotionsEnabled: boolean;
}

export const DEFAULT_RELEASE_FLAGS: ReleaseFlags = {
  publicListingsEnabled: false,
  publicLeadFormsEnabled: false,
  publicClaimFlowEnabled: false,
  freemiumUpsellEnabled: true,
  premiumReportsEnabled: true,
  agentListingMarketplaceEnabled: false,
  privateListingPricingEnabled: false,
  privateListingCheckoutEnabled: false,
  privateListingFeaturedEnabled: false,
  privateListingPromotionsEnabled: false,
};

export function getResolvedReleaseFlags(
  flags?: Partial<ReleaseFlags> | null,
): ReleaseFlags {
  return {
    ...DEFAULT_RELEASE_FLAGS,
    ...flags,
  };
}
