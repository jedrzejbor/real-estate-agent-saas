import { PostgresAdvisoryLockService } from './postgres-advisory-lock.service';

function buildService() {
  const queryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    query: jest.fn(),
    release: jest.fn().mockResolvedValue(undefined),
  };
  const dataSource = {
    createQueryRunner: jest.fn(() => queryRunner),
  };
  const service = new PostgresAdvisoryLockService(dataSource as never);

  return {
    dataSource,
    queryRunner,
    service,
  };
}

describe('PostgresAdvisoryLockService', () => {
  it('runs callback while the advisory lock is held and releases it afterwards', async () => {
    const { queryRunner, service } = buildService();
    const callback = jest.fn().mockResolvedValue('done');

    queryRunner.query
      .mockResolvedValueOnce([{ acquired: true }])
      .mockResolvedValueOnce([{ pg_advisory_unlock: true }]);

    await expect(service.withLock('scheduler-lock', callback)).resolves.toEqual(
      {
        acquired: true,
        result: 'done',
      },
    );

    const lockKey = queryRunner.query.mock.calls[0][1][0];

    expect(callback).toHaveBeenCalledTimes(1);
    expect(queryRunner.query).toHaveBeenNthCalledWith(
      1,
      'SELECT pg_try_advisory_lock($1::integer) AS acquired',
      [lockKey],
    );
    expect(queryRunner.query).toHaveBeenNthCalledWith(
      2,
      'SELECT pg_advisory_unlock($1::integer)',
      [lockKey],
    );
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it('skips callback when the advisory lock is already held elsewhere', async () => {
    const { queryRunner, service } = buildService();
    const callback = jest.fn().mockResolvedValue('done');

    queryRunner.query.mockResolvedValueOnce([{ acquired: false }]);

    await expect(service.withLock('scheduler-lock', callback)).resolves.toEqual(
      {
        acquired: false,
      },
    );

    expect(callback).not.toHaveBeenCalled();
    expect(queryRunner.query).toHaveBeenCalledTimes(1);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it('releases the advisory lock when callback fails', async () => {
    const { queryRunner, service } = buildService();
    const error = new Error('batch failed');
    const callback = jest.fn().mockRejectedValue(error);

    queryRunner.query
      .mockResolvedValueOnce([{ acquired: true }])
      .mockResolvedValueOnce([{ pg_advisory_unlock: true }]);

    await expect(service.withLock('scheduler-lock', callback)).rejects.toThrow(
      error,
    );

    expect(queryRunner.query).toHaveBeenCalledTimes(2);
    expect(queryRunner.query).toHaveBeenLastCalledWith(
      'SELECT pg_advisory_unlock($1::integer)',
      [queryRunner.query.mock.calls[0][1][0]],
    );
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });
});
