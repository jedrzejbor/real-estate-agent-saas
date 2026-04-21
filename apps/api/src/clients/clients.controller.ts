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
import { ClientsService } from './clients.service';
import {
  CreateClientDto,
  UpdateClientDto,
  ClientQueryDto,
  CreateClientNoteDto,
} from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // ── Client CRUD ──

  /** POST /api/clients — create a new client. */
  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateClientDto,
  ) {
    return this.clientsService.create(userId, dto);
  }

  /** GET /api/clients — list all clients (paginated, filtered). */
  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: ClientQueryDto,
  ) {
    return this.clientsService.findAll(userId, query);
  }

  /** GET /api/clients/:id/history — get audit log for a client. */
  @Get(':id/history')
  async findHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.clientsService.findHistory(id, userId);
  }

  /** GET /api/clients/:id — get single client with notes & preference. */
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.clientsService.findOne(id, userId);
  }

  /** PATCH /api/clients/:id — update a client. */
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(id, userId, dto);
  }

  /** DELETE /api/clients/:id — delete a client. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.clientsService.remove(id, userId);
  }

  // ── Client Notes ──

  /** GET /api/clients/:id/notes — list all notes for a client. */
  @Get(':id/notes')
  async findNotes(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.clientsService.findNotes(id, userId);
  }

  /** POST /api/clients/:id/notes — add a note to a client. */
  @Post(':id/notes')
  async addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateClientNoteDto,
  ) {
    return this.clientsService.addNote(id, userId, dto);
  }

  /** DELETE /api/clients/:clientId/notes/:noteId — remove a note. */
  @Delete(':clientId/notes/:noteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeNote(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.clientsService.removeNote(clientId, noteId, userId);
  }
}
