import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { PaymentService, VerifiedPaymentNotification } from '../../application/payment.service';
import { newPaymentId, toPaymentAmountMinor } from '../../domain/payment.types';
import { TpayJwsVerifier } from '../tpay/tpay-jws.verifier';
import { TpayWebhookController } from '../tpay/tpay-webhook.controller';
import { Payment } from './payment.entity';
import { PaymentEvent } from './payment-event.entity';
import { ListingPaymentEventsService } from '../../../listing-commerce/listing-payment-events.service';

const describeDatabase = process.env.PAY027_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase('PAY-027 event ledger on isolated PostgreSQL', () => {
  const database = process.env.PAY027_TEST_DB_NAME ?? 'real_estate_saas_pay027_test';
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.PAY027_TEST_DB_HOST ?? '127.0.0.1',
    port: Number(process.env.PAY027_TEST_DB_PORT ?? 5433),
    username: process.env.PAY027_TEST_DB_USER ?? 'postgres',
    password: process.env.PAY027_TEST_DB_PASSWORD ?? 'postgres',
    database,
    entities: [Payment, PaymentEvent],
    synchronize: false,
  });
  const paymentMigration = readFileSync(
    resolve(__dirname, '../../../../migrations/20261011_payments.sql'), 'utf8');
  const eventMigration = readFileSync(
    resolve(__dirname, '../../../../migrations/20261016_payment_events.sql'), 'utf8');
  const migrationBody = eventMigration.replace(/^BEGIN;\s*$/m, '').replace(/^COMMIT;\s*$/m, '');
  const service = new PaymentService();
  let ownsSchema = false;

  const notification = (
    providerReference: string,
    overrides: Partial<VerifiedPaymentNotification> = {},
  ): VerifiedPaymentNotification => ({
    provider: 'tpay',
    eventType: 'transaction',
    providerReference,
    providerStatus: 'confirmed',
    merchantReference: '123',
    correlationReference: null,
    amountMinor: 4900,
    paidMinor: 4900,
    currency: 'PLN',
    ...overrides,
  });

  beforeAll(async () => {
    if (!database.endsWith('_pay027_test') || database === 'real_estate_saas') {
      throw new Error('A dedicated *_pay027_test database is required');
    }
    await dataSource.initialize();
    const [existing] = await dataSource.query(`SELECT
      to_regclass('public.payment_events') AS payment_events,
      to_regclass('public.payments') AS payments,
      to_regclass('public.listing_orders') AS listing_orders`);
    if (Object.values(existing).some((name) => name !== null)) {
      throw new Error('PAY-027 test database must be empty');
    }
    ownsSchema = true;
    await dataSource.query('CREATE TABLE listing_orders (id uuid PRIMARY KEY)');
    await dataSource.query('CREATE TABLE agency_plan_quotes (id uuid PRIMARY KEY)');
    await dataSource.query('CREATE TABLE users (id uuid PRIMARY KEY)');
    await dataSource.query('CREATE TABLE agencies (id uuid PRIMARY KEY)');
    await dataSource.query(paymentMigration);
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    if (ownsSchema) {
      await dataSource.query('DROP TABLE IF EXISTS payment_events');
      await dataSource.query('DROP TABLE IF EXISTS payments');
      await dataSource.query('DROP TABLE IF EXISTS agencies');
      await dataSource.query('DROP TABLE IF EXISTS users');
      await dataSource.query('DROP TABLE IF EXISTS agency_plan_quotes');
      await dataSource.query('DROP TABLE IF EXISTS listing_orders');
    }
    await dataSource.destroy();
  });

  it('rolls back the event migration, then applies it on the isolated database', async () => {
    const runner = dataSource.createQueryRunner();
    await runner.startTransaction();
    try {
      await runner.query(migrationBody);
      const [{ name }] = await runner.query("SELECT to_regclass('public.payment_events') AS name");
      expect(name).toBe('payment_events');
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
    const [{ name }] = await dataSource.query("SELECT to_regclass('public.payment_events') AS name");
    expect(name).toBeNull();
    await dataSource.query(eventMigration);
  });

  it('records a delivery once and enforces uniqueness in PostgreSQL', async () => {
    const input = notification('TR-PAY027-DUP');
    expect(await dataSource.transaction((manager) => service.recordVerifiedNotification(manager, input)))
      .toBe('recorded');
    expect(await dataSource.transaction((manager) => service.recordVerifiedNotification(manager, input)))
      .toBe('duplicate');
    const events = await dataSource.getRepository(PaymentEvent).findBy({ providerReference: input.providerReference });
    expect(events).toHaveLength(1);
    expect(events[0].amountMinor).toBe(4900);
    await expect(dataSource.query(`INSERT INTO payment_events
      (provider, event_key, event_type, provider_reference, provider_status, merchant_reference)
      VALUES ($1, $2, 'transaction', 'TR-OTHER', 'confirmed', '123')`,
      ['tpay', events[0].eventKey])).rejects.toMatchObject({ driverError: { code: '23505' } });
  });

  it('ACKs the same verified notification twice after only one durable insert', async () => {
    const controller = new TpayWebhookController(
      { verify: async () => true } as unknown as TpayJwsVerifier, dataSource, service,
      { fulfillVerifiedTpayListingInTransaction: async () => undefined } as unknown as ListingPaymentEventsService,
      { provider: 'tpay', tpay: { merchantId: '123' } } as never,
    );
    const request = {
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-jws-signature': 'local-test-signature',
      },
      rawBody: Buffer.from('id=123&tr_id=TR-PAY027-ACK&tr_status=true&tr_crc=00000000-0000-4000-8000-000000000001&tr_amount=49.00&tr_paid=49.00&tr_currency=PLN'),
    } as unknown as RawBodyRequest<Request>;

    expect(await controller.receiveNotification(request)).toBe('TRUE');
    expect(await controller.receiveNotification(request)).toBe('TRUE');
    expect(await dataSource.getRepository(PaymentEvent).countBy({ providerReference: 'TR-PAY027-ACK' }))
      .toBe(1);
    const [event] = await dataSource.getRepository(PaymentEvent).findBy({ providerReference: 'TR-PAY027-ACK' });
    expect(event.correlationReference).toBe('00000000-0000-4000-8000-000000000001');
  });

  it('does not ACK when a durable receipt transaction rolls back', async () => {
    const failingService = {
      recordVerifiedNotification: async (
        manager: Parameters<PaymentService['recordVerifiedNotification']>[0],
        input: VerifiedPaymentNotification,
      ) => {
        await service.recordVerifiedNotification(manager, input);
        throw new Error('forced receipt failure');
      },
    } as unknown as PaymentService;
    const controller = new TpayWebhookController(
      { verify: async () => true } as unknown as TpayJwsVerifier, dataSource, failingService,
      { fulfillVerifiedTpayListingInTransaction: async () => undefined } as unknown as ListingPaymentEventsService,
      { provider: 'tpay', tpay: { merchantId: '123' } } as never,
    );
    const request = {
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-jws-signature': 'local-test-signature',
      },
      rawBody: Buffer.from('id=123&tr_id=TR-PAY027-NOACK&tr_status=true&tr_crc=00000000-0000-4000-8000-000000000001&tr_amount=49.00&tr_paid=49.00'),
    } as unknown as RawBodyRequest<Request>;

    await expect(controller.receiveNotification(request)).rejects.toThrow('forced receipt failure');
    expect(await dataSource.getRepository(PaymentEvent).countBy({ providerReference: 'TR-PAY027-NOACK' }))
      .toBe(0);
  });

  it('stores out-of-order events without rolling a confirmed Payment back', async () => {
    const id = newPaymentId();
    await dataSource.getRepository(Payment).save({
      id,
      kind: 'listing',
      amountMinor: toPaymentAmountMinor(4900),
      currency: 'PLN',
      status: 'confirmed',
      provider: 'tpay',
      providerTitle: 'TR-PAY027-ORDER',
    });
    const input = notification('TR-PAY027-ORDER', { correlationReference: id });
    await dataSource.transaction((manager) => service.recordVerifiedNotification(manager, input));
    await dataSource.transaction((manager) => service.recordVerifiedNotification(manager, {
      ...input, providerStatus: 'failed',
    }));

    expect((await dataSource.getRepository(Payment).findOneByOrFail({ id })).status).toBe('confirmed');
    const events = await dataSource.getRepository(PaymentEvent).findBy({ paymentId: id });
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.providerStatus).sort()).toEqual(['confirmed', 'failed']);
  });

  it('rolls an event insert back with its transaction', async () => {
    const input = notification('TR-PAY027-ROLLBACK');
    await expect(dataSource.transaction(async (manager) => {
      expect(await service.recordVerifiedNotification(manager, input)).toBe('recorded');
      throw new Error('forced PAY-027 rollback');
    })).rejects.toThrow('forced PAY-027 rollback');
    expect(await dataSource.getRepository(PaymentEvent).countBy({ providerReference: input.providerReference }))
      .toBe(0);
  });
});
