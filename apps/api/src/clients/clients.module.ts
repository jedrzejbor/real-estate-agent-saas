import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { ClientNote } from './entities/client-note.entity';
import { ClientPreference } from './entities/client-preference.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { PublicLead } from '../public-leads/entities/public-lead.entity';
import { Task } from '../tasks/entities';
import { Agent } from '../users/entities/agent.entity';
import { Listing } from '../listings/entities/listing.entity';
import { UsersModule } from '../users';
import { ActivityModule } from '../activity';
import { MonitoringModule } from '../monitoring';
import { MatchingModule } from '../matching';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Client,
      ClientNote,
      ClientPreference,
      Appointment,
      PublicLead,
      Task,
      Agent,
      Listing,
    ]),
    UsersModule,
    ActivityModule,
    MonitoringModule,
    MatchingModule,
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
