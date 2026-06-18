import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { MonitoringService } from '../monitoring';
import { GeocodeAddressDto } from './dto/geocode-address.dto';
import { GeocodingCache } from './entities';
import {
  buildGeocodeQuery,
  buildNormalizedGeocodeQuery,
  hashGeocodeQuery,
  normalizeGeocodeAddressInput,
} from './geocoding-normalization';
import {
  GeocodingProvider,
  GeocodingResponse,
  GeocodingResult,
} from './geocoding.types';
import { GoogleGeocodingProvider } from './google-geocoding.provider';

const DEFAULT_GEOCODING_TIMEOUT_MS = 3500;
const DEFAULT_GEOCODING_CACHE_TTL_DAYS = 180;
const MAX_GEOCODING_TIMEOUT_MS = 10_000;

@Injectable()
export class GeocodingService {
  constructor(
    @InjectRepository(GeocodingCache)
    private readonly geocodingCacheRepo: Repository<GeocodingCache>,
    private readonly configService: ConfigService,
    private readonly monitoringService: MonitoringService,
  ) {}

  async geocodeAddress(input: GeocodeAddressDto): Promise<GeocodingResponse> {
    const address = normalizeGeocodeAddressInput(input);

    if (!address.city) {
      throw new BadRequestException('Miasto jest wymagane');
    }

    if (!address.street) {
      throw new BadRequestException('Ulica jest wymagana');
    }

    const provider = this.getProvider();
    this.monitoringService.recordSuccess(
      'address_geocoding',
      'request_received',
      {
        provider: provider.name,
        hasDistrict: Boolean(address.district),
        hasPostalCode: Boolean(address.postalCode),
        hasVoivodeship: Boolean(address.voivodeship),
      },
    );

    const query = buildGeocodeQuery(address);
    const normalizedQuery = buildNormalizedGeocodeQuery(address);
    const normalizedQueryHash = hashGeocodeQuery(provider.name, normalizedQuery);
    const cached = await this.geocodingCacheRepo.findOne({
      where: {
        provider: provider.name,
        normalizedQueryHash,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (cached) {
      this.monitoringService.recordSuccess('address_geocoding', 'cache_hit', {
        provider: provider.name,
        hasResult: Boolean(cached.lat && cached.lng),
      });
      return this.toGeocodingResponse(query, provider.name, cached);
    }

    const response = await this.monitoringService.monitor(
      {
        flow: 'address_geocoding',
        failureEvent: 'provider_failed',
        context: { provider: provider.name },
        successEvent: 'provider_succeeded',
        successContext: (result) => ({
          provider: provider.name,
          hasResult: Boolean(result.result),
          precision: result.result?.precision,
          confidence: result.result?.confidence,
        }),
      },
      () => provider.geocode(address),
    );

    if (!response.result) {
      this.monitoringService.recordWarning('address_geocoding', 'no_result', {
        provider: provider.name,
      });
    } else if (response.result.confidence < 0.9) {
      this.monitoringService.recordWarning(
        'address_geocoding',
        'low_confidence_result',
        {
          provider: provider.name,
          precision: response.result.precision,
          confidence: response.result.confidence,
        },
      );
    }

    await this.saveCacheEntry(
      provider.name,
      normalizedQueryHash,
      response,
    );

    return response;
  }

  protected getProvider(): GeocodingProvider {
    const providerName = this.configService
      .get<string>('GEOCODING_PROVIDER', '')
      .trim()
      .toLowerCase();
    const apiKey = this.configService.get<string>('GEOCODING_API_KEY', '').trim();

    if (!providerName || !apiKey) {
      throw new ServiceUnavailableException('Geocoding is not configured');
    }

    if (providerName !== 'google') {
      throw new ServiceUnavailableException('Unsupported geocoding provider');
    }

    return new GoogleGeocodingProvider(apiKey, this.getTimeoutMs());
  }

  private getTimeoutMs(): number {
    const configured = Number(
      this.configService.get<string>('GEOCODING_REQUEST_TIMEOUT_MS', ''),
    );

    if (!Number.isFinite(configured) || configured <= 0) {
      return DEFAULT_GEOCODING_TIMEOUT_MS;
    }

    return Math.min(configured, MAX_GEOCODING_TIMEOUT_MS);
  }

  private getCacheExpiresAt(): Date {
    const configured = Number(
      this.configService.get<string>('GEOCODING_CACHE_TTL_DAYS', ''),
    );
    const ttlDays =
      Number.isFinite(configured) && configured > 0
        ? configured
        : DEFAULT_GEOCODING_CACHE_TTL_DAYS;

    return new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  }

  private async saveCacheEntry(
    provider: string,
    normalizedQueryHash: string,
    response: GeocodingResponse,
  ): Promise<void> {
    const result = response.result;
    const entry = this.geocodingCacheRepo.create({
      provider,
      normalizedQueryHash,
      normalizedQuery: null,
      lat: result?.lat ?? null,
      lng: result?.lng ?? null,
      formattedAddress: result?.formattedAddress ?? null,
      precision: result?.precision ?? null,
      confidence: result?.confidence ?? null,
      warning: response.warning ?? null,
      expiresAt: this.getCacheExpiresAt(),
    });

    await this.geocodingCacheRepo.save(entry);
  }

  private toGeocodingResponse(
    query: string,
    provider: string,
    cached: GeocodingCache,
  ): GeocodingResponse {
    const result = this.toGeocodingResult(provider, cached);

    return {
      query,
      result,
      warning: cached.warning ?? undefined,
    };
  }

  private toGeocodingResult(
    provider: string,
    cached: GeocodingCache,
  ): GeocodingResult | null {
    const lat = Number(cached.lat);
    const lng = Number(cached.lng);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !cached.formattedAddress ||
      !cached.precision
    ) {
      return null;
    }

    return {
      lat,
      lng,
      formattedAddress: cached.formattedAddress,
      precision: cached.precision as GeocodingResult['precision'],
      confidence: Number(cached.confidence ?? 0),
      provider,
    };
  }
}
