import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ReleaseFlagsService } from '../release-flags';
import { ListingOrder, ListingOrderItem } from './entities';
import { ListingCheckoutSessionsService } from './listing-checkout-sessions.service';
import type { ListingPaymentGateway } from './listing-payment-gateway.port';
import { ListingOrderStatus } from './listing-commerce.types';

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

function buildHarness(order: ListingOrder | null = buildOrder()) {
  const manager = {
    findOne: jest.fn().mockResolvedValue(order),
    save: jest.fn(async (_entity: unknown, value: unknown) => value),
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
  const service = new ListingCheckoutSessionsService(
    dataSource as unknown as DataSource,
    paymentGateway as unknown as ListingPaymentGateway,
    {
      getFlags: jest.fn().mockReturnValue({
        privateListingCheckoutEnabled: true,
      }),
    } as unknown as ReleaseFlagsService,
  );

  return { service, manager, dataSource, paymentGateway, order };
}

describe('ListingCheckoutSessionsService', () => {
  afterEach(() => jest.useRealTimers());

  it('creates and atomically binds a provider session to an owned order', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T10:00:00.000Z'));
    const { service, manager, dataSource, paymentGateway, order } =
      buildHarness();

    await expect(
      service.createOwnedCheckoutSession('owner-1', 'order-1'),
    ).resolves.toEqual({
      orderId: 'order-1',
      orderStatus: ListingOrderStatus.PENDING_PAYMENT,
      provider: 'stripe',
      sessionId: 'cs_test_1',
      checkoutUrl: 'https://checkout.stripe.test/session',
      expiresAt: '2026-09-07T10:30:05.000Z',
    });

    expect(dataSource.transaction).toHaveBeenCalledTimes(2);
    expect(paymentGateway.createCheckoutSession).toHaveBeenCalledWith({
      orderId: 'order-1',
      orderNumber: 'LO-20260907-ABC123',
      buyerEmail: 'owner@example.com',
      currency: 'PLN',
      totalGrossAmount: 4_900,
      itemNames: ['Publikacja ogłoszenia'],
      expiresAt: new Date('2026-09-07T10:30:05.000Z'),
    });
    expect(order).toMatchObject({
      status: ListingOrderStatus.PENDING_PAYMENT,
      provider: 'stripe',
      providerCheckoutSessionId: 'cs_test_1',
      metadata: {
        requestFingerprint: 'fingerprint',
        checkoutInitiatedAt: '2026-09-07T10:00:00.000Z',
        checkoutAttemptExpiresAt: '2026-09-07T10:30:05.000Z',
        checkoutSessionExpiresAt: '2026-09-07T10:30:05.000Z',
      },
    });
    expect(order?.quoteExpiresAt).toEqual(
      new Date('2026-09-07T10:30:05.000Z'),
    );
    expect(manager.save).toHaveBeenCalledTimes(2);
  });

  it('does not reveal or send a foreign order to the provider', async () => {
    const { service, paymentGateway } = buildHarness(null);

    await expect(
      service.createOwnedCheckoutSession('intruder', 'order-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(paymentGateway.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('blocks new sessions behind the checkout release flag', async () => {
    const { dataSource, paymentGateway } = buildHarness();
    const service = new ListingCheckoutSessionsService(
      dataSource as unknown as DataSource,
      paymentGateway as unknown as ListingPaymentGateway,
      {
        getFlags: jest.fn().mockReturnValue({
          privateListingCheckoutEnabled: false,
        }),
      } as unknown as ReleaseFlagsService,
    );

    await expect(
      service.createOwnedCheckoutSession('owner-1', 'order-1'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(paymentGateway.createCheckoutSession).not.toHaveBeenCalled();
  });

  it.each([
    ['expired quote', { quoteExpiresAt: new Date('2026-09-07T09:59:00Z') }],
    ['zero-value order', { totalGrossAmount: 0 }],
    ['paid order', { status: ListingOrderStatus.PAID }],
    ['failed payment awaiting a new-attempt flow', { status: ListingOrderStatus.PAYMENT_FAILED }],
    ['different provider', { provider: 'other-provider' }],
  ])('rejects %s before a provider call', async (_label, overrides) => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T10:00:00.000Z'));
    const { service, paymentGateway } = buildHarness(
      buildOrder(overrides as Partial<ListingOrder>),
    );

    await expect(
      service.createOwnedCheckoutSession('owner-1', 'order-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(paymentGateway.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('rejects a different session returned for an already bound order', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T10:00:00.000Z'));
    const { service } = buildHarness(
      buildOrder({
        status: ListingOrderStatus.PENDING_PAYMENT,
        provider: 'stripe',
        providerCheckoutSessionId: 'cs_original',
      }),
    );

    await expect(
      service.createOwnedCheckoutSession('owner-1', 'order-1'),
    ).rejects.toThrow('inną sesją płatniczą');
  });

  it('keeps the claimed pending state when the provider is temporarily unavailable', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T10:00:00.000Z'));
    const { service, paymentGateway, order } = buildHarness();
    paymentGateway.createCheckoutSession.mockRejectedValueOnce(
      new Error('provider unavailable'),
    );

    await expect(
      service.createOwnedCheckoutSession('owner-1', 'order-1'),
    ).rejects.toThrow('provider unavailable');
    expect(order?.status).toBe(ListingOrderStatus.PENDING_PAYMENT);
    expect(order?.providerCheckoutSessionId).toBeNull();
  });
});
