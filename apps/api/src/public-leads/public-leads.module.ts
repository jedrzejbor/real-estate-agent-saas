import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../listings/entities/listing.entity';
import { Agent } from '../users/entities';
import { PublicLead } from './entities/public-lead.entity';
import { PublicLeadsController } from './public-leads.controller';
import { PublicLeadsService } from './public-leads.service';

@Module({
  imports: [TypeOrmModule.forFeature([PublicLead, Listing, Agent])],
  controllers: [PublicLeadsController],
  providers: [PublicLeadsService],
  exports: [TypeOrmModule, PublicLeadsService],
})
export class PublicLeadsModule {}
