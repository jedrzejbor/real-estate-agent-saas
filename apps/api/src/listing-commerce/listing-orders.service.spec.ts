import { ConflictException } from '@nestjs/common';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { User } from '../users/entities';
import type { ListingQuoteContract } from './contracts';
import { CreateListingOrderDto } from './dto';
import {
  ListingOrder,
  ListingOrderItem,
  ListingPaymentAttempt,
  ListingProductCatalog,
} from './entities';
import {
  buildOrderRequestFingerprint,
  ListingOrdersService,
  normalizeIdempotencyKey,
} from './listing-orders.service';
import { ListingQuotesService } from './listing-quotes.service';
import { ListingEntitlementsService } from './listing-entitlements.service';
import { ListingPromotionsService } from './listing-promotions.service';
import {
  ListingOrderStatus,
  ListingPaymentAttemptStatus,
  ListingProductType,
} from './listing-commerce.types';

const orderDto: CreateListingOrderDto = {
  listingId: '11111111-1111-4111-8111-111111111111',
  items: [{ productCode: 'publication_60_days', quantity: 1 }],
  buyer: { countryCode: 'PL', buyerType: 'consumer', fullName: 'Jan Kowalski' },
};

function buildQuote(
  totalGrossAmount = 4_900,
  discountGrossAmount = 0,
): ListingQuoteContract {
  const subtotalGrossAmount = totalGrossAmount + discountGrossAmount;
  return {
    listingId: orderDto.listingId,
    currency: 'PLN',
    quotedAt: '2026-09-07T10:00:00.000Z',
    expiresAt: '2026-09-07T10:30:00.000Z',
    items: [
      {
        productCode: 'publication_60_days',
        productName: 'Publikacja ogłoszenia',
        productType: ListingProductType.PUBLICATION,
        quantity: 1,
        unitGrossAmount: subtotalGrossAmount,
        subtotalGrossAmount,
        discountGrossAmount,
        totalGrossAmount,
        vatRateBasisPoints: 2_300,
        vatGrossAmount: totalGrossAmount === 0 ? 0 : 916,
        durationDays: 60,
        fulfillmentParameters: { durationDays: 60 },
      },
    ],
    discounts:
      discountGrossAmount > 0
        ? [
            {
              sourceType: 'promotion_code',
              sourceReference: 'promotion-code-id',
              label: 'Kod promocyjny',
              grossAmount: discountGrossAmount,
            },
          ]
        : [],
    subtotalGrossAmount,
    discountGrossAmount,
    totalGrossAmount,
    vatGrossAmount: totalGrossAmount === 0 ? 0 : 916,
  };
}

function buildProduct(): ListingProductCatalog {
  return Object.assign(new ListingProductCatalog(), {
    id: 'product-1',
    code: 'publication_60_days',
  });
}

function buildPersistedOrder(
  overrides: Partial<ListingOrder> = {},
): ListingOrder {
  const quote = buildQuote();
  return Object.assign(new ListingOrder(), {
    id: 'order-1',
    orderNumber: 'LO-20260907-ABCDEF123456',
    idempotencyKey: 'request-key-1',
    listingId: orderDto.listingId,
    buyerUserId: 'owner-1',
    status: ListingOrderStatus.DRAFT,
    currency: 'PLN',
    subtotalGrossAmount: quote.subtotalGrossAmount,
    discountGrossAmount: 0,
    totalGrossAmount: quote.totalGrossAmount,
    vatGrossAmount: quote.vatGrossAmount,
    buyerSnapshot: {
      email: 'owner@example.com',
      countryCode: 'PL',
      buyerType: 'consumer',
    },
    pricingSnapshot: quote,
    quoteExpiresAt: new Date(quote.expiresAt),
    metadata: { requestFingerprint: buildOrderRequestFingerprint(orderDto) },
    paidAt: null,
    createdAt: new Date('2026-09-07T10:00:00.000Z'),
    items: [
      Object.assign(new ListingOrderItem(), {
        id: 'item-1',
        productId: 'product-1',
        productCodeSnapshot: 'publication_60_days',
        productNameSnapshot: 'Publikacja ogłoszenia',
        productTypeSnapshot: ListingProductType.PUBLICATION,
        quantity: 1,
        unitGrossAmount: 4_900,
        subtotalGrossAmount: 4_900,
        discountGrossAmount: 0,
        totalGrossAmount: 4_900,
        vatRateBasisPoints: 2_300,
        vatGrossAmount: 916,
        durationDays: 60,
        fulfillmentParameters: { durationDays: 60 },
      }),
    ],
    ...overrides,
  });
}

function buildHarness(options?: {
  quote?: ListingQuoteContract;
  existingIdempotentOrder?: ListingOrder | null;
  candidates?: ListingOrder[];
}) {
  const quote = options?.quote ?? buildQuote();
  const product = buildProduct();
  const listingQuotesService = {
    createQuoteInTransaction: jest.fn().mockResolvedValue({
      quote,
      products: [product],
    }),
  };
  const listingEntitlementsService = {
    fulfillPaidOrderInTransaction: jest.fn().mockResolvedValue({
      orderId: 'order-created',
      entitlementIds: ['entitlement-1'],
      alreadyFulfilled: false,
    }),
  };
  const listingPromotionsService = {
    reserveDiscountsForOrder: jest.fn().mockResolvedValue([]),
    applyReservedDiscountsForPaidOrder: jest.fn().mockResolvedValue([]),
    releaseReservationsForOrders: jest.fn().mockResolvedValue(0),
  };
  const manager = {
    findOne: jest.fn(async (entity: unknown) => {
      if (entity === ListingOrder) return options?.existingIdempotentOrder ?? null;
      if (entity === User) return { id: 'owner-1', email: 'OWNER@EXAMPLE.COM' };
      return null;
    }),
    find: jest.fn().mockResolvedValue(options?.candidates ?? []),
    create: jest.fn((entity: unknown, values: object) =>
      Object.assign(
        entity === ListingOrder ? new ListingOrder() : new ListingOrderItem(),
        values,
      ),
    ),
    save: jest.fn(async (entity: unknown, value: ListingOrder | ListingOrderItem[]) => {
      if (entity === ListingOrder && !Array.isArray(value)) {
        return Object.assign(value, {
          id: value.id ?? 'order-created',
          createdAt: value.createdAt ?? new Date('2026-09-07T10:00:00.000Z'),
        });
      }
      if (entity === ListingOrderItem && Array.isArray(value)) {
        return value.map((item, index) =>
          Object.assign(item, { id: `item-created-${index + 1}` }),
        );
      }
      return value;
    }),
  };
  const dataSource = {
    transaction: jest.fn((callback: (manager: EntityManager) => unknown) =>
      callback(manager as unknown as EntityManager),
    ),
    getRepository: jest.fn(),
  };
  const service = new ListingOrdersService(
    dataSource as unknown as DataSource,
    listingQuotesService as unknown as ListingQuotesService,
    listingEntitlementsService as unknown as ListingEntitlementsService,
    listingPromotionsService as unknown as ListingPromotionsService,
  );

  return {
    service,
    manager,
    dataSource,
    listingQuotesService,
    listingEntitlementsService,
    listingPromotionsService,
  };
}

describe('ListingOrdersService', () => {
  afterEach(() => jest.useRealTimers());

  it('atomically persists the quote snapshot and matching item snapshots', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T10:00:00.000Z'));
    const { service, manager, listingQuotesService } = buildHarness();

    const result = await service.createOrder('owner-1', 'request-key-1', orderDto);

    expect(listingQuotesService.createQuoteInTransaction).toHaveBeenCalledWith(
      manager,
      'owner-1',
      orderDto,
      new Date('2026-09-07T10:00:00.000Z'),
    );
    expect(result).toMatchObject({
      id: 'order-created',
      status: ListingOrderStatus.DRAFT,
      totalGrossAmount: 4_900,
      requiresPayment: true,
      quoteExpiresAt: '2026-09-07T10:30:00.000Z',
      items: [
        {
          productId: 'product-1',
          productCode: 'publication_60_days',
          totalGrossAmount: 4_900,
        },
      ],
    });
    const savedOrder = manager.save.mock.calls.find(
      ([entity]) => entity === ListingOrder,
    )?.[1] as ListingOrder;
    expect(savedOrder.buyerSnapshot).toEqual({
      email: 'owner@example.com',
      countryCode: 'PL',
      buyerType: 'consumer',
      fullName: 'Jan Kowalski',
    });
    expect(savedOrder.pricingSnapshot).toEqual(buildQuote());
  });

  it('reserves promotion discounts after the order snapshot is persisted', async () => {
    const quote = buildQuote(3_900, 1_000);
    const { service, manager, listingPromotionsService } = buildHarness({
      quote,
    });

    await service.createOrder('owner-1', 'discounted-order', orderDto);

    const savedOrder = manager.save.mock.calls.find(
      ([entity]) => entity === ListingOrder,
    )?.[1] as ListingOrder;
    expect(savedOrder).toMatchObject({
      subtotalGrossAmount: 4_900,
      discountGrossAmount: 1_000,
      totalGrossAmount: 3_900,
      pricingSnapshot: quote,
    });
    expect(listingPromotionsService.reserveDiscountsForOrder).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ id: 'order-created' }),
      expect.any(Date),
    );
  });

  it('finalizes a zero-value order as paid without a payment provider', async () => {
    const {
      service,
      manager,
      listingEntitlementsService,
      listingPromotionsService,
    } = buildHarness({
      quote: buildQuote(0),
    });

    const result = await service.createOrder('owner-1', 'free-order-1', orderDto);

    expect(result.status).toBe(ListingOrderStatus.PAID);
    expect(result.requiresPayment).toBe(false);
    expect(result.paidAt).not.toBeNull();
    const savedOrder = manager.save.mock.calls.find(
      ([entity]) => entity === ListingOrder,
    )?.[1] as ListingOrder;
    expect(savedOrder.provider).toBeNull();
    expect(savedOrder.providerPaymentId).toBeNull();
    expect(savedOrder.metadata).toHaveProperty('zeroValueFinalizedAt');
    expect(
      listingPromotionsService.applyReservedDiscountsForPaidOrder,
    ).toHaveBeenCalledWith(manager, savedOrder, expect.any(Date));
    expect(
      listingEntitlementsService.fulfillPaidOrderInTransaction,
    ).toHaveBeenCalledWith(manager, savedOrder, expect.any(Date));
  });

  it('returns the original order for an identical idempotent retry', async () => {
    const existing = buildPersistedOrder();
    const { service, listingQuotesService, manager } = buildHarness({
      existingIdempotentOrder: existing,
    });

    const result = await service.createOrder('owner-1', 'request-key-1', orderDto);

    expect(result.id).toBe(existing.id);
    expect(listingQuotesService.createQuoteInTransaction).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('returns a parallel retry committed while waiting for the listing lock', async () => {
    const concurrentlyCreated = buildPersistedOrder();
    const { service, manager } = buildHarness();
    manager.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'owner-1', email: 'owner@example.com' })
      .mockResolvedValueOnce(concurrentlyCreated);

    const result = await service.createOrder(
      'owner-1',
      'request-key-1',
      orderDto,
    );

    expect(result.id).toBe(concurrentlyCreated.id);
    expect(manager.find).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('rejects reuse of an idempotency key with different input', async () => {
    const existing = buildPersistedOrder();
    const { service } = buildHarness({ existingIdempotentOrder: existing });

    await expect(
      service.createOrder('owner-1', 'request-key-1', {
        ...orderDto,
        buyer: { ...orderDto.buyer, fullName: 'Inna osoba' },
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('expires a stale order before creating its replacement', async () => {
    const stale = buildPersistedOrder({
      id: 'stale-order',
      quoteExpiresAt: new Date('2026-09-07T09:00:00.000Z'),
    });
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T10:00:00.000Z'));
    const { service, manager, listingPromotionsService } = buildHarness({
      candidates: [stale],
    });

    await service.createOrder('owner-1', 'replacement-key', orderDto);

    expect(stale.status).toBe(ListingOrderStatus.EXPIRED);
    expect(manager.save).toHaveBeenCalledWith(ListingOrder, [stale]);
    expect(
      listingPromotionsService.releaseReservationsForOrders,
    ).toHaveBeenCalledWith(manager, [stale], expect.any(Date));
  });

  it('blocks another active order of the same product type', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T10:00:00.000Z'));
    const active = buildPersistedOrder();
    const { service } = buildHarness({ candidates: [active] });

    await expect(
      service.createOrder('owner-1', 'another-key', orderDto),
    ).rejects.toThrow('istnieje już aktywne zamówienie tego rodzaju');
  });

  it('reads an order only through a buyer-scoped query', async () => {
    const existing = buildPersistedOrder();
    const { service, dataSource } = buildHarness();
    const findOne = jest.fn().mockResolvedValue(existing);
    dataSource.getRepository.mockReturnValue({ findOne });

    await expect(
      service.findOwnedOrder('owner-1', existing.id),
    ).resolves.toMatchObject({ id: existing.id });
    expect(findOne).toHaveBeenCalledWith({
      where: { id: existing.id, buyerUserId: 'owner-1' },
      relations: ['items', 'paymentAttempts'],
    });
  });

  it('returns newest-first payment history without provider identifiers', async () => {
    const existing = buildPersistedOrder({
      status: ListingOrderStatus.PAYMENT_FAILED,
      paymentAttempts: [
        Object.assign(new ListingPaymentAttempt(), {
          id: 'attempt-1',
          attemptNumber: 1,
          status: ListingPaymentAttemptStatus.FAILED,
          amountGross: 4_900,
          currency: 'PLN',
          providerCheckoutSessionId: 'cs_secret',
          providerPaymentId: 'pi_secret',
          failureCode: 'payment_failed',
          expiresAt: new Date('2026-09-07T10:30:00.000Z'),
          startedAt: new Date('2026-09-07T10:00:00.000Z'),
          completedAt: new Date('2026-09-07T10:05:00.000Z'),
        }),
        Object.assign(new ListingPaymentAttempt(), {
          id: 'attempt-2',
          attemptNumber: 2,
          status: ListingPaymentAttemptStatus.FAILED,
          amountGross: 4_900,
          currency: 'PLN',
          expiresAt: new Date('2026-09-07T11:00:00.000Z'),
          startedAt: new Date('2026-09-07T10:30:00.000Z'),
          completedAt: null,
        }),
      ],
    });
    const { service, dataSource } = buildHarness();
    dataSource.getRepository.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(existing),
    });

    const result = await service.findOwnedOrder('owner-1', existing.id);

    expect(result.paymentAttempts.map((attempt) => attempt.attemptNumber)).toEqual([
      2, 1,
    ]);
    expect(result.canRetryPayment).toBe(true);
    expect(result.paymentAttempts[1]).not.toHaveProperty(
      'providerCheckoutSessionId',
    );
    expect(result.paymentAttempts[1]).not.toHaveProperty('providerPaymentId');
  });

  it('does not reveal an order owned by another user', async () => {
    const { service, dataSource } = buildHarness();
    dataSource.getRepository.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.findOwnedOrder('intruder', 'order-1'),
    ).rejects.toThrow('Zamówienie nie istnieje');
  });

  it('lists only buyer-scoped orders for a listing with bounded history', async () => {
    const existing = buildPersistedOrder();
    const { service, dataSource } = buildHarness();
    const find = jest.fn().mockResolvedValue([existing]);
    dataSource.getRepository.mockReturnValue({ find });

    await expect(
      service.findOwnedOrdersForListing('owner-1', existing.listingId!),
    ).resolves.toEqual([expect.objectContaining({ id: existing.id })]);
    expect(find).toHaveBeenCalledWith({
      where: { listingId: existing.listingId, buyerUserId: 'owner-1' },
      relations: ['items', 'paymentAttempts'],
      order: { createdAt: 'DESC' },
      take: 20,
    });
  });

  it('does not describe an expired order as payable', async () => {
    const expired = buildPersistedOrder({ status: ListingOrderStatus.EXPIRED });
    const { service, dataSource } = buildHarness();
    dataSource.getRepository.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(expired),
    });

    await expect(
      service.findOwnedOrder('owner-1', expired.id),
    ).resolves.toMatchObject({ requiresPayment: false });
  });
});

describe('order idempotency helpers', () => {
  it('normalizes a safe key and rejects missing or unsafe keys', () => {
    expect(normalizeIdempotencyKey('  checkout:request-1  ')).toBe(
      'checkout:request-1',
    );
    expect(() => normalizeIdempotencyKey(undefined)).toThrow(
      ConflictException,
    );
    expect(() => normalizeIdempotencyKey('contains spaces')).toThrow(
      ConflictException,
    );
  });

  it('creates an order-independent fingerprint for item ordering', () => {
    const featured = { productCode: 'featured_7_days', quantity: 1 };
    expect(
      buildOrderRequestFingerprint({
        ...orderDto,
        items: [featured, ...orderDto.items],
      }),
    ).toBe(
      buildOrderRequestFingerprint({
        ...orderDto,
        items: [...orderDto.items, featured],
      }),
    );
  });

  it('recovers the committed order after a concurrent unique-key retry', async () => {
    const existing = buildPersistedOrder();
    const driverError = Object.assign(new Error('duplicate key'), {
      code: '23505',
    });
    const dataSource = {
      transaction: jest
        .fn()
        .mockRejectedValue(new QueryFailedError('insert', [], driverError)),
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(existing),
      }),
    };
    const service = new ListingOrdersService(
      dataSource as unknown as DataSource,
      {} as ListingQuotesService,
      {} as ListingEntitlementsService,
      {} as ListingPromotionsService,
    );

    await expect(
      service.createOrder('owner-1', 'request-key-1', orderDto),
    ).resolves.toMatchObject({ id: existing.id });
  });
});
