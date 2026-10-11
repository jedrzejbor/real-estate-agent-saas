import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { toPaymentAmountMinor } from '../../domain/payment.types';
import { Subscription } from './subscription.entity';

const describeDatabase =
  process.env.PAY006_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase('PAY-006 subscriptions migration on an isolated PostgreSQL database', () => {
  const database = process.env.PAY006_TEST_DB_NAME ?? 'real_estate_saas_pay006_test';
  const agencyId = randomUUID();
  const migration = readFileSync(
    resolve(__dirname, '../../../../migrations/20261011_subscriptions.sql'),
    'utf8',
  );
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.PAY006_TEST_DB_HOST ?? '127.0.0.1',
    port: Number(process.env.PAY006_TEST_DB_PORT ?? 5433),
    username: process.env.PAY006_TEST_DB_USER ?? 'postgres',
    password: process.env.PAY006_TEST_DB_PASSWORD ?? 'postgres',
    database,
    entities: [Subscription],
    synchronize: false,
  });
  let createdTable = false;
  let createdAgency = false;

  beforeAll(async () => {
    if (!database.endsWith('_pay006_test')) {
      throw new Error('PAY-006 integration tests require a dedicated *_pay006_test database');
    }

    await dataSource.initialize();
    const [{ name }] = await dataSource.query(
      "SELECT to_regclass('public.subscriptions') AS name",
    );
    if (name !== null) {
      throw new Error('The isolated test database must not already contain subscriptions');
    }

    await dataSource.query('INSERT INTO agencies (id, name) VALUES ($1, $2)', [
      agencyId,
      'PAY-006 isolated test agency',
    ]);
    createdAgency = true;
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      if (createdTable) await dataSource.query('DROP TABLE subscriptions');
      if (createdAgency) {
        await dataSource.query('DELETE FROM agencies WHERE id = $1', [agencyId]);
      }
      await dataSource.destroy();
    }
  });

  it('keeps one active or past_due subscription per agency', async () => {
    await dataSource.query(migration);
    createdTable = true;

    const repository = dataSource.getRepository(Subscription);
    const subscription = await repository.save(
      repository.create({
        agencyId,
        planCode: 'professional',
        priceAmountMinor: toPaymentAmountMinor(24900),
        currency: 'PLN',
        billingInterval: 'monthly',
        status: 'active',
        currentPeriodStart: new Date('2026-10-01T00:00:00Z'),
        currentPeriodEnd: new Date('2026-11-01T00:00:00Z'),
      }),
    );
    expect(subscription.id).toBeDefined();

    await expect(
      repository.save(
        repository.create({
          agencyId,
          planCode: 'professional',
          priceAmountMinor: toPaymentAmountMinor(24900),
          currency: 'PLN',
          billingInterval: 'monthly',
          status: 'past_due',
          currentPeriodStart: new Date('2026-10-01T00:00:00Z'),
          currentPeriodEnd: new Date('2026-11-01T00:00:00Z'),
          graceEndsAt: new Date('2026-11-08T00:00:00Z'),
        }),
      ),
    ).rejects.toMatchObject({ driverError: { code: '23505' } });

    await repository.update(subscription.id, { status: 'cancelled' });
    const successor = await repository.save(
      repository.create({
        agencyId,
        planCode: 'professional',
        priceAmountMinor: toPaymentAmountMinor(24900),
        currency: 'PLN',
        billingInterval: 'monthly',
        status: 'active',
        currentPeriodStart: new Date('2026-11-01T00:00:00Z'),
        currentPeriodEnd: new Date('2026-12-01T00:00:00Z'),
      }),
    );
    expect(successor.id).not.toBe(subscription.id);
  });
});
