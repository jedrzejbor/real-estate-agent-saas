import type {
  AgencyPlanPromotionApplicationTiming,
  AgencyPlanPromotionDiscountType,
  AgencyPlanPromotionStatus,
  AgencyPlanPromotionTargetRules,
  AgencyPlanPromotionTargetScope,
} from '../agency-plan-commerce.types';

export interface AdminAgencyPlanPromotionCodeContract {
  id: string;
  campaignId: string;
  codeLast4: string | null;
  label: string;
  status: AgencyPlanPromotionStatus;
  discountType: AgencyPlanPromotionDiscountType | null;
  discountValue: number | null;
  maxDiscountGrossAmount: number | null;
  durationBillingCycles: number | null;
  applicationTiming: AgencyPlanPromotionApplicationTiming | null;
  isCombinable: boolean | null;
  usageLimitTotal: number | null;
  usageLimitPerAccount: number | null;
  usageCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminAgencyPlanPromotionCampaignContract {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: AgencyPlanPromotionStatus;
  discountType: AgencyPlanPromotionDiscountType;
  discountValue: number;
  maxDiscountGrossAmount: number | null;
  targetScope: AgencyPlanPromotionTargetScope;
  targetRules: AgencyPlanPromotionTargetRules;
  durationBillingCycles: number;
  applicationTiming: AgencyPlanPromotionApplicationTiming;
  isAutomatic: boolean;
  isCombinable: boolean;
  usageLimitTotal: number | null;
  usageLimitPerAccount: number | null;
  usageCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  codes: AdminAgencyPlanPromotionCodeContract[];
}
