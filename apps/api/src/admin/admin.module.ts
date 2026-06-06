import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanCatalog } from '../plans';
import { Agency, Agent } from '../users/entities';
import { UsersModule } from '../users';
import { AdminAgenciesController } from './admin-agencies.controller';
import { AdminAgencyPlansController } from './admin-agency-plans.controller';
import { AdminAgencyPlansService } from './admin-agency-plans.service';
import { AdminPlansController } from './admin-plans.controller';
import { AdminPlansService } from './admin-plans.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlanCatalog, Agency, Agent]), UsersModule],
  controllers: [
    AdminPlansController,
    AdminAgenciesController,
    AdminAgencyPlansController,
  ],
  providers: [AdminPlansService, AdminAgencyPlansService],
})
export class AdminModule {}
