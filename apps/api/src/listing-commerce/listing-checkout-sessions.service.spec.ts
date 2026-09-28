import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ReleaseFlagsService } from '../release-flags';
import {
  ListingOrder,
  ListingOrderItem,
  ListingPaymentAttempt,
} from './entities';
import { ListingCheckoutSessionsService } from './listing-checkout-sessions.service';
import type { ListingPaymentGateway } from './listing-payment-gateway.port';
import {
  ListingOrderStatus,
  ListingPaymentAttemptStatus,
} from './listing-commerce.types';

function buildOrder(overrides: Partial<ListingOrder> = {}): ListingOrder {
  return Object.assign(new ListingOrder(), {
    id: 'order-1',
    orderNumber: 'LO-20260907-ABC123',
    buyerUserId: 'owner-1',
    status: ListingOrderStatus.DRAFT,
    currency: 'PLN',
    totalGrossAmount: 4_900,
    buyerSnapshot: {
      email: 'owner@example.com',
      countryCode: 'PL',
      buyerType: 'consumer',
    },
    quoteExpiresAt: new Date('2026-09-07T10:30:00.000Z'),
    provider: null,
    providerCheckoutSessionId: null,
    metadata: { requestFingerprint: 'fingerprint' },
    items: [
      Object.assign(new ListingOrderItem(), {
        productNameSnapshot: 'Publikacja ogłoszenia',
      }),
    ],
    ...overrides,
  });
}

function buildAttempt(
  overrides: Partial<ListingPaymentAttempt> = {},
): ListingPaymentAttempt {
  return Object.assign(new ListingPaymentAttempt(), {
    id: 'attempt-1',
    orderId: 'order-1',
    attemptNumber: 1,
    status: ListingPaymentAttemptStatus.PENDING,
    provider: 'stripe',
    amountGross: 4_900,
    currency: 'PLN',
    providerCheckoutSessionId: 'cs_original',
    providerPaymentId: null,
    failureCode: null,
    failureMessage: null,
    expiresAt: new Date('2026-09-07T10:30:05.000Z'),
    startedAt: new Date('2026-09-07T10:00:00.000Z'),
    completedAt: null,
    ...overrides,
  });
}

function buildHarness(options: {
  order?: ListingOrder | null;
  latestAttempt?: ListingPaymentAttempt | null;
  checkoutEnabled?: boolean;
} = {}) {
  const order = 'order' in options ? options.order : buildOrder();
  let persistedAttempt = options.latestAttempt ?? null;
  const manager = {
    findOne: jest.fn(async (entity: unknown, query: { where?: { id?: string } }) => {
      if (entity === ListingOrder) return order;
      if (entity === ListingPaymentAttempt) {
        return query.where?.id ? persistedAttempt : options.latestAttempt ?? null;
      }
      return null;
    }),
    create: jest.fn((_entity: unknown, values: object) =>
      Object.assign(new ListingPaymentAttempt(), values),
    ),
    save: jest.fn(async (entity: unknown, value: unknown) => {
      if (entity === ListingPaymentAttempt) {
        persistedAttempt = Object.assign(value as ListingPaymentAttempt, {
          id: (value as ListingPaymentAttempt).id ?? 'attempt-created',
        });
      }
      return value;
    }),
  };
  const dataSource = {
    transaction: jest.fn((callback: (manager: EntityManager) => unknown) =>
      callback(manager as unknown as EntityManager),
    ),
  };
  const paymentGateway = {
    provider: 'stripe',
    createCheckoutSession: jest.fn().mockResolvedValue({
      provider: 'stripe',
      sessionId: 'cs_test_1',
      checkoutUrl: 'https://checkout.stripe.test/session',
      expiresAt: new Date('2026-09-07T10:30:05.000Z'),
    }),
  };
  const releaseFlagsService = {
    getFlags: jest.fn().mockReturnValue({
      privateListingCheckoutEnabled: options.checkoutEnabled ?? true,
    }),
  };
  const service = new ListingCheckoutSessionsService(
    dataSource as unknown as DataSource,
    paymentGateway as unknown as ListingPaymentGateway,
    releaseFlagsService as unknown as ReleaseFlagsService,
  );

  return {
    service,
    manager,
    dataSource,
    paymentGateway,
    order,
    getAttempt: () => persistedAttempt,
  };
}

describe('ListingCheckoutSessionsService', () => {
  afterEach(() => jest.useRealTimers());

  it('allocates and binds the first durable payment attempt', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T10:00:00.000Z'));
    const { service, manager, paymentGateway, order, getAttempt } =
      buildHarness();

    await expect(
      service.createOwnedCheckoutSession('owner-1', 'order-1'),
    ).resolves.toEqual({
      orderId: 'order-1',
      orderStatus: ListingOrderStatus.PENDING_PAYMENT,
      paymentAttemptId: 'attempt-created',
      attemptNumber: 1,
      provider: 'stripe',
      sessionId: 'cs_test_1',
      checkoutUrl: 'https://checkout.stripe.test/session',
      expiresAt: '2026-09-07T10:30:05.000Z',
    });

    expect(paymentGateway.createCheckoutSession).toHaveBeenCalledWith({
      orderId: 'order-1',
      orderNumber: 'LO-20260907-ABC123',
      paymentAttemptId: 'attempt-created',
      attemptNumber: 1,
      buyerEmail: 'owner@example.com',
      currency: 'PLN',
      totalGrossAmount: 4_900,
      itemNames: ['Publikacja ogłoszenia'],
      expiresAt: new Date('2026-09-07T10:30:05.000Z'),
    });
    expect(getAttempt()).toMatchObject({
      id: 'attempt-created',
      status: ListingPaymentAttemptStatus.PENDING,
      providerCheckoutSessionId: 'cs_test_1',
    });
    expect(order).toMatchObject({
      status: ListingOrderStatus.PENDING_PAYMENT,
      provider: 'stripe',
      providerCheckoutSessionId: 'cs_test_1',
      metadata: {
        currentPaymentAttemptId: 'attempt-created',
        checkoutSessionExpiresAt: '2026-09-07T10:30:05.000Z',
      },
    });
    expect(manager.create).toHaveBeenCalledWith(
      ListingPaymentAttempt,
      expect.objectContaining({ attemptNumber: 1 }),
    );
  });

  it('resumes an open attempt without allocating another one', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T10:05:00.000Z'));
    const attempt = buildAttempt();
    const { service, manager, paymentGateway } = buildHarness({
      order: buildOrder({ status: ListingOrderStatus.PENDING_PAYMENT }),
      latestAttempt: attempt,
    });
    paymentGateway.createCheckoutSession.mockResolvedValueOnce({
      provider: 'stripe',
      sessionId: 'cs_original',
      checkoutUrl: 'https://checkout.stripe.test/original',
      expiresAt: attempt.expiresAt,
    });

    await service.createOwnedCheckoutSession('owner-1', 'order-1');

    expect(manager.create).not.toHaveBeenCalled();
    expect(paymentGateway.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentAttemptId: 'attempt-1',
        attemptNumber: 1,
        expiresAt: attempt.expiresAt,
      }),
    );
  });

  it('allocates a new attempt after a verified payment failure', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T10:10:00.000Z'));
    const failedAttempt = buildAttempt({
      status: ListingPaymentAttemptStatus.FAILED,
      completedAt: new Date('2026-09-07T10:09:00.000Z'),
    });
    const { service, paymentGateway, order } = buildHarness({
      order: buildOrder({ status: ListingOrderStatus.PAYMENT_FAILED }),
      latestAttempt: failedAttempt,
    });

    await service.createOwnedCheckoutSession('owner-1', 'order-1');

    expect(paymentGateway.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentAttemptId: 'attempt-created',
        attemptNumber: 2,
      }),
    );
    expect(order?.status).toBe(ListingOrderStatus.PENDING_PAYMENT);
  });

  it('does not preserve an old catalog price through repeated attempts', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T10:31:00.000Z'));
    const { service, paymentGateway } = buildHarness({
      order: buildOrder({
        status: ListingOrderStatus.PAYMENT_FAILED,
        quoteExpiresAt: new Date('2026-09-07T11:00:00.000Z'),
        pricingSnapshot: {
          expiresAt: '2026-09-07T10:30:00.000Z',
        } as never,
      }),
      latestAttempt: buildAttempt({
        status: ListingPaymentAttemptStatus.FAILED,
      }),
    });

    await expect(
      service.createOwnedCheckoutSession('owner-1', 'order-1'),
    ).rejects.toThrow('Wycena zamówienia wygasła');
    expect(paymentGateway.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('does not reveal or send a foreign order to the provider', async () => {
    const { service, paymentGateway } = buildHarness({ order: null });

    await expect(
      service.createOwnedCheckoutSession('intruder', 'order-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(paymentGateway.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('blocks new attempts behind the checkout release flag', async () => {
    const { service, paymentGateway } = buildHarness({
      checkoutEnabled: false,
    });

    await expect(
      service.createOwnedCheckoutSession('owner-1', 'order-1'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(paymentGateway.createCheckoutSession).not.toHaveBeenCalled();
  });

  it.each([
    ['expired quote', { quoteExpiresAt: new Date('2026-09-07T09:59:00Z') }],
    ['zero-value order', { totalGrossAmount: 0 }],
    ['paid order', { status: ListingOrderStatus.PAID }],
  ])('rejects %s before a provider call', async (_label, overrides) => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T10:00:00.000Z'));
    const { service, paymentGateway } = buildHarness({
      order: buildOrder(overrides as Partial<ListingOrder>),
    });

    await expect(
      service.createOwnedCheckoutSession('owner-1', 'order-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(paymentGateway.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('rejects a different provider session for an already bound attempt', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T10:00:00.000Z'));
    const { service } = buildHarness({
      order: buildOrder({ status: ListingOrderStatus.PENDING_PAYMENT }),
      latestAttempt: buildAttempt(),
    });

    await expect(
      service.createOwnedCheckoutSession('owner-1', 'order-1'),
    ).rejects.toThrow('inną sesją płatniczą');
  });

  it('keeps a creating attempt when the provider is temporarily unavailable', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T10:00:00.000Z'));
    const { service, paymentGateway, order, getAttempt } = buildHarness();
    paymentGateway.createCheckoutSession.mockRejectedValueOnce(
      new Error('provider unavailable'),
    );

    await expect(
      service.createOwnedCheckoutSession('owner-1', 'order-1'),
    ).rejects.toThrow('provider unavailable');
    expect(order?.status).toBe(ListingOrderStatus.PENDING_PAYMENT);
    expect(getAttempt()?.status).toBe(ListingPaymentAttemptStatus.CREATING);
    expect(getAttempt()?.providerCheckoutSessionId).toBeNull();
  });
});
