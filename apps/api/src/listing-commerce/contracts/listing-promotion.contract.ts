import type {
  ListingPromotionCampaignStatus,
  ListingPromotionDiscountType,
  ListingPromotionTargetRules,
  ListingPromotionTargetScope,
} from '../listing-commerce.types';

export interface AdminListingPromotionCodeContract {
  id: string;
  campaignId: string;
  codeLast4: string | null;
  label: string;
  status: ListingPromotionCampaignStatus;
  discountType: ListingPromotionDiscountType | null;
  discountValue: number | null;
  maxDiscountGrossAmount: number | null;
  isCombinable: boolean | null;
  usageLimitTotal: number | null;
  usageLimitPerUser: number | null;
  usageCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminListingPromotionCampaignContract {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: ListingPromotionCampaignStatus;
  discountType: ListingPromotionDiscountType;
  discountValue: number;
  maxDiscountGrossAmount: number | null;
  targetScope: ListingPromotionTargetScope;
  targetRules: ListingPromotionTargetRules;
  isAutomatic: boolean;
  isCombinable: boolean;
  usageLimitTotal: number | null;
  usageLimitPerUser: number | null;
  usageCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  codes: AdminListingPromotionCodeContract[];
}
