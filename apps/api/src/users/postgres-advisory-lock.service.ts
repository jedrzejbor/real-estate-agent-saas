import { Injectable, Logger } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';

const INT32_MAX = 2_147_483_647;

@Injectable()
export class PostgresAdvisoryLockService {
  private readonly logger = new Logger(PostgresAdvisoryLockService.name);

  constructor(private readonly dataSource: DataSource) {}

  async withLock<T>(
    lockName: string,
    callback: () => Promise<T>,
  ): Promise<{ acquired: true; result: T } | { acquired: false }> {
    const queryRunner = this.dataSource.createQueryRunner();
    const lockKey = this.toLockKey(lockName);

    await queryRunner.connect();

    try {
      const acquired = await this.tryAcquire(queryRunner, lockKey);

      if (!acquired) {
        return { acquired: false };
      }

      try {
        return {
          acquired: true,
          result: await callback(),
        };
      } finally {
        await this.release(queryRunner, lockKey);
      }
    } finally {
      await queryRunner.release();
    }
  }

  private async tryAcquire(
    queryRunner: QueryRunner,
    lockKey: number,
  ): Promise<boolean> {
    const rows = (await queryRunner.query(
      'SELECT pg_try_advisory_lock($1::integer) AS acquired',
      [lockKey],
    )) as Array<{ acquired?: boolean }>;

    return rows[0]?.acquired === true;
  }

  private async release(
    queryRunner: QueryRunner,
    lockKey: number,
  ): Promise<void> {
    try {
      await queryRunner.query('SELECT pg_advisory_unlock($1::integer)', [
        lockKey,
      ]);
    } catch (error) {
      this.logger.error(
        `Failed to release advisory lock ${lockKey}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private toLockKey(lockName: string): number {
    let hash = 0;

    for (let index = 0; index < lockName.length; index += 1) {
      hash = (hash * 31 + lockName.charCodeAt(index)) | 0;
    }

    return Math.abs(hash) % INT32_MAX;
  }
}
