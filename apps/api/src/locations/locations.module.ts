import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Location } from './entities';
import { LocationsController } from './locations.controller';
import { LocationsImportService } from './locations-import.service';
import { LocationsService } from './locations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Location])],
  controllers: [LocationsController],
  providers: [LocationsService, LocationsImportService],
  exports: [LocationsService, LocationsImportService],
})
export class LocationsModule {}
