import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  AppointmentQueryDto,
} from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  /** POST /api/appointments — create a new appointment. */
  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(userId, dto);
  }

  /** GET /api/appointments — list appointments (paginated, filtered). */
  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: AppointmentQueryDto,
  ) {
    return this.appointmentsService.findAll(userId, query);
  }

  /** GET /api/appointments/:id — get single appointment. */
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.appointmentsService.findOne(id, userId);
  }

  /** PATCH /api/appointments/:id — update an appointment. */
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(id, userId, dto);
  }

  /** DELETE /api/appointments/:id — delete an appointment. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.appointmentsService.remove(id, userId);
  }
}
