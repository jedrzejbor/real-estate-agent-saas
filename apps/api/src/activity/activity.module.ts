import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog } from './entities/activity-log.entity';
import { Agent } from '../users/entities/agent.entity';
import { ActivityService } from './activity.service';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityLog, Agent])],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
