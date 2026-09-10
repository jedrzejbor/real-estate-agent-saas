import { createHash, randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, QueryFailedError } from 'typeorm';
import { User } from '../users/entities';
import type { ListingOrderContract } from './contracts';
import { CreateListingOrderDto, ListingOrderBuyerDto } from './dto';
import { ListingOrder, ListingOrderItem } from './entities';
import { toListingOrderContract } from './listing-order.presenter';
import { ListingEntitlementsService } from './listing-entitlements.service';
import { ListingPromotionsService } from './listing-promotions.service';
import { ListingQuotesService } from './listing-quotes.service';
import {
  ListingOrderBuyerSnapshot,
  ListingOrderStatus,
  ListingProductType,
} from './listing-commerce.types';

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{8,120}$/;
const OPEN_ORDER_STATUSES = [
  ListingOrderStatus.DRAFT,
  ListingOrderStatus.PENDING_PAYMENT,
  ListingOrderStatus.PAYMENT_FAILED,
] as const;

@Injectable()
export class ListingOrdersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly listingQuotesService: ListingQuotesService,
    private readonly listingEntitlementsService: ListingEntitlementsService,
    private readonly listingPromotionsService: ListingPromotionsService,
  ) {}

  async findOwnedOrder(
    buyerUserId: string,
    orderId: string,
  ): Promise<ListingOrderContract> {
    const order = await this.dataSource.getRepository(ListingOrder).findOne({
      where: { id: orderId, buyerUserId },
      relations: ['items', 'paymentAttempts'],
    });
    if (!order) {
      // Keep foreign order identifiers indistinguishable from missing ones.
      throw new NotFoundException('Zamówienie nie istnieje');
    }
    return toListingOrderContract(order);
  }

  async findOwnedOrdersForListing(
    buyerUserId: string,
    listingId: string,
  ): Promise<ListingOrderContract[]> {
    const orders = await this.dataSource.getRepository(ListingOrder).find({
      where: { listingId, buyerUserId },
      relations: ['items', 'paymentAttempts'],
      order: { createdAt: 'DESC' },
      take: 20,
    });
    return orders.map(toListingOrderContract);
  }

  async createOrder(
    buyerUserId: string,
    rawIdempotencyKey: string | undefined,
    dto: CreateListingOrderDto,
  ): Promise<ListingOrderContract> {
    const idempotencyKey = normalizeIdempotencyKey(rawIdempotencyKey);
    const requestFingerprint = buildOrderRequestFingerprint(dto);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const existing = await this.findOrderByIdempotencyKey(
          manager,
          idempotencyKey,
        );
        if (existing) {
          return this.assertMatchingIdempotentOrder(
            existing,
            buyerUserId,
            requestFingerprint,
          );
        }

        const buyer = await manager.findOne(User, {
          where: { id: buyerUserId, isActive: true },
        });
        if (!buyer) throw new NotFoundException('Użytkownik nie istnieje');

        const now = new Date();
        const { quote, products } =
          await this.listingQuotesService.createQuoteInTransaction(
            manager,
            buyerUserId,
            dto,
            now,
          );

        // A parallel retry may have committed while this transaction waited
        // for the listing lock acquired by createQuoteInTransaction().
        const concurrentlyCreated = await this.findOrderByIdempotencyKey(
          manager,
          idempotencyKey,
        );
        if (concurrentlyCreated) {
          return this.assertMatchingIdempotentOrder(
            concurrentlyCreated,
            buyerUserId,
            requestFingerprint,
          );
        }

        await this.expireStaleAndAssertNoCollision(
          manager,
          quote.listingId,
          quote.items.map((item) => item.productType),
          now,
        );

        const isZeroValue = quote.totalGrossAmount === 0;
        const order = manager.create(ListingOrder, {
          orderNumber: createOrderNumber(now),
          idempotencyKey,
          listingId: quote.listingId,
          buyerUserId,
          status: isZeroValue
            ? ListingOrderStatus.PAID
            : ListingOrderStatus.DRAFT,
          currency: quote.currency,
          subtotalGrossAmount: quote.subtotalGrossAmount,
          discountGrossAmount: quote.discountGrossAmount,
          totalGrossAmount: quote.totalGrossAmount,
          vatGrossAmount: quote.vatGrossAmount,
          buyerSnapshot: buildBuyerSnapshot(buyer.email, dto.buyer),
          pricingSnapshot: quote,
          quoteExpiresAt: new Date(quote.expiresAt),
          provider: null,
          providerCheckoutSessionId: null,
          providerPaymentId: null,
          metadata: {
            requestFingerprint,
            ...(isZeroValue
              ? { zeroValueFinalizedAt: now.toISOString() }
              : {}),
          },
          paidAt: isZeroValue ? now : null,
        });
        const savedOrder = await manager.save(ListingOrder, order);
        await this.listingPromotionsService.reserveDiscountsForOrder(
          manager,
          savedOrder,
          now,
        );
        const productsByCode = new Map(
          products.map((product) => [product.code, product]),
        );
        const items = quote.items.map((quotedItem) => {
          const product = productsByCode.get(quotedItem.productCode)!;
          return manager.create(ListingOrderItem, {
            orderId: savedOrder.id,
            productId: product.id,
            productCodeSnapshot: quotedItem.productCode,
            productNameSnapshot: quotedItem.productName,
            productTypeSnapshot: quotedItem.productType,
            quantity: quotedItem.quantity,
            unitGrossAmount: quotedItem.unitGrossAmount,
            subtotalGrossAmount: quotedItem.subtotalGrossAmount,
            discountGrossAmount: quotedItem.discountGrossAmount,
            totalGrossAmount: quotedItem.totalGrossAmount,
            vatRateBasisPoints: quotedItem.vatRateBasisPoints,
            vatGrossAmount: quotedItem.vatGrossAmount,
            durationDays: quotedItem.durationDays,
            fulfillmentParameters: quotedItem.fulfillmentParameters,
          });
        });
        savedOrder.items = await manager.save(ListingOrderItem, items);

        if (isZeroValue) {
          await this.listingPromotionsService.applyReservedDiscountsForPaidOrder(
            manager,
            savedOrder,
            now,
          );
          await this.listingEntitlementsService.fulfillPaidOrderInTransaction(
            manager,
            savedOrder,
            now,
          );
        }

        return toListingOrderContract(savedOrder);
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;

      // A concurrent request using the same key may have committed first.
      const existing = await this.dataSource
        .getRepository(ListingOrder)
        .findOne({
          where: { idempotencyKey },
          relations: ['items'],
        });
      if (!existing) throw error;
      return this.assertMatchingIdempotentOrder(
        existing,
        buyerUserId,
        requestFingerprint,
      );
    }
  }

  private findOrderByIdempotencyKey(
    manager: EntityManager,
    idempotencyKey: string,
  ): Promise<ListingOrder | null> {
    return manager.findOne(ListingOrder, {
      where: { idempotencyKey },
      relations: ['items'],
    });
  }

  private assertMatchingIdempotentOrder(
    order: ListingOrder,
    buyerUserId: string,
    requestFingerprint: string,
  ): ListingOrderContract {
    if (
      order.buyerUserId !== buyerUserId ||
      order.metadata?.requestFingerprint !== requestFingerprint
    ) {
      throw new ConflictException(
        'Klucz idempotencji został już użyty dla innego żądania',
      );
    }
    return toListingOrderContract(order);
  }

  private async expireStaleAndAssertNoCollision(
    manager: EntityManager,
    listingId: string,
    requestedTypes: ListingProductType[],
    now: Date,
  ): Promise<void> {
    const candidates = await manager.find(ListingOrder, {
      where: {
        listingId,
        status: In([...OPEN_ORDER_STATUSES, ListingOrderStatus.PAID]),
      },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
    const stale = candidates.filter(
      (order) =>
        OPEN_ORDER_STATUSES.includes(
          order.status as (typeof OPEN_ORDER_STATUSES)[number],
        ) && order.quoteExpiresAt.getTime() <= now.getTime(),
    );
    if (stale.length > 0) {
      stale.forEach((order) => {
        order.status = ListingOrderStatus.EXPIRED;
      });
      await manager.save(ListingOrder, stale);
      await this.listingPromotionsService.releaseReservationsForOrders(
        manager,
        stale,
        now,
      );
    }

    const requested = new Set(requestedTypes);
    const collision = candidates
      .filter((order) => !stale.includes(order))
      .some((order) =>
        (order.items ?? []).some(
          (item) =>
            requested.has(item.productTypeSnapshot) &&
            (order.status !== ListingOrderStatus.PAID ||
              item.productTypeSnapshot === ListingProductType.PUBLICATION),
        ),
      );
    if (collision) {
      throw new ConflictException(
        'Dla tego ogłoszenia istnieje już aktywne zamówienie tego rodzaju',
      );
    }
  }
}

export function normalizeIdempotencyKey(value: string | undefined): string {
  const normalized = value?.trim() ?? '';
  if (!IDEMPOTENCY_KEY_PATTERN.test(normalized)) {
    throw new ConflictException(
      'Nagłówek Idempotency-Key musi mieć od 8 do 120 dozwolonych znaków',
    );
  }
  return normalized;
}

export function buildOrderRequestFingerprint(
  dto: CreateListingOrderDto,
): string {
  const canonicalRequest = {
    listingId: dto.listingId,
    items: [...dto.items]
      .map((item) => ({
        productCode: item.productCode,
        quantity: item.quantity,
      }))
      .sort((left, right) => left.productCode.localeCompare(right.productCode)),
    promotionCode: dto.promotionCode?.trim().toUpperCase() || null,
    buyer: {
      countryCode: dto.buyer.countryCode,
      buyerType: dto.buyer.buyerType,
      fullName: normalizeOptionalText(dto.buyer.fullName),
      ...(dto.buyer.buyerType === 'business'
        ? {
            companyName: normalizeOptionalText(dto.buyer.companyName),
            taxId: normalizeOptionalText(dto.buyer.taxId),
          }
        : {}),
    },
  };
  return createHash('sha256')
    .update(JSON.stringify(canonicalRequest))
    .digest('hex');
}

function buildBuyerSnapshot(
  email: string,
  buyer: ListingOrderBuyerDto,
): ListingOrderBuyerSnapshot {
  return {
    email: email.trim().toLowerCase(),
    countryCode: buyer.countryCode,
    buyerType: buyer.buyerType,
    ...(normalizeOptionalText(buyer.fullName)
      ? { fullName: normalizeOptionalText(buyer.fullName)! }
      : {}),
    ...(buyer.buyerType === 'business'
      ? {
          companyName: normalizeOptionalText(buyer.companyName)!,
          taxId: normalizeOptionalText(buyer.taxId)!,
        }
      : {}),
  };
}

function normalizeOptionalText(value: string | undefined): string | null {
  return value?.trim() || null;
}

function createOrderNumber(now: Date): string {
  const date = now.toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
  return `LO-${date}-${suffix}`;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string } | undefined)?.code === '23505'
  );
}
