import type { ListingPublicationStatus, ListingStatus } from '../../common/enums';
import type {
  ListingEntitlementSource,
  ListingEntitlementStatus,
  ListingEntitlementType,
  ListingProductType,
} from '../listing-commerce.types';

export interface AdminListingEntitlementAuditContract {
  grantedByUserId: string | null;
  grantedAt: string | null;
  reason: string | null;
  productType: ListingProductType | null;
  revokedByUserId: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
}

export interface AdminListingEntitlementContract {
  id: string;
  type: ListingEntitlementType;
  status: ListingEntitlementStatus;
  tier: string | null;
  sourceType: ListingEntitlementSource;
  orderItemId: string | null;
  startsAt: string;
  endsAt: string;
  createdAt: string | null;
  audit: AdminListingEntitlementAuditContract;
}

export interface AdminListingCommerceSummaryContract {
  listing: {
    id: string;
    title: string;
    publicSlug: string | null;
    status: ListingStatus;
    publicationStatus: ListingPublicationStatus;
    publishedAt: string | null;
    unpublishedAt: string | null;
    expiresAt: string | null;
    isPremium: boolean;
  };
  entitlements: AdminListingEntitlementContract[];
}
