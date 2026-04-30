import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityModule } from '../activity';
import { Client } from '../clients/entities/client.entity';
import { ClientNote } from '../clients/entities/client-note.entity';
import { Listing } from '../listings/entities/listing.entity';
import { Agent } from '../users/entities';
import { PublicLead } from './entities/public-lead.entity';
import { PublicLeadsController } from './public-leads.controller';
import { PublicLeadsService } from './public-leads.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PublicLead, Listing, Agent, Client, ClientNote]),
    ActivityModule,
  ],
  controllers: [PublicLeadsController],
  providers: [PublicLeadsService],
  exports: [TypeOrmModule, PublicLeadsService],
})
export class PublicLeadsModule {}
