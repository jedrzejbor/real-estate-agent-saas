import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { ClientNote } from './entities/client-note.entity';
import { ClientPreference } from './entities/client-preference.entity';
import { Agent } from '../users/entities/agent.entity';
import { ActivityModule } from '../activity';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, ClientNote, ClientPreference, Agent]),
    ActivityModule,
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
