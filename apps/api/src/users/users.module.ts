import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog } from '../activity/entities/activity-log.entity';
import { User, Agent, Agency } from './entities';
import { Listing } from '../listings/entities/listing.entity';
import { Client } from '../clients/entities/client.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { MonitoringModule } from '../monitoring';
import { PlanCatalog } from '../plans';
import { AgencyLimitDowngradeEnforcementService } from './agency-limit-downgrade-enforcement.service';
import { AgencyLimitDowngradeEnforcementScheduler } from './agency-limit-downgrade-enforcement.scheduler';
import { AgencyLimitEnforcementService } from './agency-limit-enforcement.service';
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
      PlanCatalog,
      ActivityLog,
    ]),
    MonitoringModule,
  ],
  providers: [
    UsersService,
    AgencyPlanService,
    AgencyLimitEnforcementService,
    AgencyLimitDowngradeEnforcementService,
    AgencyLimitDowngradeEnforcementScheduler,
  ],
  exports: [
    UsersService,
    AgencyPlanService,
    AgencyLimitEnforcementService,
    AgencyLimitDowngradeEnforcementService,
  ],
})
export class UsersModule {}
