import type {
  AgencyPlanBillingInterval,
  AgencyPlanPromotionApplicationTiming,
  AgencyPlanPromotionDiscountType,
  AgencyPlanPromotionStatus,
  AgencyPlanPromotionTargetRules,
  AgencyPlanPromotionTargetScope,
} from '../agency-plan-commerce.types';
import type { AgencyPlan } from '../../common/enums';

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

export interface AdminAgencyPlanPromotionSalesReportContract {
  campaign: Pick<
    AdminAgencyPlanPromotionCampaignContract,
    'id' | 'code' | 'name' | 'usageCount' | 'usageLimitTotal'
  >;
  totals: {
    redemptionCount: number;
    discountGrossAmount: number;
    subtotalGrossAmount: number;
    totalGrossAmount: number;
    firstRedemptionAt: Date | null;
    lastRedemptionAt: Date | null;
  };
  byPlan: AdminAgencyPlanPromotionPlanSalesContract[];
  byCode: AdminAgencyPlanPromotionCodeSalesContract[];
}

export interface AdminAgencyPlanPromotionPlanSalesContract {
  planCode: AgencyPlan;
  billingInterval: AgencyPlanBillingInterval;
  redemptionCount: number;
  discountGrossAmount: number;
  subtotalGrossAmount: number;
  totalGrossAmount: number;
}

export interface AdminAgencyPlanPromotionCodeSalesContract {
  codeId: string;
  codeLast4: string | null;
  label: string;
  redemptionCount: number;
  discountGrossAmount: number;
  subtotalGrossAmount: number;
  totalGrossAmount: number;
}
