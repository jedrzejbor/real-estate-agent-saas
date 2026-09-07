import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ReleaseFlagsService } from '../release-flags';
import type { ListingCheckoutSessionContract } from './contracts';
import { ListingOrder } from './entities';
import {
  LISTING_PAYMENT_GATEWAY,
  ListingPaymentGateway,
} from './listing-payment-gateway.port';
import {
  assertListingOrderStatusTransition,
  InvalidListingCommerceTransitionError,
} from './listing-commerce.policy';
import { ListingOrderStatus } from './listing-commerce.types';

const CHECKOUT_ELIGIBLE_STATUSES = new Set([
  ListingOrderStatus.DRAFT,
  ListingOrderStatus.PENDING_PAYMENT,
]);
const CHECKOUT_VALIDITY_MS = 30 * 60 * 1_000;
const PROVIDER_EXPIRY_CLOCK_SKEW_MS = 5_000;

@Injectable()
export class ListingCheckoutSessionsService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(LISTING_PAYMENT_GATEWAY)
    private readonly paymentGateway: ListingPaymentGateway,
    private readonly releaseFlagsService: ReleaseFlagsService,
  ) {}

  async createOwnedCheckoutSession(
    buyerUserId: string,
    orderId: string,
  ): Promise<ListingCheckoutSessionContract> {
    if (!this.releaseFlagsService.getFlags().privateListingCheckoutEnabled) {
      throw new ServiceUnavailableException(
        'Płatności za produkty ogłoszeniowe są obecnie niedostępne',
      );
    }

    const paymentInput = await this.dataSource.transaction((manager) =>
      this.prepareOrder(manager, buyerUserId, orderId),
    );

    // Never keep a database transaction open during a provider network call.
    // The provider idempotency key is derived from the immutable order ID.
    const session =
      await this.paymentGateway.createCheckoutSession(paymentInput);

    return this.dataSource.transaction(async (manager) => {
      const order = await this.findOwnedOrderForUpdate(
        manager,
        buyerUserId,
        orderId,
      );
      if (order.status !== ListingOrderStatus.PENDING_PAYMENT) {
        throw new ConflictException(
          'Stan zamówienia nie pozwala powiązać sesji płatniczej',
        );
      }
      if (
        (order.provider && order.provider !== session.provider) ||
        (order.providerCheckoutSessionId &&
          order.providerCheckoutSessionId !== session.sessionId)
      ) {
        throw new ConflictException(
          'Zamówienie jest już powiązane z inną sesją płatniczą',
        );
      }

      order.provider = session.provider;
      order.providerCheckoutSessionId = session.sessionId;
      order.metadata = {
        ...order.metadata,
        checkoutSessionExpiresAt: session.expiresAt?.toISOString() ?? null,
      };
      await manager.save(ListingOrder, order);

      return {
        orderId: order.id,
        orderStatus: order.status,
        provider: session.provider,
        sessionId: session.sessionId,
        checkoutUrl: session.checkoutUrl,
        expiresAt: session.expiresAt?.toISOString() ?? null,
      };
    });
  }

  private async prepareOrder(
    manager: EntityManager,
    buyerUserId: string,
    orderId: string,
  ) {
    const order = await this.findOwnedOrderForUpdate(
      manager,
      buyerUserId,
      orderId,
    );
    const now = new Date();

    if (order.totalGrossAmount <= 0) {
      throw new ConflictException('Zamówienie nie wymaga płatności');
    }
    if (!CHECKOUT_ELIGIBLE_STATUSES.has(order.status)) {
      throw new ConflictException(
        'Stan zamówienia nie pozwala rozpocząć płatności',
      );
    }
    const previousCheckoutExpiry = getCheckoutAttemptExpiry(order.metadata);
    const eligibilityExpiry = previousCheckoutExpiry ?? order.quoteExpiresAt;
    if (eligibilityExpiry.getTime() <= now.getTime()) {
      throw new ConflictException('Wycena zamówienia wygasła');
    }
    if (order.provider && order.provider !== this.paymentGateway.provider) {
      throw new ConflictException(
        'Zamówienie jest przypisane do innego operatora płatności',
      );
    }

    const checkoutExpiresAt =
      previousCheckoutExpiry ??
      new Date(
        now.getTime() +
          CHECKOUT_VALIDITY_MS +
          PROVIDER_EXPIRY_CLOCK_SKEW_MS,
      );
    let orderChanged = false;
    if (order.status !== ListingOrderStatus.PENDING_PAYMENT) {
      transitionToPendingPayment(order);
      orderChanged = true;
    }
    if (!previousCheckoutExpiry) {
      order.metadata = {
        ...order.metadata,
        checkoutInitiatedAt:
          order.metadata.checkoutInitiatedAt ?? now.toISOString(),
        checkoutAttemptExpiresAt: checkoutExpiresAt.toISOString(),
      };
      // Once checkout starts, this is the authoritative unpaid-order expiry
      // used by collision cleanup and by the provider session.
      order.quoteExpiresAt = checkoutExpiresAt;
      orderChanged = true;
    }
    if (orderChanged) {
      await manager.save(ListingOrder, order);
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      buyerEmail: order.buyerSnapshot.email,
      currency: order.currency,
      totalGrossAmount: order.totalGrossAmount,
      itemNames: (order.items ?? []).map(
        (item) => item.productNameSnapshot,
      ),
      expiresAt: checkoutExpiresAt,
    };
  }

  private async findOwnedOrderForUpdate(
    manager: EntityManager,
    buyerUserId: string,
    orderId: string,
  ): Promise<ListingOrder> {
    const order = await manager.findOne(ListingOrder, {
      where: { id: orderId, buyerUserId },
      relations: ['items'],
      lock: { mode: 'pessimistic_write' },
    });
    if (!order) {
      throw new NotFoundException('Zamówienie nie istnieje');
    }
    return order;
  }
}

function getCheckoutAttemptExpiry(
  metadata: Record<string, unknown>,
): Date | null {
  const value = metadata.checkoutAttemptExpiresAt;
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function transitionToPendingPayment(order: ListingOrder): void {
  try {
    assertListingOrderStatusTransition(
      order.status,
      ListingOrderStatus.PENDING_PAYMENT,
    );
  } catch (error) {
    if (error instanceof InvalidListingCommerceTransitionError) {
      throw new ConflictException(
        'Stan zamówienia nie pozwala rozpocząć płatności',
      );
    }
    throw error;
  }
  order.status = ListingOrderStatus.PENDING_PAYMENT;
}
