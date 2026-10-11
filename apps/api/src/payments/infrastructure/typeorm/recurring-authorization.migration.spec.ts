import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource, type Logger } from 'typeorm';
import { RecurringAuthorization } from './recurring-authorization.entity';
import { RecurringAuthorizationReferenceStore } from './recurring-authorization-reference.store';

const describeDatabase =
  process.env.PAY007_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase('PAY-007 recurring authorization on an isolated PostgreSQL database', () => {
  const database = process.env.PAY007_TEST_DB_NAME ?? 'real_estate_saas_pay007_test';
  const agencyId = randomUUID();
  const subscriptionId = randomUUID();
  const reference = 'PAY007_TEST_CARD_TOKEN_8f52c16d';
  const logs: string[] = [];
  const logger: Logger = {
    logQuery: (query, parameters) => logs.push(JSON.stringify([query, parameters])),
    logQueryError: (error, query, parameters) =>
      logs.push(JSON.stringify([error, query, parameters])),
    logQuerySlow: () => undefined,
    logSchemaBuild: () => undefined,
    logMigration: () => undefined,
    log: () => undefined,
  };
  const migration = readFileSync(
    resolve(__dirname, '../../../../migrations/20261011_recurring_authorizations.sql'),
    'utf8',
  );
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.PAY007_TEST_DB_HOST ?? '127.0.0.1',
    port: Number(process.env.PAY007_TEST_DB_PORT ?? 5433),
    username: process.env.PAY007_TEST_DB_USER ?? 'postgres',
    password: process.env.PAY007_TEST_DB_PASSWORD ?? 'postgres',
    database,
    entities: [RecurringAuthorization],
    synchronize: false,
    logging: ['query'],
    logger,
  });
  let store: RecurringAuthorizationReferenceStore;
  let firstId: RecurringAuthorization['id'];

  beforeAll(async () => {
    if (!database.endsWith('_pay007_test')) {
      throw new Error('PAY-007 tests require a dedicated *_pay007_test database');
    }
    await dataSource.initialize();
    const [{ name }] = await dataSource.query(
      "SELECT to_regclass('public.recurring_authorizations') AS name",
    );
    if (name !== null) {
      throw new Error('The isolated test database must not contain authorizations');
    }
    await dataSource.query('INSERT INTO agencies (id, name) VALUES ($1, $2)', [
      agencyId,
      'PAY-007 isolated test agency',
    ]);
    await dataSource.query(
      `INSERT INTO subscriptions
        (id, agency_id, plan_code, price_amount_minor, status)
       VALUES ($1, $2, 'professional', 24900, 'active')`,
      [subscriptionId, agencyId],
    );
    store = new RecurringAuthorizationReferenceStore(
      dataSource.getRepository(RecurringAuthorization),
      randomBytes(32),
    );
  });

  afterAll(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });

  it('enforces one active reference per subscription and method', async () => {
    await dataSource.query(migration);
    firstId = await store.storePendingReference({
      subscriptionId,
      provider: 'sandbox-provider',
      providerReferenceType: 'CARD_TOKEN',
      providerReference: reference,
    });
    const repository = dataSource.getRepository(RecurringAuthorization);
    await repository.update(firstId, {
      status: 'active',
      consentedAt: new Date('2026-10-01T00:00:00Z'),
    });

    const secondId = await store.storePendingReference({
      subscriptionId,
      provider: 'sandbox-provider',
      providerReferenceType: 'CARD_TOKEN',
      providerReference: 'PAY007_TEST_CARD_TOKEN_SECOND',
    });
    await expect(repository.update(secondId, { status: 'active' })).rejects.toMatchObject({
      driverError: { code: '23505' },
    });
  });

  it('decrypts only an active reference for its matching subscription', async () => {
    expect(
      await store.readActiveReferenceForRecurringOperation(
        firstId,
        subscriptionId,
        new Date('2026-10-11T00:00:00Z'),
      ),
    ).toBe(reference);
    await expect(
      store.readActiveReferenceForRecurringOperation(firstId, randomUUID()),
    ).rejects.toThrow('Recurring authorization unavailable');

    const wrongKeyStore = new RecurringAuthorizationReferenceStore(
      dataSource.getRepository(RecurringAuthorization),
      randomBytes(32),
    );
    await expect(
      wrongKeyStore.readActiveReferenceForRecurringOperation(
        firstId,
        subscriptionId,
      ),
    ).rejects.toThrow('Recurring authorization ciphertext is invalid');
  });

  it('keeps plaintext references out of database query logs', () => {
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.join('\n')).not.toContain(reference);
    expect(logs.join('\n')).not.toContain('PAY007_TEST_CARD_TOKEN_SECOND');
  });
});
