import type {
  AdminListingPromotionCampaignContract,
  AdminListingPromotionCodeContract,
} from './contracts';
import type {
  ListingPromotionCampaign,
  ListingPromotionCode,
} from './entities';

export function toAdminListingPromotionCode(
  code: ListingPromotionCode,
): AdminListingPromotionCodeContract {
  return {
    id: code.id,
    campaignId: code.campaignId,
    codeLast4: code.codeLast4 ?? null,
    label: code.label,
    status: code.status,
    discountType: code.discountType ?? null,
    discountValue: code.discountValue ?? null,
    maxDiscountGrossAmount: code.maxDiscountGrossAmount ?? null,
    isCombinable: code.isCombinable ?? null,
    usageLimitTotal: code.usageLimitTotal ?? null,
    usageLimitPerUser: code.usageLimitPerUser ?? null,
    usageCount: code.usageCount,
    startsAt: code.startsAt ?? null,
    endsAt: code.endsAt ?? null,
    archivedAt: code.archivedAt ?? null,
    createdAt: code.createdAt,
    updatedAt: code.updatedAt,
  };
}

export function toAdminListingPromotionCampaign(
  campaign: ListingPromotionCampaign,
): AdminListingPromotionCampaignContract {
  return {
    id: campaign.id,
    code: campaign.code,
    name: campaign.name,
    description: campaign.description ?? null,
    status: campaign.status,
    discountType: campaign.discountType,
    discountValue: campaign.discountValue,
    maxDiscountGrossAmount: campaign.maxDiscountGrossAmount ?? null,
    targetScope: campaign.targetScope,
    targetRules: campaign.targetRules ?? {},
    isAutomatic: campaign.isAutomatic,
    isCombinable: campaign.isCombinable,
    usageLimitTotal: campaign.usageLimitTotal ?? null,
    usageLimitPerUser: campaign.usageLimitPerUser ?? null,
    usageCount: campaign.usageCount,
    startsAt: campaign.startsAt ?? null,
    endsAt: campaign.endsAt ?? null,
    archivedAt: campaign.archivedAt ?? null,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    codes: (campaign.codes ?? []).map(toAdminListingPromotionCode),
  };
}
