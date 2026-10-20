import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { PaymentService } from '../../application/payment.service';
import { toPaymentAmountMinor } from '../../domain/payment.types';
import type { RefundGateway } from '../../ports/payment-gateway.port';
import { Payment } from './payment.entity';
import { Refund } from './refund.entity';

const describeDatabase = process.env.PAY031_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase('PAY-031 durable refund intents on isolated PostgreSQL', () => {
  const database = process.env.PAY031_TEST_DB_NAME ?? 'real_estate_saas_pay031_test';
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.PAY031_TEST_DB_HOST ?? '127.0.0.1',
    port: Number(process.env.PAY031_TEST_DB_PORT ?? 5433),
    username: process.env.PAY031_TEST_DB_USER ?? 'postgres',
    password: process.env.PAY031_TEST_DB_PASSWORD ?? 'postgres',
    database,
    entities: [Payment, Refund],
    synchronize: false,
  });
  const paymentMigration = readFileSync(resolve(__dirname, '../../../../migrations/20261011_payments.sql'), 'utf8');
  const refundMigration = readFileSync(resolve(__dirname, '../../../../migrations/20261020_refunds.sql'), 'utf8');
  const migrationBody = refundMigration.replace(/^BEGIN;\s*$/m, '').replace(/^COMMIT;\s*$/m, '');
  const service = new PaymentService();
  let ownsSchema = false;

  beforeAll(async () => {
    if (!database.endsWith('_pay031_test') || database === 'real_estate_saas') {
      throw new Error('PAY-031 requires a dedicated *_pay031_test database');
    }
    await dataSource.initialize();
    const [existing] = await dataSource.query(`SELECT to_regclass('public.refunds') AS refunds,
      to_regclass('public.payments') AS payments, to_regclass('public.listing_orders') AS listing_orders`);
    if (Object.values(existing).some((value) => value !== null)) throw new Error('PAY-031 test database must be empty');
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
      await dataSource.query('DROP TABLE IF EXISTS refunds');
      await dataSource.query('DROP TABLE IF EXISTS payments');
      await dataSource.query('DROP TABLE IF EXISTS agencies');
      await dataSource.query('DROP TABLE IF EXISTS users');
      await dataSource.query('DROP TABLE IF EXISTS agency_plan_quotes');
      await dataSource.query('DROP TABLE IF EXISTS listing_orders');
    }
    await dataSource.destroy();
  });

  const payment = async (amountMinor = 10000) => {
    const repository = dataSource.getRepository(Payment);
    return repository.save(repository.create({
      kind: 'listing', amountMinor: toPaymentAmountMinor(amountMinor), currency: 'PLN',
      status: 'confirmed', provider: 'tpay', providerTransactionId: `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      metadata: {},
    }));
  };
  const gateway = (outcome: { status: 'pending' | 'unknown' | 'failed'; providerRefundId: string | null }) => ({
    refundPayment: jest.fn().mockResolvedValue(outcome),
    getRefundStatus: jest.fn().mockResolvedValue({ status: 'unknown', providerRefundId: outcome.providerRefundId }),
  }) as jest.Mocked<RefundGateway>;

  it('rolls back the migration, then applies it with the unique intent and FK', async () => {
    const runner = dataSource.createQueryRunner();
    await runner.startTransaction();
    try {
      await runner.query(migrationBody);
      const [{ name }] = await runner.query("SELECT to_regclass('public.refunds') AS name");
      expect(name).toBe('refunds');
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
    const [{ name }] = await dataSource.query("SELECT to_regclass('public.refunds') AS name");
    expect(name).toBeNull();
    await dataSource.query(refundMigration);
  });

  it('deduplicates an intent and reserves multiple partial refunds without over-refunding', async () => {
    const paid = await payment();
    const psp = gateway({ status: 'pending', providerRefundId: 'rf_first' });
    const first = await service.requestRefund(dataSource, psp, {
      paymentId: paid.id, intentKey: 'first', kind: 'partial', amountMinor: 3000,
    });
    expect(first.status).toBe('pending');
    expect((await service.requestRefund(dataSource, psp, {
      paymentId: paid.id, intentKey: 'first', kind: 'partial', amountMinor: 3000,
    })).id).toBe(first.id);
    expect(psp.refundPayment).toHaveBeenCalledTimes(1);
    await expect(dataSource.getRepository(Refund).save(dataSource.getRepository(Refund).create({
      paymentId: paid.id, intentKey: 'first', kind: 'partial', amountMinor: 3000,
      currency: 'PLN', provider: 'tpay', providerTransactionId: paid.providerTransactionId!,
      providerRefundId: null, status: 'requesting', confirmedAt: null,
    }))).rejects.toMatchObject({ driverError: { code: '23505' } });
    psp.refundPayment.mockResolvedValueOnce({ status: 'pending', providerRefundId: 'rf_second' });
    await service.requestRefund(dataSource, psp, {
      paymentId: paid.id, intentKey: 'second', kind: 'partial', amountMinor: 7000,
    });
    await expect(service.requestRefund(dataSource, psp, {
      paymentId: paid.id, intentKey: 'excess', kind: 'partial', amountMinor: 1,
    })).rejects.toThrow();
    expect(await dataSource.getRepository(Refund).countBy({ paymentId: paid.id })).toBe(2);
    expect(psp.refundPayment).toHaveBeenCalledTimes(2);
  });

  it('blocks retries after an unknown outcome even with a new service and gateway', async () => {
    const paid = await payment();
    const firstGateway = gateway({ status: 'unknown', providerRefundId: null });
    const first = await service.requestRefund(dataSource, firstGateway, {
      paymentId: paid.id, intentKey: 'ambiguous', kind: 'full', amountMinor: 10000,
    });
    expect(first.status).toBe('unknown');
    const restartedGateway = gateway({ status: 'pending', providerRefundId: 'rf_duplicate' });
    const restartedService = new PaymentService();
    expect((await restartedService.requestRefund(dataSource, restartedGateway, {
      paymentId: paid.id, intentKey: 'ambiguous', kind: 'full', amountMinor: 10000,
    })).id).toBe(first.id);
    await expect(restartedService.requestRefund(dataSource, restartedGateway, {
      paymentId: paid.id, intentKey: 'another', kind: 'partial', amountMinor: 1,
    })).rejects.toThrow();
    expect(restartedGateway.refundPayment).not.toHaveBeenCalled();
  });

  it('serializes concurrent workers on the Payment row and sends one POST', async () => {
    const paid = await payment();
    const psp = gateway({ status: 'pending', providerRefundId: 'rf_concurrent' });
    const input = { paymentId: paid.id, intentKey: 'concurrent', kind: 'full' as const, amountMinor: 10000 };
    const [a, b] = await Promise.all([
      new PaymentService().requestRefund(dataSource, psp, input),
      new PaymentService().requestRefund(dataSource, psp, input),
    ]);
    expect(a.id).toBe(b.id);
    expect(psp.refundPayment).toHaveBeenCalledTimes(1);
  });

  it('confirms only a matching provider GET and rolls back an unfinished local write', async () => {
    const paid = await payment();
    const psp = gateway({ status: 'pending', providerRefundId: 'rf_lookup' });
    const refund = await service.requestRefund(dataSource, psp, {
      paymentId: paid.id, intentKey: 'lookup', kind: 'partial', amountMinor: 2500,
    });
    psp.getRefundStatus.mockResolvedValueOnce({ status: 'confirmed', providerRefundId: 'rf_lookup', amountMinor: toPaymentAmountMinor(1), currency: 'PLN' });
    expect((await service.reconcileRefund(dataSource, psp, refund.id)).status).toBe('pending');
    psp.getRefundStatus.mockResolvedValueOnce({ status: 'confirmed', providerRefundId: 'rf_lookup', amountMinor: toPaymentAmountMinor(2500), currency: 'PLN' });
    expect((await service.reconcileRefund(dataSource, psp, refund.id)).status).toBe('confirmed');
    expect((await dataSource.getRepository(Payment).findOneByOrFail({ id: paid.id })).status).toBe('confirmed');
    await expect(dataSource.transaction(async (manager) => {
      await manager.save(Refund, manager.create(Refund, {
        paymentId: paid.id, intentKey: 'rolled_back', kind: 'partial', amountMinor: 1,
        currency: 'PLN', provider: 'tpay', providerTransactionId: paid.providerTransactionId!,
        providerRefundId: null, status: 'requesting', confirmedAt: null,
      }));
      throw new Error('rollback fixture');
    })).rejects.toThrow('rollback fixture');
    expect(await dataSource.getRepository(Refund).countBy({ paymentId: paid.id, intentKey: 'rolled_back' })).toBe(0);
  });

  it('resolves an unknown request through a matching pending read before another partial refund', async () => {
    const paid = await payment();
    const psp = gateway({ status: 'unknown', providerRefundId: 'rf_uncertain' });
    psp.releaseRefundUncertainty = jest.fn();
    const first = await service.requestRefund(dataSource, psp, {
      paymentId: paid.id, intentKey: 'uncertain', kind: 'partial', amountMinor: 4000,
    });
    expect(first.status).toBe('unknown');
    psp.getRefundStatus.mockResolvedValueOnce({
      status: 'pending', providerRefundId: 'rf_uncertain', amountMinor: toPaymentAmountMinor(4000), currency: 'PLN',
    });
    expect((await service.reconcileRefund(dataSource, psp, first.id)).status).toBe('pending');
    expect(psp.releaseRefundUncertainty).toHaveBeenCalledWith(paid.id);
    psp.refundPayment.mockResolvedValueOnce({ status: 'pending', providerRefundId: 'rf_next' });
    const next = await service.requestRefund(dataSource, psp, {
      paymentId: paid.id, intentKey: 'next', kind: 'partial', amountMinor: 6000,
    });
    expect(next.status).toBe('pending');
  });
});
