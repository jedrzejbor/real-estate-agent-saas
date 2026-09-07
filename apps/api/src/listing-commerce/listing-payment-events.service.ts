import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import type {
  ListingPaymentEventResultContract,
  VerifiedListingPaymentEventContract,
} from './contracts';
import { ListingOrder, ListingPaymentEvent } from './entities';
import { ListingEntitlementsService } from './listing-entitlements.service';
import {
  assertListingOrderStatusTransition,
  InvalidListingCommerceTransitionError,
} from './listing-commerce.policy';
import {
  ListingOrderStatus,
  ListingPaymentEventType,
} from './listing-commerce.types';

@Injectable()
export class ListingPaymentEventsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly listingEntitlementsService: ListingEntitlementsService,
  ) {}

  async processVerifiedEvent(
    input: VerifiedListingPaymentEventContract,
  ): Promise<ListingPaymentEventResultContract> {
    const event = normalizeAndValidateEvent(input);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const knownEvent = await this.findEvent(manager, event, true);
        if (knownEvent?.status === 'processed') {
          return duplicateResult(knownEvent, event.orderId);
        }

        const order = await manager.findOne(ListingOrder, {
          where: { id: event.orderId },
          relations: ['items'],
          lock: { mode: 'pessimistic_write' },
        });
        if (!order) throw new NotFoundException('Zamówienie nie istnieje');

        // A concurrent delivery can commit while this transaction waits for
        // the order lock. Recheck the durable event before applying effects.
        const concurrentEvent = await this.findEvent(manager, event, true);
        if (concurrentEvent?.status === 'processed') {
          return duplicateResult(concurrentEvent, order.id);
        }

        await assertOrBindProviderSession(manager, order, event);
        const outcome = await this.applyEvent(manager, order, event);
        const paymentEvent =
          concurrentEvent ??
          knownEvent ??
          manager.create(ListingPaymentEvent, {
            provider: event.provider,
            eventId: event.eventId,
            eventType: event.eventType,
            orderId: order.id,
            occurredAt: event.occurredAt,
          });
        paymentEvent.eventType = event.eventType;
        paymentEvent.orderId = order.id;
        paymentEvent.status = 'processed';
        paymentEvent.payload = {
          ...event.payload,
          processingOutcome: outcome,
          orderStatus: order.status,
        };
        paymentEvent.error = null;
        paymentEvent.occurredAt = event.occurredAt;
        paymentEvent.processedAt = new Date();
        await manager.save(ListingPaymentEvent, paymentEvent);

        return {
          status: outcome,
          orderId: order.id,
          orderStatus: order.status,
        };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const duplicate = await this.dataSource
          .getRepository(ListingPaymentEvent)
          .findOne({
            where: { provider: event.provider, eventId: event.eventId },
          });
        if (duplicate?.status === 'processed') {
          return duplicateResult(duplicate, event.orderId);
        }
      }
      await this.recordFailedEvent(event, error);
      throw error;
    }
  }

  private async applyEvent(
    manager: EntityManager,
    order: ListingOrder,
    event: NormalizedListingPaymentEvent,
  ): Promise<'processed' | 'ignored_stale'> {
    switch (event.eventType) {
      case ListingPaymentEventType.PAYMENT_SUCCEEDED:
        assertSuccessfulPaymentMatchesOrder(order, event);
        if (order.status !== ListingOrderStatus.PAID) {
          transitionOrder(order, ListingOrderStatus.PAID);
          order.providerPaymentId = event.paymentId;
          order.paidAt = event.occurredAt;
          await manager.save(ListingOrder, order);
        } else {
          if (
            order.providerPaymentId &&
            order.providerPaymentId !== event.paymentId
          ) {
            throw new ConflictException(
              'Zamówienie jest powiązane z inną płatnością operatora',
            );
          }
          if (!order.providerPaymentId) {
            order.providerPaymentId = event.paymentId;
            await manager.save(ListingOrder, order);
          }
        }
        await this.listingEntitlementsService.fulfillPaidOrderInTransaction(
          manager,
          order,
          order.paidAt ?? event.occurredAt,
        );
        return 'processed';

      case ListingPaymentEventType.PAYMENT_FAILED:
        if (order.status === ListingOrderStatus.PENDING_PAYMENT) {
          transitionOrder(order, ListingOrderStatus.PAYMENT_FAILED);
          await manager.save(ListingOrder, order);
          return 'processed';
        }
        return 'ignored_stale';

      case ListingPaymentEventType.CHECKOUT_EXPIRED:
        if (
          order.status === ListingOrderStatus.PENDING_PAYMENT ||
          order.status === ListingOrderStatus.PAYMENT_FAILED
        ) {
          transitionOrder(order, ListingOrderStatus.EXPIRED);
          await manager.save(ListingOrder, order);
          return 'processed';
        }
        return 'ignored_stale';
    }
  }

  private findEvent(
    manager: EntityManager,
    event: Pick<NormalizedListingPaymentEvent, 'provider' | 'eventId'>,
    lock: boolean,
  ): Promise<ListingPaymentEvent | null> {
    return manager.findOne(ListingPaymentEvent, {
      where: { provider: event.provider, eventId: event.eventId },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
  }

  private async recordFailedEvent(
    event: NormalizedListingPaymentEvent,
    error: unknown,
  ): Promise<void> {
    try {
      const repo = this.dataSource.getRepository(ListingPaymentEvent);
      const existing = await repo.findOne({
        where: { provider: event.provider, eventId: event.eventId },
      });
      if (existing?.status === 'processed') return;

      const failed = existing ?? repo.create({
        provider: event.provider,
        eventId: event.eventId,
        eventType: event.eventType,
        orderId: event.orderId,
        occurredAt: event.occurredAt,
      });
      failed.status = 'failed';
      failed.payload = event.payload;
      failed.error = getErrorMessage(error);
      failed.processedAt = new Date();
      await repo.save(failed);
    } catch {
      // Preserve the original processing error. Monitoring can detect a
      // missing audit row separately from the webhook retry response.
    }
  }
}

interface NormalizedListingPaymentEvent
  extends VerifiedListingPaymentEventContract {
  provider: string;
  paymentId: string | null;
  amountGross: number | null;
  currency: string | null;
  payload: Record<string, unknown>;
}

function normalizeAndValidateEvent(
  input: VerifiedListingPaymentEventContract,
): NormalizedListingPaymentEvent {
  const event: NormalizedListingPaymentEvent = {
    ...input,
    provider: input.provider.trim().toLowerCase(),
    eventId: input.eventId.trim(),
    orderId: input.orderId.trim(),
    checkoutSessionId: input.checkoutSessionId.trim(),
    paymentId: input.paymentId?.trim() || null,
    amountGross: input.amountGross ?? null,
    currency: input.currency?.trim().toUpperCase() || null,
    payload: input.payload ?? {},
  };
  if (!event.provider || event.provider.length > 50) {
    throw new BadRequestException('Nieprawidłowy identyfikator operatora');
  }
  if (!event.eventId || event.eventId.length > 255) {
    throw new BadRequestException('Nieprawidłowy identyfikator zdarzenia');
  }
  if (
    !Object.values(ListingPaymentEventType).includes(event.eventType) ||
    !event.orderId ||
    !event.checkoutSessionId ||
    event.checkoutSessionId.length > 255
  ) {
    throw new BadRequestException(
      'Zdarzenie nie zawiera poprawnych identyfikatorów lub typu',
    );
  }
  if (
    !(event.occurredAt instanceof Date) ||
    Number.isNaN(event.occurredAt.getTime())
  ) {
    throw new BadRequestException('Nieprawidłowy czas zdarzenia');
  }
  return event;
}

async function assertOrBindProviderSession(
  manager: EntityManager,
  order: ListingOrder,
  event: NormalizedListingPaymentEvent,
): Promise<void> {
  if (
    order.provider !== event.provider ||
    order.providerCheckoutSessionId !== event.checkoutSessionId
  ) {
    const canRecoverUnboundSuccessfulSession =
      event.eventType === ListingPaymentEventType.PAYMENT_SUCCEEDED &&
      order.status === ListingOrderStatus.PENDING_PAYMENT &&
      !order.provider &&
      !order.providerCheckoutSessionId;
    if (!canRecoverUnboundSuccessfulSession) {
      throw new ConflictException(
        'Zdarzenie nie odpowiada sesji płatniczej zamówienia',
      );
    }

    // Stripe may create a session just before the database becomes
    // unavailable. A signed success can safely close that gap only after the
    // immutable amount and currency have been checked.
    assertSuccessfulPaymentMatchesOrder(order, event);
    order.provider = event.provider;
    order.providerCheckoutSessionId = event.checkoutSessionId;
    await manager.save(ListingOrder, order);
  }
}

function assertSuccessfulPaymentMatchesOrder(
  order: ListingOrder,
  event: NormalizedListingPaymentEvent,
): void {
  if (!event.paymentId) {
    throw new BadRequestException('Brak identyfikatora potwierdzonej płatności');
  }
  if (
    !Number.isSafeInteger(event.amountGross) ||
    event.amountGross !== order.totalGrossAmount ||
    event.currency !== order.currency
  ) {
    throw new ConflictException(
      'Kwota lub waluta płatności nie odpowiada zamówieniu',
    );
  }
}

function transitionOrder(order: ListingOrder, next: ListingOrderStatus): void {
  try {
    assertListingOrderStatusTransition(order.status, next);
  } catch (error) {
    if (error instanceof InvalidListingCommerceTransitionError) {
      throw new ConflictException('Zdarzenie nie pasuje do stanu zamówienia');
    }
    throw error;
  }
  order.status = next;
}

function duplicateResult(
  event: ListingPaymentEvent,
  fallbackOrderId: string,
): ListingPaymentEventResultContract {
  return {
    status: 'ignored_duplicate',
    orderId: event.orderId ?? fallbackOrderId,
    orderStatus: getRecordedOrderStatus(event.payload),
  };
}

function getRecordedOrderStatus(
  payload: Record<string, unknown>,
): ListingOrderStatus {
  const status = payload.orderStatus;
  return Object.values(ListingOrderStatus).includes(status as ListingOrderStatus)
    ? (status as ListingOrderStatus)
    : ListingOrderStatus.PENDING_PAYMENT;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 2_000) : 'Unknown error';
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string } | undefined)?.code === '23505'
  );
}
