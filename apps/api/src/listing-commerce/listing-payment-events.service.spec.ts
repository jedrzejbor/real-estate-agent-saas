import { ConflictException } from '@nestjs/common';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import {
  ListingOrder,
  ListingOrderItem,
  ListingPaymentEvent,
} from './entities';
import { ListingEntitlementsService } from './listing-entitlements.service';
import { ListingPaymentEventsService } from './listing-payment-events.service';
import {
  ListingOrderStatus,
  ListingPaymentEventType,
  ListingProductType,
} from './listing-commerce.types';

function buildOrder(overrides: Partial<ListingOrder> = {}): ListingOrder {
  return Object.assign(new ListingOrder(), {
    id: '11111111-1111-4111-8111-111111111111',
    listingId: 'listing-1',
    status: ListingOrderStatus.PENDING_PAYMENT,
    currency: 'PLN',
    totalGrossAmount: 4_900,
    provider: 'stripe',
    providerCheckoutSessionId: 'cs_test_1',
    providerPaymentId: null,
    paidAt: null,
    items: [
      Object.assign(new ListingOrderItem(), {
        id: 'item-1',
        productTypeSnapshot: ListingProductType.PUBLICATION,
      }),
    ],
    ...overrides,
  });
}

const succeededEvent = {
  provider: 'stripe',
  eventId: 'evt_success_1',
  eventType: ListingPaymentEventType.PAYMENT_SUCCEEDED,
  orderId: '11111111-1111-4111-8111-111111111111',
  checkoutSessionId: 'cs_test_1',
  paymentId: 'pi_test_1',
  amountGross: 4_900,
  currency: 'PLN',
  occurredAt: new Date('2026-09-07T10:05:00.000Z'),
  payload: { providerType: 'checkout.session.completed' },
};

function buildHarness(options?: {
  order?: ListingOrder | null;
  eventReads?: Array<ListingPaymentEvent | null>;
}) {
  const order = options && 'order' in options ? options.order : buildOrder();
  const eventReads = [...(options?.eventReads ?? [null, null])];
  const manager = {
    findOne: jest.fn(async (entity: unknown) => {
      if (entity === ListingPaymentEvent) return eventReads.shift() ?? null;
      if (entity === ListingOrder) return order;
      return null;
    }),
    create: jest.fn((_entity: unknown, value: object) =>
      Object.assign(new ListingPaymentEvent(), value),
    ),
    save: jest.fn(async (_entity: unknown, value: object) => value),
  };
  const failedRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((value: object) =>
      Object.assign(new ListingPaymentEvent(), value),
    ),
    save: jest.fn(async (value: object) => value),
  };
  const dataSource = {
    transaction: jest.fn((callback: (manager: EntityManager) => unknown) =>
      callback(manager as unknown as EntityManager),
    ),
    getRepository: jest.fn().mockReturnValue(failedRepo),
  };
  const listingEntitlementsService = {
    fulfillPaidOrderInTransaction: jest.fn().mockResolvedValue({
      orderId: succeededEvent.orderId,
      entitlementIds: ['entitlement-1'],
      alreadyFulfilled: false,
    }),
  };
  const service = new ListingPaymentEventsService(
    dataSource as unknown as DataSource,
    listingEntitlementsService as unknown as ListingEntitlementsService,
  );
  return {
    service,
    manager,
    failedRepo,
    listingEntitlementsService,
    order,
  };
}

describe('ListingPaymentEventsService', () => {
  it('atomically marks an exact payment as paid and fulfills entitlements', async () => {
    const { service, manager, listingEntitlementsService, order } =
      buildHarness();

    const result = await service.processVerifiedEvent(succeededEvent);

    expect(result).toEqual({
      status: 'processed',
      orderId: succeededEvent.orderId,
      orderStatus: ListingOrderStatus.PAID,
    });
    expect(order?.status).toBe(ListingOrderStatus.PAID);
    expect(order?.providerPaymentId).toBe('pi_test_1');
    expect(order?.paidAt).toEqual(succeededEvent.occurredAt);
    expect(
      listingEntitlementsService.fulfillPaidOrderInTransaction,
    ).toHaveBeenCalledWith(
      manager,
      order,
      succeededEvent.occurredAt,
    );
    const savedEvent = manager.save.mock.calls.find(
      ([entity]) => entity === ListingPaymentEvent,
    )?.[1] as ListingPaymentEvent;
    expect(savedEvent).toMatchObject({
      provider: 'stripe',
      eventId: 'evt_success_1',
      status: 'processed',
      payload: {
        providerType: 'checkout.session.completed',
        processingOutcome: 'processed',
        orderStatus: ListingOrderStatus.PAID,
      },
    });
  });

  it('recovers a paid provider session created just before database binding', async () => {
    const order = buildOrder({
      provider: null,
      providerCheckoutSessionId: null,
    });
    const { service, manager, listingEntitlementsService } = buildHarness({
      order,
    });

    await expect(
      service.processVerifiedEvent(succeededEvent),
    ).resolves.toMatchObject({
      status: 'processed',
      orderStatus: ListingOrderStatus.PAID,
    });
    expect(order).toMatchObject({
      provider: 'stripe',
      providerCheckoutSessionId: 'cs_test_1',
      providerPaymentId: 'pi_test_1',
      status: ListingOrderStatus.PAID,
    });
    expect(manager.save).toHaveBeenCalledWith(ListingOrder, order);
    expect(
      listingEntitlementsService.fulfillPaidOrderInTransaction,
    ).toHaveBeenCalledTimes(1);
  });

  it('does not let a failure event claim an unbound order', async () => {
    const order = buildOrder({
      provider: null,
      providerCheckoutSessionId: null,
    });
    const { service, listingEntitlementsService } = buildHarness({ order });

    await expect(
      service.processVerifiedEvent({
        ...succeededEvent,
        eventId: 'evt_unbound_failure',
        eventType: ListingPaymentEventType.PAYMENT_FAILED,
        paymentId: null,
        amountGross: null,
        currency: null,
      }),
    ).rejects.toThrow('nie odpowiada sesji');
    expect(order).toMatchObject({
      provider: null,
      providerCheckoutSessionId: null,
      status: ListingOrderStatus.PENDING_PAYMENT,
    });
    expect(
      listingEntitlementsService.fulfillPaidOrderInTransaction,
    ).not.toHaveBeenCalled();
  });

  it('returns a processed duplicate without touching the order', async () => {
    const known = Object.assign(new ListingPaymentEvent(), {
      provider: 'stripe',
      eventId: succeededEvent.eventId,
      orderId: succeededEvent.orderId,
      status: 'processed',
      payload: { orderStatus: ListingOrderStatus.PAID },
    });
    const { service, manager, listingEntitlementsService } = buildHarness({
      eventReads: [known],
    });

    await expect(service.processVerifiedEvent(succeededEvent)).resolves.toEqual({
      status: 'ignored_duplicate',
      orderId: succeededEvent.orderId,
      orderStatus: ListingOrderStatus.PAID,
    });
    expect(manager.findOne).toHaveBeenCalledTimes(1);
    expect(
      listingEntitlementsService.fulfillPaidOrderInTransaction,
    ).not.toHaveBeenCalled();
  });

  it('rejects and audits a mismatched amount without fulfilling the order', async () => {
    const { service, failedRepo, listingEntitlementsService, order } =
      buildHarness();

    await expect(
      service.processVerifiedEvent({ ...succeededEvent, amountGross: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(order?.status).toBe(ListingOrderStatus.PENDING_PAYMENT);
    expect(failedRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        error: expect.stringContaining('Kwota lub waluta'),
      }),
    );
    expect(
      listingEntitlementsService.fulfillPaidOrderInTransaction,
    ).not.toHaveBeenCalled();
  });

  it('moves a pending order to payment_failed for a verified failure', async () => {
    const { service, order } = buildHarness();

    await expect(
      service.processVerifiedEvent({
        ...succeededEvent,
        eventId: 'evt_failed_1',
        eventType: ListingPaymentEventType.PAYMENT_FAILED,
        paymentId: null,
        amountGross: null,
        currency: null,
      }),
    ).resolves.toMatchObject({
      status: 'processed',
      orderStatus: ListingOrderStatus.PAYMENT_FAILED,
    });
    expect(order?.status).toBe(ListingOrderStatus.PAYMENT_FAILED);
  });

  it('ignores a late failure after a successful payment', async () => {
    const order = buildOrder({
      status: ListingOrderStatus.PAID,
      paidAt: succeededEvent.occurredAt,
      providerPaymentId: succeededEvent.paymentId,
    });
    const { service, manager } = buildHarness({ order });

    await expect(
      service.processVerifiedEvent({
        ...succeededEvent,
        eventId: 'evt_late_failure',
        eventType: ListingPaymentEventType.PAYMENT_FAILED,
      }),
    ).resolves.toMatchObject({
      status: 'ignored_stale',
      orderStatus: ListingOrderStatus.PAID,
    });
    expect(
      manager.save.mock.calls.some(
        ([entity, value]) => entity === ListingOrder && value === order,
      ),
    ).toBe(false);
  });

  it.each([ListingOrderStatus.EXPIRED, ListingOrderStatus.CANCELLED])(
    'honors an exact late success for a %s order',
    async (status) => {
      const order = buildOrder({ status });
      const { service, listingEntitlementsService } = buildHarness({ order });

      await expect(
        service.processVerifiedEvent(succeededEvent),
      ).resolves.toMatchObject({
        status: 'processed',
        orderStatus: ListingOrderStatus.PAID,
      });
      expect(
        listingEntitlementsService.fulfillPaidOrderInTransaction,
      ).toHaveBeenCalledTimes(1);
    },
  );

  it('expires a failed payment session when the provider confirms expiration', async () => {
    const order = buildOrder({ status: ListingOrderStatus.PAYMENT_FAILED });
    const { service } = buildHarness({ order });

    await expect(
      service.processVerifiedEvent({
        ...succeededEvent,
        eventId: 'evt_expired_1',
        eventType: ListingPaymentEventType.CHECKOUT_EXPIRED,
        paymentId: null,
        amountGross: null,
        currency: null,
      }),
    ).resolves.toMatchObject({
      status: 'processed',
      orderStatus: ListingOrderStatus.EXPIRED,
    });
  });

  it('retries an event whose previous processing attempt was audited as failed', async () => {
    const failed = Object.assign(new ListingPaymentEvent(), {
      provider: 'stripe',
      eventId: succeededEvent.eventId,
      orderId: succeededEvent.orderId,
      status: 'failed',
      payload: {},
    });
    const { service, manager, listingEntitlementsService } = buildHarness({
      eventReads: [failed, failed],
    });

    await expect(
      service.processVerifiedEvent(succeededEvent),
    ).resolves.toMatchObject({
      status: 'processed',
      orderStatus: ListingOrderStatus.PAID,
    });
    expect(
      listingEntitlementsService.fulfillPaidOrderInTransaction,
    ).toHaveBeenCalledTimes(1);
    expect(manager.save).toHaveBeenCalledWith(
      ListingPaymentEvent,
      expect.objectContaining({ status: 'processed', error: null }),
    );
  });

  it('detects a duplicate committed while waiting for the order lock', async () => {
    const processed = Object.assign(new ListingPaymentEvent(), {
      provider: 'stripe',
      eventId: succeededEvent.eventId,
      orderId: succeededEvent.orderId,
      status: 'processed',
      payload: { orderStatus: ListingOrderStatus.PAID },
    });
    const { service, listingEntitlementsService } = buildHarness({
      eventReads: [null, processed],
    });

    await expect(service.processVerifiedEvent(succeededEvent)).resolves.toEqual({
      status: 'ignored_duplicate',
      orderId: succeededEvent.orderId,
      orderStatus: ListingOrderStatus.PAID,
    });
    expect(
      listingEntitlementsService.fulfillPaidOrderInTransaction,
    ).not.toHaveBeenCalled();
  });

  it('rejects an event not bound to the stored provider session', async () => {
    const { service, failedRepo } = buildHarness();

    await expect(
      service.processVerifiedEvent({
        ...succeededEvent,
        checkoutSessionId: 'cs_attacker',
      }),
    ).rejects.toThrow('nie odpowiada sesji');
    expect(failedRepo.save).toHaveBeenCalled();
  });

  it('recovers a duplicate after a concurrent unique insert wins', async () => {
    const processed = Object.assign(new ListingPaymentEvent(), {
      provider: 'stripe',
      eventId: succeededEvent.eventId,
      orderId: succeededEvent.orderId,
      status: 'processed',
      payload: { orderStatus: ListingOrderStatus.PAID },
    });
    const driverError = Object.assign(new Error('duplicate'), { code: '23505' });
    const repo = { findOne: jest.fn().mockResolvedValue(processed) };
    const dataSource = {
      transaction: jest
        .fn()
        .mockRejectedValue(new QueryFailedError('insert', [], driverError)),
      getRepository: jest.fn().mockReturnValue(repo),
    };
    const service = new ListingPaymentEventsService(
      dataSource as unknown as DataSource,
      {} as ListingEntitlementsService,
    );

    await expect(service.processVerifiedEvent(succeededEvent)).resolves.toEqual({
      status: 'ignored_duplicate',
      orderId: succeededEvent.orderId,
      orderStatus: ListingOrderStatus.PAID,
    });
  });
});
