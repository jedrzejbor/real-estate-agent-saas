import type { AdminListingManualAdjustmentContract } from './contracts';
import { ListingManualAdjustment } from './entities';

export function toAdminListingManualAdjustment(
  adjustment: ListingManualAdjustment,
): AdminListingManualAdjustmentContract {
  return {
    id: adjustment.id,
    listingId: adjustment.listingId,
    label: adjustment.label,
    reason: adjustment.reason,
    discountType: adjustment.discountType,
    discountValue: adjustment.discountValue,
    maxDiscountGrossAmount: adjustment.maxDiscountGrossAmount ?? null,
    targetScope: adjustment.targetScope,
    targetRules: adjustment.targetRules ?? {},
    startsAt: adjustment.startsAt.toISOString(),
    endsAt: adjustment.endsAt.toISOString(),
    createdByUserId: adjustment.createdByUserId ?? null,
    archivedByUserId: adjustment.archivedByUserId ?? null,
    archivedReason: adjustment.archivedReason ?? null,
    archivedAt: adjustment.archivedAt?.toISOString() ?? null,
    createdAt: adjustment.createdAt?.toISOString() ?? null,
    updatedAt: adjustment.updatedAt?.toISOString() ?? null,
  };
}
