import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ConflictException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Payment } from '../infrastructure/typeorm/payment.entity';
import { PaymentService, PrepareListingPaymentInput } from './payment.service';

const service = new PaymentService();
const input: PrepareListingPaymentInput = {
  orderId: randomUUID(),
  buyerUserId: randomUUID(),
  attemptId: randomUUID(),
  attemptNumber: 1,
  amountMinor: 4900,
  currency: 'PLN',
  provider: 'test-provider',
};

describe('PAY-021 local listing Payment', () => {
  it('stores the order correlation and reuses the same active attempt', async () => {
    const rows: Payment[] = [];
    const manager = {
      queryRunner: { isTransactionActive: true },
      find: jest.fn().mockImplementation(async () => rows),
      create: jest.fn((_entity: unknown, fields: object) => Object.assign(new Payment(), fields)),
      save: jest.fn(async (_entity: unknown, payment: Payment) => {
        rows.push(payment);
        return payment;
      }),
    } as unknown as EntityManager;

    const first = await service.prepareListingPayment(manager, input);
    const second = await service.prepareListingPayment(manager, input);
    expect(first).toBe(second);
    expect(rows).toHaveLength(1);
    expect(first).toMatchObject({
      kind: 'listing', orderId: input.orderId, buyerUserId: input.buyerUserId,
      correlationId: input.attemptId, attemptNo: 1, amountMinor: 4900,
      currency: 'PLN', status: 'created', providerTransactionId: null,
    });
  });

  it('blocks a second active attempt for the same order', async () => {
    const existing = Object.assign(new Payment(), {
      ...input, correlationId: input.attemptId,
      amountMinor: 4900, currency: 'PLN', status: 'unknown',
    });
    const manager = {
      queryRunner: { isTransactionActive: true },
      find: jest.fn().mockResolvedValue([existing]),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as EntityManager;
    await expect(service.prepareListingPayment(manager, {
      ...input, attemptId: randomUUID(), attemptNumber: 2,
    })).rejects.toBeInstanceOf(ConflictException);
    expect(manager.create).not.toHaveBeenCalled();
  });
});

const describeDatabase = process.env.PAY021_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase('PAY-021 isolated PostgreSQL integration', () => {
  const database = process.env.PAY021_TEST_DB_NAME ?? 'real_estate_saas_pay021_test';
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.PAY021_TEST_DB_HOST ?? '127.0.0.1',
    port: Number(process.env.PAY021_TEST_DB_PORT ?? 5433),
    username: process.env.PAY021_TEST_DB_USER ?? 'postgres',
    password: process.env.PAY021_TEST_DB_PASSWORD ?? 'postgres',
    database,
    entities: [Payment],
    synchronize: false,
  });
  const orderId = randomUUID();
  const buyerUserId = randomUUID();
  const attemptId = randomUUID();
  let ownsSchema = false;

  beforeAll(async () => {
    if (!database.endsWith('_pay021_test')) throw new Error('Dedicated PAY-021 test database required');
    await dataSource.initialize();
    const [existing] = await dataSource.query(`SELECT
      to_regclass('public.payments') AS payments,
      to_regclass('public.listing_orders') AS listing_orders,
      to_regclass('public.users') AS users,
      to_regclass('public.agency_plan_quotes') AS agency_plan_quotes,
      to_regclass('public.agencies') AS agencies`);
    if (Object.values(existing).some((table) => table !== null)) {
      throw new Error('PAY-021 test database must be empty');
    }
    ownsSchema = true;
    await dataSource.query('CREATE TABLE listing_orders (id uuid PRIMARY KEY, total_gross_amount int NOT NULL, currency varchar(3) NOT NULL)');
    await dataSource.query('CREATE TABLE users (id uuid PRIMARY KEY)');
    await dataSource.query('CREATE TABLE agency_plan_quotes (id uuid PRIMARY KEY)');
    await dataSource.query('CREATE TABLE agencies (id uuid PRIMARY KEY)');
    await dataSource.query(readFileSync(resolve(__dirname, '../../../migrations/20261011_payments.sql'), 'utf8'));
    await dataSource.query('INSERT INTO listing_orders (id, total_gross_amount, currency) VALUES ($1, $2, $3)', [orderId, 4900, 'PLN']);
    await dataSource.query('INSERT INTO users (id) VALUES ($1)', [buyerUserId]);
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    if (ownsSchema) {
      await dataSource.query('DROP TABLE IF EXISTS payments');
      await dataSource.query('DROP TABLE IF EXISTS agencies');
      await dataSource.query('DROP TABLE IF EXISTS agency_plan_quotes');
      await dataSource.query('DROP TABLE IF EXISTS users');
      await dataSource.query('DROP TABLE IF EXISTS listing_orders');
    }
    await dataSource.destroy();
  });

  it('persists one Payment from the backend order amount and rejects a second active attempt', async () => {
    const first = await dataSource.transaction(async (manager) => {
      const [order] = await manager.query('SELECT * FROM listing_orders WHERE id = $1 FOR UPDATE', [orderId]);
      return service.prepareListingPayment(manager, {
        orderId, buyerUserId, attemptId, attemptNumber: 1,
        amountMinor: order.total_gross_amount, currency: order.currency, provider: 'test-provider',
      });
    });
    expect(first.amountMinor).toBe(4900);
    expect(first.orderId).toBe(orderId);
    expect(first.correlationId).toBe(attemptId);

    await dataSource.transaction(async (manager) => {
      await manager.query('SELECT id FROM listing_orders WHERE id = $1 FOR UPDATE', [orderId]);
      await expect(service.prepareListingPayment(manager, {
        orderId, buyerUserId, attemptId: randomUUID(), attemptNumber: 2,
        amountMinor: 1, currency: 'PLN', provider: 'test-provider',
      })).rejects.toBeInstanceOf(ConflictException);
    });
    const payments = await dataSource.getRepository(Payment).findBy({ orderId });
    expect(payments).toHaveLength(1);
    expect(payments[0].amountMinor).toBe(4900);
  });
});
