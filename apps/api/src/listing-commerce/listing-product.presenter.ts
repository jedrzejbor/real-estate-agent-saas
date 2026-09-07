import type {
  AdminListingProductChangeContract,
  AdminListingProductContract,
  PublicListingProductContract,
} from './contracts';
import type {
  ListingProductCatalog,
  ListingProductChange,
} from './entities';
import { buildListingProductFulfillmentParameters } from './listing-commerce.policy';

export function toPublicListingProduct(
  product: ListingProductCatalog,
): PublicListingProductContract {
  return {
    code: product.code,
    name: product.name,
    description: product.description ?? null,
    type: product.type,
    priceGrossAmount: product.priceGrossAmount,
    currency: product.currency,
    vatRateBasisPoints: product.vatRateBasisPoints ?? null,
    durationDays: product.durationDays,
    featuredTier: product.featuredTier ?? null,
    sortOrder: product.sortOrder,
  };
}

export function toAdminListingProduct(
  product: ListingProductCatalog,
): AdminListingProductContract {
  return {
    ...toPublicListingProduct(product),
    id: product.id,
    isPublic: product.isPublic,
    isActive: product.isActive,
    priorityWeight: product.priorityWeight,
    fulfillmentParameters: buildListingProductFulfillmentParameters(product),
    providerPriceReference: product.providerPriceReference ?? null,
    archivedAt: product.archivedAt ?? null,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export function toAdminListingProductChange(
  change: ListingProductChange,
): AdminListingProductChangeContract {
  return {
    id: change.id,
    productId: change.productId,
    actorUserId: change.actorUserId ?? null,
    action: change.action,
    changes: change.changes,
    reason: change.reason ?? null,
    createdAt: change.createdAt,
  };
}
