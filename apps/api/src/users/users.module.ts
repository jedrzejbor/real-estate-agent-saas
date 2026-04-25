import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Agent, Agency } from './entities';
import { AgencyPlanService } from './agency-plan.service';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Agent, Agency])],
  providers: [UsersService, AgencyPlanService],
  exports: [UsersService, AgencyPlanService],
})
export class UsersModule {}
