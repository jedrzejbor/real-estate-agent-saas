import type {
  ListingEntitlementSource,
  ListingEntitlementStatus,
  ListingEntitlementType,
} from '../listing-commerce.types';

export interface ListingEntitlementContract {
  id: string;
  type: ListingEntitlementType;
  status: ListingEntitlementStatus;
  tier: string | null;
  sourceType: ListingEntitlementSource;
  startsAt: string;
  endsAt: string;
}
