import type { ListingOrderContract } from './contracts';
import { ListingOrder } from './entities';
import {
  ListingOrderStatus,
  ListingPaymentAttemptStatus,
} from './listing-commerce.types';

const PAYABLE_ORDER_STATUSES = new Set([
  ListingOrderStatus.DRAFT,
  ListingOrderStatus.PENDING_PAYMENT,
  ListingOrderStatus.PAYMENT_FAILED,
]);

export function toListingOrderContract(
  order: ListingOrder,
): ListingOrderContract {
  const attemptsNewestFirst = [...(order.paymentAttempts ?? [])].sort(
    (left, right) => right.attemptNumber - left.attemptNumber,
  );

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
    canRetryPayment:
      order.status === ListingOrderStatus.PAYMENT_FAILED &&
      attemptsNewestFirst[0]?.status === ListingPaymentAttemptStatus.FAILED,
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
    paymentAttempts: attemptsNewestFirst.map((attempt) => ({
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        amountGross: attempt.amountGross,
        currency: attempt.currency,
        failureCode: attempt.failureCode ?? null,
        expiresAt: attempt.expiresAt.toISOString(),
        startedAt: attempt.startedAt.toISOString(),
        completedAt: attempt.completedAt?.toISOString() ?? null,
      })),
    createdAt: order.createdAt.toISOString(),
  };
}
