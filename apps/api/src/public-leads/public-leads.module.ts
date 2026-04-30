import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicLead } from './entities/public-lead.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PublicLead])],
  exports: [TypeOrmModule],
})
export class PublicLeadsModule {}
