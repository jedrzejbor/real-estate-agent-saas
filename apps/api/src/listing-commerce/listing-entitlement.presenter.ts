import type { ListingEntitlementContract } from './contracts';
import { ListingEntitlement } from './entities';

export function toListingEntitlementContract(
  entitlement: ListingEntitlement,
): ListingEntitlementContract {
  return {
    id: entitlement.id,
    type: entitlement.type,
    status: entitlement.status,
    tier: entitlement.tier ?? null,
    sourceType: entitlement.sourceType,
    startsAt: entitlement.startsAt.toISOString(),
    endsAt: entitlement.endsAt.toISOString(),
  };
}
