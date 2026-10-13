import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import type { PaymentId } from '../../domain/payment.types';
import { Payment } from './payment.entity';

@Injectable()
export class PaymentRepository {
  constructor(private readonly dataSource: DataSource) {}

  findById(id: PaymentId, manager: EntityManager = this.dataSource.manager): Promise<Payment | null> {
    return manager.findOneBy(Payment, { id });
  }

  save(payment: Payment, manager: EntityManager = this.dataSource.manager): Promise<Payment> {
    return manager.save(Payment, payment);
  }

  /** Requires a transaction-bound manager. */
  lockById(id: PaymentId, manager: EntityManager): Promise<Payment | null> {
    if (!manager.queryRunner?.isTransactionActive) throw new Error('Row lock requires a transaction');
    return manager.getRepository(Payment).createQueryBuilder('payment')
      .where('payment.id = :id', { id }).setLock('pessimistic_write').getOne();
  }
}
