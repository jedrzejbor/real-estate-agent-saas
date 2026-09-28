import type {
  ListingProductChangeAction,
  ListingProductChangeValue,
  ListingProductFulfillmentParameters,
  ListingProductType,
} from '../listing-commerce.types';

/** Safe public representation. Internal IDs and provider references stay private. */
export interface PublicListingProductContract {
  code: string;
  name: string;
  description: string | null;
  type: ListingProductType;
  priceGrossAmount: number;
  promotionPreview: PublicListingProductPromotionPreviewContract | null;
  currency: string;
  vatRateBasisPoints: number | null;
  durationDays: number;
  featuredTier: string | null;
  sortOrder: number;
}

export interface PublicListingProductPromotionPreviewContract {
  label: string;
  discountGrossAmount: number;
  priceGrossAmount: number;
}

export interface AdminListingProductContract
  extends PublicListingProductContract {
  id: string;
  isPublic: boolean;
  isActive: boolean;
  priorityWeight: number;
  fulfillmentParameters: ListingProductFulfillmentParameters;
  providerPriceReference: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminListingProductChangeContract {
  id: string;
  productId: string;
  actorUserId: string | null;
  action: ListingProductChangeAction;
  changes: ListingProductChangeValue[];
  reason: string | null;
  createdAt: Date;
}
