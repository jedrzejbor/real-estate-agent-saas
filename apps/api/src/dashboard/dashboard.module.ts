import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../listings/entities/listing.entity';
import { Client } from '../clients/entities/client.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Agent } from '../users/entities/agent.entity';
import { UsersModule } from '../users';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Listing, Client, Appointment, Agent]), UsersModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
