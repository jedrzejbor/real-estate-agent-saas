import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Subscription } from './subscription.entity';

@Injectable()
export class SubscriptionRepository {
  constructor(private readonly dataSource: DataSource) {}

  findById(id: string, manager: EntityManager = this.dataSource.manager): Promise<Subscription | null> {
    return manager.findOneBy(Subscription, { id });
  }

  save(subscription: Subscription, manager: EntityManager = this.dataSource.manager): Promise<Subscription> {
    return manager.save(Subscription, subscription);
  }

  /** Requires a transaction-bound manager. */
  lockById(id: string, manager: EntityManager): Promise<Subscription | null> {
    if (!manager.queryRunner?.isTransactionActive) throw new Error('Row lock requires a transaction');
    return manager.getRepository(Subscription).createQueryBuilder('subscription')
      .where('subscription.id = :id', { id }).setLock('pessimistic_write').getOne();
  }
}
