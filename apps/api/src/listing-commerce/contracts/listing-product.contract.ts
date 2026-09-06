import type {
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
  currency: string;
  vatRateBasisPoints: number | null;
  durationDays: number;
  featuredTier: string | null;
  priorityWeight: number;
  fulfillmentParameters: ListingProductFulfillmentParameters;
  sortOrder: number;
}
