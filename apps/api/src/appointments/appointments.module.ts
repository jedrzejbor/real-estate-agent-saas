import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './entities/appointment.entity';
import { Agent } from '../users/entities/agent.entity';
import { UsersModule } from '../users';
import { MonitoringModule } from '../monitoring';
import { TasksModule } from '../tasks/tasks.module';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, Agent]),
    UsersModule,
    MonitoringModule,
    TasksModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
