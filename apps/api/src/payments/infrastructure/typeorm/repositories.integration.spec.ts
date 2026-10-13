import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import {
  newPaymentId,
  newRenewalId,
  toPaymentAmountMinor,
} from '../../domain/payment.types';
import { Payment } from './payment.entity';
import { PaymentRepository } from './payment.repository';
import { RenewalRepository } from './renewal.repository';
import { SubscriptionRenewal } from './subscription-renewal.entity';
import { Subscription } from './subscription.entity';
import { SubscriptionRepository } from './subscription.repository';

const describeDatabase = process.env.PAY010_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase('PAY-010 transactional repositories on isolated PostgreSQL', () => {
  const database = process.env.PAY010_TEST_DB_NAME ?? 'real_estate_saas_pay010_test';
  const agencyId = randomUUID();
  const subscriptionId = randomUUID();
  const renewalId = newRenewalId();
  const paymentId = newPaymentId();
  const periodStart = new Date('2026-11-01T00:00:00Z');
  const periodEnd = new Date('2026-12-01T00:00:00Z');
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.PAY010_TEST_DB_HOST ?? '127.0.0.1',
    port: Number(process.env.PAY010_TEST_DB_PORT ?? 5433),
    username: process.env.PAY010_TEST_DB_USER ?? 'postgres',
    password: process.env.PAY010_TEST_DB_PASSWORD ?? 'postgres',
    database,
    entities: [Payment, Subscription, SubscriptionRenewal],
    synchronize: false,
  });
  const payments = new PaymentRepository(dataSource);
  const subscriptions = new SubscriptionRepository(dataSource);
  const renewals = new RenewalRepository(dataSource, payments, subscriptions);

  beforeAll(async () => {
    if (!database.endsWith('_pay010_test')) throw new Error('Dedicated PAY-010 test database required');
    await dataSource.initialize();
    for (const table of ['payments', 'subscriptions', 'subscription_renewals']) {
      const [{ name }] = await dataSource.query('SELECT to_regclass($1) AS name', [`public.${table}`]);
      if (!name) throw new Error(`Missing prerequisite test table: ${table}`);
    }
    await dataSource.query('INSERT INTO agencies (id, name, plan) VALUES ($1, $2, $3)',
      [agencyId, 'PAY-010 isolated test agency', 'free']);
    await subscriptions.save(dataSource.getRepository(Subscription).create({
      id: subscriptionId,
      agencyId,
      planCode: 'professional',
      priceAmountMinor: toPaymentAmountMinor(24900),
      currency: 'PLN',
      billingInterval: 'monthly',
      status: 'active',
      currentPeriodStart: new Date('2026-10-01T00:00:00Z'),
      currentPeriodEnd: periodStart,
    }));
    await renewals.save(dataSource.getRepository(SubscriptionRenewal).create({
      id: renewalId,
      subscriptionId,
      periodStart,
      periodEnd,
      amountMinor: toPaymentAmountMinor(24900),
      currency: 'PLN',
      status: 'due',
    }));
    await payments.save(dataSource.getRepository(Payment).create({
      id: paymentId,
      kind: 'subscription_renewal',
      renewalId,
      agencyId,
      amountMinor: toPaymentAmountMinor(24900),
      currency: 'PLN',
      status: 'pending',
      provider: 'test',
    }));
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    await dataSource.query('DROP TRIGGER IF EXISTS pay010_fail_projection ON agencies');
    await dataSource.query('DROP FUNCTION IF EXISTS pay010_fail_projection()');
    await dataSource.query('DELETE FROM payments WHERE id = $1', [paymentId]);
    await dataSource.query('DELETE FROM subscription_renewals WHERE id = $1', [renewalId]);
    await dataSource.query('DELETE FROM subscriptions WHERE id = $1', [subscriptionId]);
    await dataSource.query('DELETE FROM agencies WHERE id = $1', [agencyId]);
    await dataSource.destroy();
  });

  it('rejects unconfirmed payment and rolls back all earlier writes if projection fails', async () => {
    const input = { paymentId, renewalId, subscriptionId };
    await expect(renewals.applyConfirmedPayment(input)).rejects.toThrow('Payment is not confirmed');
    expect((await renewals.findById(renewalId))?.status).toBe('due');
    expect((await dataSource.query('SELECT plan FROM agencies WHERE id = $1', [agencyId]))[0].plan).toBe('free');

    await dataSource.getRepository(Payment).update(paymentId, { status: 'confirmed' });
    await dataSource.query(`CREATE FUNCTION pay010_fail_projection() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'PAY-010 test projection failure'; END; $$ LANGUAGE plpgsql`);
    await dataSource.query(`CREATE TRIGGER pay010_fail_projection BEFORE UPDATE ON agencies
      FOR EACH ROW WHEN (NEW.id = '${agencyId}') EXECUTE FUNCTION pay010_fail_projection()`);
    try {
      await expect(renewals.applyConfirmedPayment(input)).rejects.toThrow('PAY-010 test projection failure');
    } finally {
      await dataSource.query('DROP TRIGGER pay010_fail_projection ON agencies');
      await dataSource.query('DROP FUNCTION pay010_fail_projection()');
    }
    expect((await payments.findById(paymentId))?.confirmedAt).toBeNull();
    expect((await renewals.findById(renewalId))?.status).toBe('due');
    expect((await subscriptions.findById(subscriptionId))?.currentPeriodEnd).toEqual(periodStart);
    expect((await dataSource.query('SELECT plan FROM agencies WHERE id = $1', [agencyId]))[0].plan).toBe('free');
  });

  it('holds row locks until transaction end', async () => {
    const first = dataSource.createQueryRunner();
    const second = dataSource.createQueryRunner();
    await first.connect();
    await second.connect();
    try {
      expect(() => payments.lockById(paymentId, dataSource.manager))
        .toThrow('Row lock requires a transaction');
      await first.startTransaction();
      expect((await payments.lockById(paymentId, first.manager))?.id).toBe(paymentId);
      await second.startTransaction();
      await second.query("SET LOCAL lock_timeout = '150ms'");
      await expect(payments.lockById(paymentId, second.manager)).rejects.toMatchObject({
        driverError: { code: '55P03' },
      });
      await first.commitTransaction();
      await second.rollbackTransaction();
      await second.startTransaction();
      expect((await payments.lockById(paymentId, second.manager))?.id).toBe(paymentId);
      await second.commitTransaction();
    } finally {
      if (first.isTransactionActive) await first.rollbackTransaction();
      if (second.isTransactionActive) await second.rollbackTransaction();
      await first.release();
      await second.release();
    }
  });

  it('serializes parallel applications without duplicate records or period extension', async () => {
    const input = { paymentId, renewalId, subscriptionId };
    await Promise.all([renewals.applyConfirmedPayment(input), renewals.applyConfirmedPayment(input)]);
    expect((await payments.findById(paymentId))?.status).toBe('confirmed');
    expect((await payments.findById(paymentId))?.confirmedAt).toBeInstanceOf(Date);
    expect((await renewals.findById(renewalId))?.status).toBe('paid');
    expect((await subscriptions.findById(subscriptionId))?.currentPeriodEnd).toEqual(periodEnd);
    expect((await dataSource.query('SELECT plan, current_period_end FROM agencies WHERE id = $1', [agencyId]))[0])
      .toMatchObject({ plan: 'professional', current_period_end: periodEnd });
    expect(await dataSource.getRepository(Payment).countBy({ renewalId })).toBe(1);
    expect(await dataSource.getRepository(SubscriptionRenewal).countBy({ subscriptionId, periodStart })).toBe(1);
  });
});
