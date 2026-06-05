import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanCatalog } from '../plans';
import { UsersModule } from '../users';
import { AdminPlansController } from './admin-plans.controller';
import { AdminPlansService } from './admin-plans.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlanCatalog]), UsersModule],
  controllers: [AdminPlansController],
  providers: [AdminPlansService],
})
export class AdminModule {}
