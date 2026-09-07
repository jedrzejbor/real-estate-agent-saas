import type { ListingOrderContract } from './contracts';
import { ListingOrder } from './entities';
import { ListingOrderStatus } from './listing-commerce.types';

const PAYABLE_ORDER_STATUSES = new Set([
  ListingOrderStatus.DRAFT,
  ListingOrderStatus.PENDING_PAYMENT,
  ListingOrderStatus.PAYMENT_FAILED,
]);

export function toListingOrderContract(
  order: ListingOrder,
): ListingOrderContract {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    listingId: order.listingId!,
    status: order.status,
    currency: order.currency,
    subtotalGrossAmount: order.subtotalGrossAmount,
    discountGrossAmount: order.discountGrossAmount,
    totalGrossAmount: order.totalGrossAmount,
    vatGrossAmount: order.vatGrossAmount ?? null,
    quoteExpiresAt: order.quoteExpiresAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
    requiresPayment:
      order.totalGrossAmount > 0 && PAYABLE_ORDER_STATUSES.has(order.status),
    pricingSnapshot: order.pricingSnapshot,
    items: (order.items ?? []).map((item) => ({
      id: item.id,
      productId: item.productId,
      productCode: item.productCodeSnapshot,
      productName: item.productNameSnapshot,
      productType: item.productTypeSnapshot,
      quantity: item.quantity,
      unitGrossAmount: item.unitGrossAmount,
      subtotalGrossAmount: item.subtotalGrossAmount,
      discountGrossAmount: item.discountGrossAmount,
      totalGrossAmount: item.totalGrossAmount,
      vatRateBasisPoints: item.vatRateBasisPoints ?? null,
      vatGrossAmount: item.vatGrossAmount ?? null,
      durationDays: item.durationDays,
      fulfillmentParameters: item.fulfillmentParameters,
    })),
    createdAt: order.createdAt.toISOString(),
  };
}
