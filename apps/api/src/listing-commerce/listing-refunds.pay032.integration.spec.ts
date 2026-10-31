import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { PaymentService } from '../payments/application/payment.service';
import type { RefundGateway } from '../payments/ports/payment-gateway.port';
import { Payment } from '../payments/infrastructure/typeorm/payment.entity';
import { Refund } from '../payments/infrastructure/typeorm/refund.entity';

const describeDatabase = process.env.PAY032_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase('PAY-032 authorized refund audit on isolated PostgreSQL', () => {
  const database = process.env.PAY032_TEST_DB_NAME ?? 'real_estate_saas_pay032_test';
  const actorUserId = '817a5346-a992-4f14-91dc-042bb137883a';
  const dataSource = new DataSource({
    type: 'postgres', host: process.env.PAY032_TEST_DB_HOST ?? '127.0.0.1',
    port: Number(process.env.PAY032_TEST_DB_PORT ?? 5433),
    username: process.env.PAY032_TEST_DB_USER ?? 'postgres',
    password: process.env.PAY032_TEST_DB_PASSWORD ?? 'postgres',
    database, entities: [Payment, Refund], synchronize: false,
  });
  const migration = (name: string) => readFileSync(
    resolve(__dirname, `../../migrations/${name}`), 'utf8');
  let ownsSchema = false;

  beforeAll(async () => {
    if (!database.endsWith('_pay032_test') || database === 'real_estate_saas') {
      throw new Error('PAY-032 requires a dedicated *_pay032_test database');
    }
    await dataSource.initialize();
    const [existing] = await dataSource.query(`SELECT to_regclass('public.payments') AS payments,
      to_regclass('public.refunds') AS refunds, to_regclass('public.listing_orders') AS listing_orders`);
    if (Object.values(existing).some((value) => value !== null)) throw new Error('PAY-032 test database must be empty');
    ownsSchema = true;
    await dataSource.query('CREATE TABLE listing_orders (id uuid PRIMARY KEY)');
    await dataSource.query('CREATE TABLE agency_plan_quotes (id uuid PRIMARY KEY)');
    await dataSource.query('CREATE TABLE users (id uuid PRIMARY KEY)');
    await dataSource.query('CREATE TABLE agencies (id uuid PRIMARY KEY)');
    await dataSource.query('INSERT INTO users(id) VALUES ($1)', [actorUserId]);
    await dataSource.query(migration('20261011_payments.sql'));
    await dataSource.query(migration('20261020_refunds.sql'));
    await dataSource.query(migration('20261020_refund_actor.sql'));
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    if (ownsSchema) {
      for (const table of ['refunds', 'payments', 'agencies', 'users', 'agency_plan_quotes', 'listing_orders']) {
        await dataSource.query(`DROP TABLE IF EXISTS ${table}`);
      }
    }
    await dataSource.destroy();
  });

  const paid = async (status: Payment['status'] = 'confirmed') => {
    const repository = dataSource.getRepository(Payment);
    return repository.save(repository.create({
      kind: 'listing', amountMinor: 5000, currency: 'PLN', status, provider: 'tpay',
      providerTransactionId: `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`, metadata: {},
    }));
  };
  const gateway = (status: 'pending' | 'unknown' = 'pending') => ({
    refundPayment: jest.fn().mockResolvedValue({ status, providerRefundId: status === 'pending' ? 'rf_pay032' : null }),
    getRefundStatus: jest.fn(),
  }) as jest.Mocked<RefundGateway>;

  it('persists the actor and returns one intent without a second POST after restart', async () => {
    const payment = await paid();
    const psp = gateway();
    const input = { paymentId: payment.id, actorUserId, intentKey: 'pay032-audit', kind: 'partial' as const, amountMinor: 2000 };
    const first = await new PaymentService().requestRefund(dataSource, psp, input);
    expect(first.requestedByUserId).toBe(actorUserId);
    expect(first.status).toBe('pending');
    const restartedGateway = gateway();
    const duplicate = await new PaymentService().requestRefund(dataSource, restartedGateway, input);
    expect(duplicate.id).toBe(first.id);
    expect(restartedGateway.refundPayment).not.toHaveBeenCalled();
    expect(await dataSource.getRepository(Refund).countBy({ paymentId: payment.id, intentKey: input.intentKey })).toBe(1);
    expect((await dataSource.getRepository(Payment).findOneByOrFail({ id: payment.id })).status).toBe('confirmed');
  });

  it('blocks an unknown refund after restart and does not change payment state', async () => {
    const payment = await paid();
    const first = await new PaymentService().requestRefund(dataSource, gateway('unknown'), {
      paymentId: payment.id, actorUserId, intentKey: 'pay032-unknown', kind: 'full', amountMinor: 5000,
    });
    expect(first.status).toBe('unknown');
    const restartedGateway = gateway();
    const again = await new PaymentService().requestRefund(dataSource, restartedGateway, {
      paymentId: payment.id, actorUserId, intentKey: 'pay032-unknown', kind: 'full', amountMinor: 5000,
    });
    expect(again.id).toBe(first.id);
    expect(restartedGateway.refundPayment).not.toHaveBeenCalled();
  });

  it('does not call the provider or leave an intent for missing, unpaid or invalid-actor payments', async () => {
    const psp = gateway();
    const unpaid = await paid('pending');
    await expect(new PaymentService().requestRefund(dataSource, psp, {
      paymentId: unpaid.id, actorUserId, intentKey: 'unpaid', kind: 'full', amountMinor: 5000,
    })).rejects.toThrow();
    const paidPayment = await paid();
    await expect(new PaymentService().requestRefund(dataSource, psp, {
      paymentId: paidPayment.id, actorUserId: 'e9d144b7-f5e0-421b-9427-89b1f2867a33',
      intentKey: 'foreign-actor', kind: 'full', amountMinor: 5000,
    })).rejects.toThrow();
    expect(await dataSource.getRepository(Refund).countBy({ paymentId: paidPayment.id })).toBe(0);
    expect(psp.refundPayment).not.toHaveBeenCalled();
  });
});
