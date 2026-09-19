import type { ListingPublicationStatus, ListingStatus } from '../../common/enums';
import type {
  ListingEntitlementSource,
  ListingEntitlementStatus,
  ListingEntitlementType,
  ListingPromotionDiscountType,
  ListingPromotionTargetRules,
  ListingPromotionTargetScope,
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
  manualAdjustments: AdminListingManualAdjustmentContract[];
}

export interface AdminListingManualAdjustmentContract {
  id: string;
  listingId: string;
  label: string;
  reason: string;
  discountType: ListingPromotionDiscountType;
  discountValue: number;
  maxDiscountGrossAmount: number | null;
  targetScope: ListingPromotionTargetScope;
  targetRules: ListingPromotionTargetRules;
  startsAt: string;
  endsAt: string;
  createdByUserId: string | null;
  archivedByUserId: string | null;
  archivedReason: string | null;
  archivedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
