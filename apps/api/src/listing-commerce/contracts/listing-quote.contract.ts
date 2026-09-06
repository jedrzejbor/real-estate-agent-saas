import type {
  ListingProductFulfillmentParameters,
  ListingProductType,
} from '../listing-commerce.types';

export type ListingDiscountSourceType =
  | 'campaign'
  | 'promotion_code'
  | 'admin_adjustment';

export interface ListingQuoteRequestItemContract {
  productCode: string;
  quantity: number;
}

export interface ListingQuoteRequestContract {
  listingId: string;
  items: ListingQuoteRequestItemContract[];
  promotionCode?: string;
}

export interface ListingAppliedDiscountContract {
  sourceType: ListingDiscountSourceType;
  /** Opaque internal reference persisted in the snapshot, never trusted from the client. */
  sourceReference: string;
  label: string;
  grossAmount: number;
}

export interface ListingQuoteItemContract {
  productCode: string;
  productName: string;
  productType: ListingProductType;
  quantity: number;
  unitGrossAmount: number;
  subtotalGrossAmount: number;
  discountGrossAmount: number;
  totalGrossAmount: number;
  vatRateBasisPoints: number | null;
  vatGrossAmount: number | null;
  durationDays: number;
  fulfillmentParameters: ListingProductFulfillmentParameters;
}

/**
 * Canonical quote response and pricing snapshot shape.
 * All monetary values use the smallest currency unit.
 */
export interface ListingQuoteContract {
  listingId: string;
  currency: string;
  quotedAt: string;
  expiresAt: string;
  items: ListingQuoteItemContract[];
  discounts: ListingAppliedDiscountContract[];
  subtotalGrossAmount: number;
  discountGrossAmount: number;
  totalGrossAmount: number;
  vatGrossAmount: number | null;
}
