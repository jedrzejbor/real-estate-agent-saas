import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateTransactionDto,
  CreateTransactionTaskDto,
  TransactionQueryDto,
  UpdateTransactionDto,
  UpdateTransactionStatusDto,
  UpdateTransactionTaskDto,
} from './dto';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /** POST /api/transactions — create a transaction pipeline item. */
  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(userId, dto);
  }

  /** GET /api/transactions — list transaction pipeline items. */
  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: TransactionQueryDto,
  ) {
    return this.transactionsService.findAll(userId, query);
  }

  /** GET /api/transactions/:id/events — list transaction audit events. */
  @Get(':id/events')
  async findEvents(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.transactionsService.findEvents(id, userId);
  }

  /** GET /api/transactions/:id/tasks — list transaction checklist tasks. */
  @Get(':id/tasks')
  async findTasks(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.transactionsService.findTasks(id, userId);
  }

  /** POST /api/transactions/:id/tasks — add a checklist task. */
  @Post(':id/tasks')
  async addTask(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTransactionTaskDto,
  ) {
    return this.transactionsService.addTask(id, userId, dto);
  }

  /** PATCH /api/transactions/:id/tasks/:taskId — update a checklist task. */
  @Patch(':id/tasks/:taskId')
  async updateTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTransactionTaskDto,
  ) {
    return this.transactionsService.updateTask(id, taskId, userId, dto);
  }

  /** DELETE /api/transactions/:id/tasks/:taskId — remove a checklist task. */
  @Delete(':id/tasks/:taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.transactionsService.removeTask(id, taskId, userId);
  }

  /** GET /api/transactions/:id — get transaction details. */
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.transactionsService.findOne(id, userId);
  }

  /** PATCH /api/transactions/:id — update transaction details. */
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(id, userId, dto);
  }

  /** PATCH /api/transactions/:id/status — update transaction status. */
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTransactionStatusDto,
  ) {
    return this.transactionsService.updateStatus(id, userId, dto);
  }

  /** DELETE /api/transactions/:id — soft-delete a transaction. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.transactionsService.remove(id, userId);
  }
}
