import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Agent, Agency } from './entities';
import { Listing } from '../listings/entities/listing.entity';
import { Client } from '../clients/entities/client.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AgencyPlanService } from './agency-plan.service';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Agent,
      Agency,
      Listing,
      Client,
      Appointment,
    ]),
  ],
  providers: [UsersService, AgencyPlanService],
  exports: [UsersService, AgencyPlanService],
})
export class UsersModule {}
