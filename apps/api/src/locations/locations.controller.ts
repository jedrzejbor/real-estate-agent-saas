import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { GeocodeAddressDto } from './dto/geocode-address.dto';
import { SearchDistrictsQueryDto } from './dto/search-districts-query.dto';
import { SearchLocationsQueryDto } from './dto/search-locations-query.dto';
import { GeocodingService } from './geocoding.service';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(
    private readonly locationsService: LocationsService,
    private readonly geocodingService: GeocodingService,
  ) {}

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

  /** POST /api/locations/geocode-address — authenticated address geocoding. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('geocode-address')
  async geocodeAddress(@Body() body: GeocodeAddressDto) {
    return this.geocodingService.geocodeAddress(body);
  }
}
