import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanCatalog } from './entities';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlanCatalog])],
  controllers: [PlansController],
  providers: [PlansService],
})
export class PlansModule {}
