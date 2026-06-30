import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Listing } from '../listings/entities/listing.entity';
import { PublicLead } from '../public-leads/entities/public-lead.entity';
import { Task } from '../tasks/entities';
import { UsersModule } from '../users';
import { InsightDismissal } from './entities';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Listing,
      PublicLead,
      Appointment,
      Task,
      InsightDismissal,
    ]),
    UsersModule,
  ],
  controllers: [InsightsController],
  providers: [InsightsService],
})
export class InsightsModule {}
