import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../clients/entities/client.entity';
import { Listing } from '../listings/entities/listing.entity';
import { Agent } from '../users/entities/agent.entity';
import { Transaction, TransactionEvent, TransactionTask } from './entities';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      TransactionTask,
      TransactionEvent,
      Listing,
      Client,
      Agent,
    ]),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
