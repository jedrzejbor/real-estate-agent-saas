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
import { ListingOrder, ListingPaymentAttempt } from './entities';
import {
  CreateListingPaymentSessionInput,
  LISTING_PAYMENT_GATEWAY,
  ListingPaymentGateway,
} from './listing-payment-gateway.port';
import {
  assertListingOrderStatusTransition,
  InvalidListingCommerceTransitionError,
} from './listing-commerce.policy';
import {
  ListingOrderStatus,
  ListingPaymentAttemptStatus,
} from './listing-commerce.types';

const CHECKOUT_ELIGIBLE_ORDER_STATUSES = new Set([
  ListingOrderStatus.DRAFT,
  ListingOrderStatus.PENDING_PAYMENT,
  ListingOrderStatus.PAYMENT_FAILED,
]);
const OPEN_ATTEMPT_STATUSES = new Set([
  ListingPaymentAttemptStatus.CREATING,
  ListingPaymentAttemptStatus.PENDING,
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
      this.prepareAttempt(manager, buyerUserId, orderId),
    );

    // Never keep a database transaction open during a provider network call.
    // A retry reuses the durable attempt ID and therefore the same Stripe
    // idempotency key. A new attempt gets a new key and a new session.
    const session =
      await this.paymentGateway.createCheckoutSession(paymentInput);

    return this.dataSource.transaction(async (manager) => {
      const order = await this.findOwnedOrderForUpdate(
        manager,
        buyerUserId,
        orderId,
      );
      const attempt = await this.findAttemptForUpdate(
        manager,
        paymentInput.paymentAttemptId,
        order.id,
      );
      if (!attempt) {
        throw new ConflictException('Próba płatności nie istnieje');
      }
      if (
        !OPEN_ATTEMPT_STATUSES.has(attempt.status) ||
        order.status !== ListingOrderStatus.PENDING_PAYMENT
      ) {
        throw new ConflictException(
          'Stan próby nie pozwala powiązać sesji płatniczej',
        );
      }
      if (
        attempt.provider !== session.provider ||
        (attempt.providerCheckoutSessionId &&
          attempt.providerCheckoutSessionId !== session.sessionId)
      ) {
        throw new ConflictException(
          'Próba jest już powiązana z inną sesją płatniczą',
        );
      }

      attempt.providerCheckoutSessionId = session.sessionId;
      attempt.status = ListingPaymentAttemptStatus.PENDING;
      attempt.expiresAt = session.expiresAt ?? attempt.expiresAt;
      await manager.save(ListingPaymentAttempt, attempt);

      // Compatibility/cache fields point to the current attempt. Webhooks use
      // listing_payment_attempts as their authoritative session history.
      order.provider = session.provider;
      order.providerCheckoutSessionId = session.sessionId;
      order.quoteExpiresAt = attempt.expiresAt;
      order.metadata = {
        ...order.metadata,
        currentPaymentAttemptId: attempt.id,
        checkoutSessionExpiresAt: attempt.expiresAt.toISOString(),
      };
      await manager.save(ListingOrder, order);

      return {
        orderId: order.id,
        orderStatus: order.status,
        paymentAttemptId: attempt.id,
        attemptNumber: attempt.attemptNumber,
        provider: session.provider,
        sessionId: session.sessionId,
        checkoutUrl: session.checkoutUrl,
        expiresAt: attempt.expiresAt.toISOString(),
      };
    });
  }

  private async prepareAttempt(
    manager: EntityManager,
    buyerUserId: string,
    orderId: string,
  ): Promise<CreateListingPaymentSessionInput> {
    const order = await this.findOwnedOrderForUpdate(
      manager,
      buyerUserId,
      orderId,
    );
    const now = new Date();

    if (order.totalGrossAmount <= 0) {
      throw new ConflictException('Zamówienie nie wymaga płatności');
    }
    if (!CHECKOUT_ELIGIBLE_ORDER_STATUSES.has(order.status)) {
      throw new ConflictException(
        'Stan zamówienia nie pozwala rozpocząć płatności',
      );
    }

    const latestAttempt = await this.findLatestAttemptForUpdate(
      manager,
      order.id,
    );
    let attempt: ListingPaymentAttempt;

    if (latestAttempt && OPEN_ATTEMPT_STATUSES.has(latestAttempt.status)) {
      if (latestAttempt.expiresAt.getTime() <= now.getTime()) {
        throw new ConflictException('Próba płatności wygasła');
      }
      attempt = latestAttempt;
    } else {
      if (
        latestAttempt &&
        (latestAttempt.status !== ListingPaymentAttemptStatus.FAILED ||
          order.status !== ListingOrderStatus.PAYMENT_FAILED)
      ) {
        throw new ConflictException(
          'Stan zamówienia nie pozwala utworzyć kolejnej próby płatności',
        );
      }
      const pricingExpiresAt = getOriginalPricingExpiry(order);
      if (pricingExpiresAt.getTime() <= now.getTime()) {
        throw new ConflictException('Wycena zamówienia wygasła');
      }

      attempt = manager.create(ListingPaymentAttempt, {
        orderId: order.id,
        attemptNumber: (latestAttempt?.attemptNumber ?? 0) + 1,
        status: ListingPaymentAttemptStatus.CREATING,
        provider: this.paymentGateway.provider,
        amountGross: order.totalGrossAmount,
        currency: order.currency,
        providerCheckoutSessionId: null,
        providerPaymentId: null,
        failureCode: null,
        failureMessage: null,
        expiresAt: new Date(
          now.getTime() +
            CHECKOUT_VALIDITY_MS +
            PROVIDER_EXPIRY_CLOCK_SKEW_MS,
        ),
        startedAt: now,
        completedAt: null,
      });
      attempt = await manager.save(ListingPaymentAttempt, attempt);
    }

    if (attempt.provider !== this.paymentGateway.provider) {
      throw new ConflictException(
        'Próba jest przypisana do innego operatora płatności',
      );
    }
    if (order.status !== ListingOrderStatus.PENDING_PAYMENT) {
      transitionToPendingPayment(order);
    }
    order.quoteExpiresAt = attempt.expiresAt;
    order.metadata = {
      ...order.metadata,
      currentPaymentAttemptId: attempt.id,
      checkoutInitiatedAt: attempt.startedAt.toISOString(),
      checkoutAttemptExpiresAt: attempt.expiresAt.toISOString(),
    };
    await manager.save(ListingOrder, order);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentAttemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      buyerEmail: order.buyerSnapshot.email,
      currency: attempt.currency,
      totalGrossAmount: attempt.amountGross,
      itemNames: (order.items ?? []).map(
        (item) => item.productNameSnapshot,
      ),
      expiresAt: attempt.expiresAt,
    };
  }

  private findLatestAttemptForUpdate(
    manager: EntityManager,
    orderId: string,
  ): Promise<ListingPaymentAttempt | null> {
    return manager.findOne(ListingPaymentAttempt, {
      where: { orderId },
      order: { attemptNumber: 'DESC' },
      lock: { mode: 'pessimistic_write' },
    });
  }

  private findAttemptForUpdate(
    manager: EntityManager,
    attemptId: string,
    orderId: string,
  ): Promise<ListingPaymentAttempt | null> {
    return manager.findOne(ListingPaymentAttempt, {
      where: { id: attemptId, orderId },
      lock: { mode: 'pessimistic_write' },
    });
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

function getOriginalPricingExpiry(order: ListingOrder): Date {
  const snapshotExpiry = order.pricingSnapshot?.expiresAt;
  if (typeof snapshotExpiry !== 'string') return order.quoteExpiresAt;
  const parsed = new Date(snapshotExpiry);
  return Number.isNaN(parsed.getTime()) ? order.quoteExpiresAt : parsed;
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
