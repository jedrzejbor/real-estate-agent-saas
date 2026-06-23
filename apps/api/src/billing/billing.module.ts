import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitoringModule } from '../monitoring';
import { UsersModule } from '../users';
import { Agency, Agent } from '../users/entities';
import { BillingSubscriptionEventsService } from './billing-subscription-events.service';
import { BillingWebhookEvent } from './entities/billing-webhook-event.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([BillingWebhookEvent, Agency, Agent]),
    UsersModule,
    MonitoringModule,
  ],
  providers: [BillingSubscriptionEventsService],
  exports: [BillingSubscriptionEventsService],
})
export class BillingModule {}
