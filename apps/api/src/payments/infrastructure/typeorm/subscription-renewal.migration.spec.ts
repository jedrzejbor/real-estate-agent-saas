import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import {
  canStartRenewalAttempt,
  toPaymentAmountMinor,
} from '../../domain/payment.types';
import {
  SubscriptionRenewal,
  SubscriptionRenewalAttempt,
} from './subscription-renewal.entity';

const describeDatabase =
  process.env.PAY008_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase('PAY-008 renewal migration on an isolated PostgreSQL database', () => {
  const database = process.env.PAY008_TEST_DB_NAME ?? 'real_estate_saas_pay008_test';
  const agencyId = randomUUID();
  const subscriptionId = randomUUID();
  const periodStart = new Date('2026-11-01T00:00:00Z');
  const periodEnd = new Date('2026-12-01T00:00:00Z');
  const migration = readFileSync(
    resolve(__dirname, '../../../../migrations/20261011_subscription_renewals.sql'),
    'utf8',
  );
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.PAY008_TEST_DB_HOST ?? '127.0.0.1',
    port: Number(process.env.PAY008_TEST_DB_PORT ?? 5433),
    username: process.env.PAY008_TEST_DB_USER ?? 'postgres',
    password: process.env.PAY008_TEST_DB_PASSWORD ?? 'postgres',
    database,
    entities: [SubscriptionRenewal, SubscriptionRenewalAttempt],
    synchronize: false,
  });
  let renewalId: SubscriptionRenewal['id'];

  beforeAll(async () => {
    if (!database.endsWith('_pay008_test')) {
      throw new Error('PAY-008 integration tests require a dedicated *_pay008_test database');
    }
    await dataSource.initialize();
    const [{ name }] = await dataSource.query(
      "SELECT to_regclass('public.subscription_renewals') AS name",
    );
    if (name !== null) {
      throw new Error('The isolated test database must not already contain renewals');
    }
    await dataSource.query('INSERT INTO agencies (id, name) VALUES ($1, $2)', [
      agencyId,
      'PAY-008 isolated test agency',
    ]);
    await dataSource.query(
      `INSERT INTO subscriptions
        (id, agency_id, plan_code, price_amount_minor, status)
       VALUES ($1, $2, 'professional', 24900, 'active')`,
      [subscriptionId, agencyId],
    );
  });

  afterAll(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });

  it('rejects a second renewal for the same subscription and period', async () => {
    await dataSource.query(migration);
    const repository = dataSource.getRepository(SubscriptionRenewal);
    const first = await repository.save(
      repository.create({
        subscriptionId,
        periodStart,
        periodEnd,
        amountMinor: toPaymentAmountMinor(24900),
        currency: 'PLN',
        status: 'due',
      }),
    );
    renewalId = first.id;

    await expect(
      repository.save(
        repository.create({
          subscriptionId,
          periodStart,
          periodEnd,
          amountMinor: toPaymentAmountMinor(24900),
          currency: 'PLN',
          status: 'due',
        }),
      ),
    ).rejects.toMatchObject({ driverError: { code: '23505' } });
    expect(await repository.countBy({ subscriptionId, periodStart })).toBe(1);
  });

  it('blocks retry while an attempt is unknown and permits it after failure', async () => {
    const renewalRepository = dataSource.getRepository(SubscriptionRenewal);
    const attemptRepository = dataSource.getRepository(SubscriptionRenewalAttempt);
    await renewalRepository.update(renewalId, { status: 'unknown' });
    const first = await attemptRepository.save(
      attemptRepository.create({
        renewalId,
        attemptNo: 1,
        status: 'unknown',
      }),
    );

    expect(canStartRenewalAttempt('unknown', 'unknown')).toBe(false);
    await expect(
      attemptRepository.save(
        attemptRepository.create({
          renewalId,
          attemptNo: 2,
          status: 'charging',
        }),
      ),
    ).rejects.toMatchObject({ driverError: { code: '23505' } });

    await attemptRepository.update(first.id, {
      status: 'failed',
      resolvedAt: new Date('2026-11-01T12:00:00Z'),
    });
    await renewalRepository.update(renewalId, { status: 'failed' });
    expect(canStartRenewalAttempt('failed', 'failed')).toBe(true);
    const retry = await attemptRepository.save(
      attemptRepository.create({
        renewalId,
        attemptNo: 2,
        status: 'charging',
      }),
    );
    expect(retry.attemptNo).toBe(2);
    expect(await renewalRepository.countBy({ subscriptionId, periodStart })).toBe(1);
  });
});
