import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { toPaymentAmountMinor } from '../../domain/payment.types';
import { Payment } from './payment.entity';

const describeDatabase =
  process.env.PAY005_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase('PAY-005 payments migration on an isolated PostgreSQL database', () => {
  const database = process.env.PAY005_TEST_DB_NAME ?? 'real_estate_saas_pay005_test';
  const migration = readFileSync(
    resolve(__dirname, '../../../../migrations/20261011_payments.sql'),
    'utf8',
  );
  const migrationBody = migration
    .replace(/^BEGIN;\s*$/m, '')
    .replace(/^COMMIT;\s*$/m, '');
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.PAY005_TEST_DB_HOST ?? '127.0.0.1',
    port: Number(process.env.PAY005_TEST_DB_PORT ?? 5433),
    username: process.env.PAY005_TEST_DB_USER ?? 'postgres',
    password: process.env.PAY005_TEST_DB_PASSWORD ?? 'postgres',
    database,
    entities: [Payment],
    synchronize: false,
  });
  let createdTable = false;

  beforeAll(async () => {
    if (!database.endsWith('_pay005_test')) {
      throw new Error('PAY-005 integration tests require a dedicated *_pay005_test database');
    }

    await dataSource.initialize();
    const [{ name }] = await dataSource.query(
      "SELECT to_regclass('public.payments') AS name",
    );
    if (name !== null) {
      throw new Error('The isolated test database must not already contain payments');
    }
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      if (createdTable) {
        await dataSource.query('DROP TABLE payments');
      }
      await dataSource.destroy();
    }
  });

  it('rolls back the whole DDL migration transaction', async () => {
    const runner = dataSource.createQueryRunner();
    await runner.startTransaction();
    try {
      await runner.query(migrationBody);
      const [{ name: insideTransaction }] = await runner.query(
        "SELECT to_regclass('public.payments') AS name",
      );
      expect(insideTransaction).toBe('payments');
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }

    const [{ name: afterRollback }] = await dataSource.query(
      "SELECT to_regclass('public.payments') AS name",
    );
    expect(afterRollback).toBeNull();
  });

  it('persists a payment with a local ID and an integer amount in grosze', async () => {
    await dataSource.query(migration);
    createdTable = true;

    const repository = dataSource.getRepository(Payment);
    const saved = await repository.save(
      repository.create({
        kind: 'listing',
        amountMinor: toPaymentAmountMinor(4999),
        currency: 'PLN',
        status: 'pending',
        provider: 'sandbox-provider',
        providerTransactionId: 'transaction-1',
        metadata: { test: true },
      }),
    );
    const loaded = await repository.findOneByOrFail({ id: saved.id });

    expect(loaded.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(loaded.amountMinor).toBe(4999);
    expect(loaded.status).toBe('pending');
    expect(loaded.metadata).toEqual({ test: true });
  });

  it('rejects a duplicate provider transaction and permits another provider', async () => {
    const repository = dataSource.getRepository(Payment);
    const duplicate = repository.create({
      kind: 'listing',
      amountMinor: toPaymentAmountMinor(4999),
      currency: 'PLN',
      status: 'created',
      provider: 'sandbox-provider',
      providerTransactionId: 'transaction-1',
    });

    await expect(repository.save(duplicate)).rejects.toMatchObject({
      driverError: { code: '23505' },
    });

    const otherProvider = await repository.save(
      repository.create({
        kind: 'listing',
        amountMinor: toPaymentAmountMinor(4999),
        currency: 'PLN',
        status: 'created',
        provider: 'another-provider',
        providerTransactionId: 'transaction-1',
      }),
    );
    expect(otherProvider.id).toBeDefined();
  });
});
