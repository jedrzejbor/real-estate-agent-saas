import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Agent } from '../users/entities/agent.entity';
import { UsersModule } from '../users';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Listing } from '../listings/entities/listing.entity';
import { Client } from '../clients/entities/client.entity';
import { PublicLead } from '../public-leads/entities';
import { Task } from '../tasks/entities';
import { ListingDocumentsModule } from '../listing-documents';
import { NotificationPreference, NotificationRead } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Agent,
      Appointment,
      Listing,
      Client,
      PublicLead,
      Task,
      NotificationRead,
      NotificationPreference,
    ]),
    UsersModule,
    ListingDocumentsModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
