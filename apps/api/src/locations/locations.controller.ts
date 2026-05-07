import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
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
}
