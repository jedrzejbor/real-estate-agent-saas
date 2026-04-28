export interface ReleaseFlags {
  publicListingsEnabled: boolean;
  publicLeadFormsEnabled: boolean;
  publicClaimFlowEnabled: boolean;
  freemiumUpsellEnabled: boolean;
  premiumReportsEnabled: boolean;
}

export const DEFAULT_RELEASE_FLAGS: ReleaseFlags = {
  publicListingsEnabled: false,
  publicLeadFormsEnabled: false,
  publicClaimFlowEnabled: false,
  freemiumUpsellEnabled: true,
  premiumReportsEnabled: true,
};

export function getResolvedReleaseFlags(
  flags?: Partial<ReleaseFlags> | null,
): ReleaseFlags {
  return {
    ...DEFAULT_RELEASE_FLAGS,
    ...flags,
  };
}
