import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { DataSource } from 'typeorm';
import {
  PropertyType,
  PublicListingSubmissionStatus,
  TransactionType,
} from '../common/enums';
import { Listing } from '../listings/entities';
import { PublicListingSubmission } from '../public-listing-submissions/entities';
import { Agent, User } from '../users/entities';
import { PaymentService } from '../payments/application/payment.service';
import { Payment } from '../payments/infrastructure/typeorm/payment.entity';
import { PaymentEvent } from '../payments/infrastructure/typeorm/payment-event.entity';
import { TpayJwsVerifier } from '../payments/infrastructure/tpay/tpay-jws.verifier';
import { TpayWebhookController } from '../payments/infrastructure/tpay/tpay-webhook.controller';
import {
  ListingEntitlement,
  ListingOrder,
  ListingOrderItem,
  ListingPaymentAttempt,
  ListingProductCatalog,
  ListingPromotionCampaign,
  ListingPromotionCode,
} from './entities';
import { ListingEntitlementsService } from './listing-entitlements.service';
import { ListingPaymentEventsService } from './listing-payment-events.service';
import { ListingPromotionsService } from './listing-promotions.service';
import {
  ListingOrderStatus,
  ListingPaymentAttemptStatus,
  ListingProductType,
} from './listing-commerce.types';

const describeDatabase = process.env.PAY028_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase('PAY-028 signed listing fulfillment in isolated PostgreSQL', () => {
  const database = process.env.PAY028_TEST_DB_NAME ?? 'real_estate_saas_pay028_test';
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.PAY028_TEST_DB_HOST ?? '127.0.0.1',
    port: Number(process.env.PAY028_TEST_DB_PORT ?? 5433),
    username: process.env.PAY028_TEST_DB_USER ?? 'postgres',
    password: process.env.PAY028_TEST_DB_PASSWORD ?? 'postgres',
    database,
    entities: [resolve(__dirname, '../**/*.entity.ts')],
    synchronize: false,
  });
  const payments = new PaymentService();
  let controller: TpayWebhookController;
  let ownsSchema = false;

  beforeAll(async () => {
    if (!database.endsWith('_pay028_test') || database === 'real_estate_saas') {
      throw new Error('Dedicated PAY-028 test database required');
    }
    await dataSource.initialize();
    const [{ count }] = await dataSource.query(
      "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'",
    );
    if (Number(count) !== 0) throw new Error('PAY-028 test database must be empty');
    ownsSchema = true;
    await dataSource.synchronize();
    const entitlements = new ListingEntitlementsService(dataSource);
    const promotions = new ListingPromotionsService(
      dataSource.getRepository(ListingPromotionCampaign),
      dataSource.getRepository(ListingPromotionCode),
    );
    const listingEvents = new ListingPaymentEventsService(
      dataSource, entitlements, promotions, undefined, payments,
    );
    controller = new TpayWebhookController(
      { verify: async () => true } as unknown as TpayJwsVerifier,
      dataSource,
      payments,
      listingEvents,
      { provider: 'tpay', tpay: { merchantId: '123' } } as never,
    );
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    if (ownsSchema) await dataSource.dropDatabase();
    await dataSource.destroy();
  });

  async function fixture() {
    const user = await dataSource.getRepository(User).save({
      email: `pay028-${randomUUID()}@example.test`, passwordHash: 'test-only',
    });
    const agent = await dataSource.getRepository(Agent).save({ userId: user.id });
    const listing = await dataSource.getRepository(Listing).save({
      title: 'Test PAY-028', propertyType: PropertyType.APARTMENT,
      transactionType: TransactionType.SALE, price: 100000,
      agentId: agent.id, publicSlug: `pay028-${randomUUID()}`,
    });
    await dataSource.getRepository(PublicListingSubmission).save({
      ownerName: 'Test', email: user.email, phone: '000000000', payload: {},
      publishedListingId: listing.id,
      status: PublicListingSubmissionStatus.APPROVED,
    });
    const product = await dataSource.getRepository(ListingProductCatalog).save({
      code: `PAY028-${randomUUID()}`, name: 'Publikacja',
      type: ListingProductType.PUBLICATION, priceGrossAmount: 4900,
      durationDays: 60, fulfillmentParameters: {},
    });
    const order = await dataSource.getRepository(ListingOrder).save({
      orderNumber: `PAY028-${randomUUID().slice(0, 30)}`,
      idempotencyKey: randomUUID(), listingId: listing.id, buyerUserId: user.id,
      status: ListingOrderStatus.PENDING_PAYMENT, currency: 'PLN',
      subtotalGrossAmount: 4900, discountGrossAmount: 0,
      totalGrossAmount: 4900, buyerSnapshot: {} as never,
      pricingSnapshot: {} as never,
      quoteExpiresAt: new Date(Date.now() + 3600000), metadata: {},
    });
    const item = await dataSource.getRepository(ListingOrderItem).save({
      orderId: order.id, productId: product.id,
      productCodeSnapshot: product.code, productNameSnapshot: product.name,
      productTypeSnapshot: ListingProductType.PUBLICATION, quantity: 1,
      unitGrossAmount: 4900, subtotalGrossAmount: 4900, totalGrossAmount: 4900,
      durationDays: 60, fulfillmentParameters: {},
    });
    const attempt = await dataSource.getRepository(ListingPaymentAttempt).save({
      orderId: order.id, attemptNumber: 1,
      status: ListingPaymentAttemptStatus.PENDING,
      provider: 'tpay', amountGross: 4900, currency: 'PLN',
      expiresAt: new Date(Date.now() + 3600000), startedAt: new Date(),
    });
    const payment = await dataSource.getRepository(Payment).save({
      kind: 'listing', orderId: order.id, buyerUserId: user.id,
      correlationId: attempt.id, attemptNo: 1, amountMinor: 4900 as never,
      currency: 'PLN', status: 'pending', provider: 'tpay',
      providerTransactionId: `01${randomUUID().replace(/-/g, '').slice(0, 24)}`,
      providerTitle: `TR-${randomUUID()}`, metadata: {},
    });
    return { listing, order, item, attempt, payment };
  }

  function request(payment: Payment, overrides: Record<string, string> = {}): RawBodyRequest<Request> {
    const form = new URLSearchParams({
      id: '123', tr_id: payment.providerTitle!, tr_status: 'true',
      tr_crc: payment.id, tr_amount: '49.00', tr_paid: '49.00',
      tr_currency: 'PLN', ...overrides,
    });
    return {
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-jws-signature': 'fixture' },
      rawBody: Buffer.from(form.toString()),
    } as unknown as RawBodyRequest<Request>;
  }

  it('confirms full payment, order and exactly one entitlement after the verified webhook', async () => {
    const { listing, order, item, payment } = await fixture();
    expect(await controller.receiveNotification(request(payment))).toBe('TRUE');
    expect((await dataSource.getRepository(Payment).findOneByOrFail({ id: payment.id })).status).toBe('confirmed');
    expect((await dataSource.getRepository(ListingOrder).findOneByOrFail({ id: order.id })).status).toBe(ListingOrderStatus.PAID);
    expect(await dataSource.getRepository(ListingEntitlement).countBy({ orderItemId: item.id })).toBe(1);
    expect((await dataSource.getRepository(Listing).findOneByOrFail({ id: listing.id })).status).toBe('active');
  });

  it('rolls back underpayment, wrong merchant, title, amount and currency', async () => {
    const { order, item, attempt, payment } = await fixture();
    for (const overrides of [
      { tr_paid: '48.99' }, { id: '999' }, { tr_id: 'TR-WRONG' },
      { tr_amount: '48.00' }, { tr_currency: 'EUR' },
    ] as Array<Record<string, string>>) {
      await expect(controller.receiveNotification(request(payment, overrides))).rejects.toThrow();
    }
    await dataSource.getRepository(ListingOrder).update(order.id, { providerCheckoutSessionId: 'TR-OTHER' });
    await expect(controller.receiveNotification(request(payment))).rejects.toThrow();
    await dataSource.getRepository(ListingOrder).update(order.id, { providerCheckoutSessionId: null });
    await dataSource.getRepository(ListingPaymentAttempt).update(attempt.id, { providerCheckoutSessionId: 'TR-OTHER' });
    await expect(controller.receiveNotification(request(payment))).rejects.toThrow();
    expect((await dataSource.getRepository(Payment).findOneByOrFail({ id: payment.id })).status).toBe('pending');
    expect((await dataSource.getRepository(ListingOrder).findOneByOrFail({ id: order.id })).status).toBe(ListingOrderStatus.PENDING_PAYMENT);
    expect(await dataSource.getRepository(ListingEntitlement).countBy({ orderItemId: item.id })).toBe(0);
    expect(await dataSource.getRepository(PaymentEvent).countBy({ correlationReference: payment.id })).toBe(0);
  });

  it('does not ACK an unknown local payment ID or record its event', async () => {
    const { payment } = await fixture();
    const unknownId = randomUUID();
    await expect(controller.receiveNotification(request(payment, { tr_crc: unknownId }))).rejects.toThrow();
    expect(await dataSource.getRepository(PaymentEvent).countBy({ correlationReference: unknownId })).toBe(0);
  });

  it('ACKs a repeated webhook without a second entitlement', async () => {
    const { item, payment } = await fixture();
    const signed = request(payment);
    expect(await controller.receiveNotification(signed)).toBe('TRUE');
    expect(await controller.receiveNotification(signed)).toBe('TRUE');
    expect(await dataSource.getRepository(PaymentEvent).countBy({ correlationReference: payment.id })).toBe(1);
    expect(await dataSource.getRepository(ListingEntitlement).countBy({ orderItemId: item.id })).toBe(1);
  });

  it('finishes a previously recorded receipt whose listing was never fulfilled', async () => {
    const { order, item, payment } = await fixture();
    const notification = {
      provider: 'tpay', eventType: 'transaction' as const,
      providerReference: payment.providerTitle!, providerStatus: 'confirmed' as const,
      merchantReference: '123', correlationReference: payment.id,
      amountMinor: 4900, paidMinor: 4900, currency: 'PLN',
    };
    await dataSource.transaction((manager) => payments.recordVerifiedNotification(manager, notification));
    expect(await controller.receiveNotification(request(payment))).toBe('TRUE');
    expect((await dataSource.getRepository(ListingOrder).findOneByOrFail({ id: order.id })).status).toBe(ListingOrderStatus.PAID);
    expect(await dataSource.getRepository(PaymentEvent).countBy({ correlationReference: payment.id })).toBe(1);
    expect(await dataSource.getRepository(ListingEntitlement).countBy({ orderItemId: item.id })).toBe(1);
  });

  it('does not ACK or commit payment when required listing fulfillment fails', async () => {
    const { listing, order, item, payment } = await fixture();
    await dataSource.getRepository(PublicListingSubmission).delete({ publishedListingId: listing.id });
    await expect(controller.receiveNotification(request(payment))).rejects.toThrow();
    expect((await dataSource.getRepository(Payment).findOneByOrFail({ id: payment.id })).status).toBe('pending');
    expect((await dataSource.getRepository(ListingOrder).findOneByOrFail({ id: order.id })).status).toBe(ListingOrderStatus.PENDING_PAYMENT);
    expect(await dataSource.getRepository(ListingEntitlement).countBy({ orderItemId: item.id })).toBe(0);
    expect(await dataSource.getRepository(PaymentEvent).countBy({ correlationReference: payment.id })).toBe(0);
  });
});
