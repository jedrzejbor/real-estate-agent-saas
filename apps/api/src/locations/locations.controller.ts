import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { SearchDistrictsQueryDto } from './dto/search-districts-query.dto';
import { SearchLocationsQueryDto } from './dto/search-locations-query.dto';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  /** GET /api/locations — public Polish locality autocomplete. */
  @Public()
  @Get()
  async search(@Query() query: SearchLocationsQueryDto) {
    return {
      data: await this.locationsService.search(query),
    };
  }

  /** GET /api/locations/districts — public district autocomplete by city. */
  @Public()
  @Get('districts')
  async searchDistricts(@Query() query: SearchDistrictsQueryDto) {
    return {
      data: await this.locationsService.searchDistricts(query),
    };
  }
}
