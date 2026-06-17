import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeocodingCache, Location } from './entities';
import { GeocodingService } from './geocoding.service';
import { LocationsController } from './locations.controller';
import { LocationsImportService } from './locations-import.service';
import { LocationsService } from './locations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Location, GeocodingCache])],
  controllers: [LocationsController],
  providers: [LocationsService, LocationsImportService, GeocodingService],
  exports: [LocationsService, LocationsImportService, GeocodingService],
})
export class LocationsModule {}
