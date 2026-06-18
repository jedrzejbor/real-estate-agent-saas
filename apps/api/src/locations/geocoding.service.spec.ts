import { ConfigService } from '@nestjs/config';
import { GeocodingCache } from './entities';
import { GeocodingService } from './geocoding.service';
import { GeocodingProvider, GeocodingResponse } from './geocoding.types';

class TestGeocodingService extends GeocodingService {
  constructor(
    cacheRepo: ConstructorParameters<typeof GeocodingService>[0],
    configService: ConfigService,
    monitoringService: ConstructorParameters<typeof GeocodingService>[2],
    private readonly provider: GeocodingProvider,
  ) {
    super(cacheRepo, configService, monitoringService);
  }

  protected override getProvider(): GeocodingProvider {
    return this.provider;
  }
}

function buildCacheRepo() {
  return {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'cache-1', ...value })),
  };
}

function buildMonitoringService() {
  return {
    recordSuccess: jest.fn(),
    recordWarning: jest.fn(),
    monitor: jest.fn(
      async <TResult>(
        _options: unknown,
        action: () => Promise<TResult>,
      ): Promise<TResult> => action(),
    ),
  };
}

describe('GeocodingService', () => {
  it('geocodes through provider and caches without storing the full address query', async () => {
    const cacheRepo = buildCacheRepo();
    const monitoringService = buildMonitoringService();
    const providerResponse: GeocodingResponse = {
      query: 'Gdańska 10, Bydgoszcz, PL',
      result: {
        lat: 53.1234567,
        lng: 18.1234567,
        formattedAddress: 'Gdańska 10, Bydgoszcz',
        precision: 'rooftop',
        confidence: 0.95,
        provider: 'mock',
      },
    };
    const provider: GeocodingProvider = {
      name: 'mock',
      geocode: jest.fn(async () => providerResponse),
    };
    const service = new TestGeocodingService(
      cacheRepo as never,
      { get: jest.fn() } as never,
      monitoringService as never,
      provider,
    );

    await expect(
      service.geocodeAddress({
        city: 'Bydgoszcz',
        district: 'Śródmieście',
        street: 'Gdańska 10',
        country: 'PL',
      }),
    ).resolves.toEqual(providerResponse);

    expect(provider.geocode).toHaveBeenCalledTimes(1);
    expect(cacheRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'mock',
        normalizedQueryHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        normalizedQuery: null,
        lat: 53.1234567,
        lng: 18.1234567,
      }),
    );
    expect(monitoringService.recordSuccess).toHaveBeenCalledWith(
      'address_geocoding',
      'request_received',
      expect.objectContaining({
        provider: 'mock',
        hasDistrict: true,
      }),
    );
  });

  it('returns fresh cache hit without calling provider', async () => {
    const cacheRepo = buildCacheRepo();
    cacheRepo.findOne.mockResolvedValue({
      provider: 'mock',
      lat: '53.1234567',
      lng: '18.1234567',
      formattedAddress: 'Gdańska 10, Bydgoszcz',
      precision: 'rooftop',
      confidence: '0.950',
      warning: null,
    } as unknown as GeocodingCache);
    const monitoringService = buildMonitoringService();
    const provider: GeocodingProvider = {
      name: 'mock',
      geocode: jest.fn(),
    };
    const service = new TestGeocodingService(
      cacheRepo as never,
      { get: jest.fn() } as never,
      monitoringService as never,
      provider,
    );

    await expect(
      service.geocodeAddress({
        city: 'Bydgoszcz',
        street: 'Gdańska 10',
        country: 'PL',
      }),
    ).resolves.toEqual({
      query: 'Gdańska 10, Bydgoszcz, PL',
      result: {
        lat: 53.1234567,
        lng: 18.1234567,
        formattedAddress: 'Gdańska 10, Bydgoszcz',
        precision: 'rooftop',
        confidence: 0.95,
        provider: 'mock',
      },
    });

    expect(provider.geocode).not.toHaveBeenCalled();
    expect(monitoringService.recordSuccess).toHaveBeenCalledWith(
      'address_geocoding',
      'cache_hit',
      expect.objectContaining({
        provider: 'mock',
        hasResult: true,
      }),
    );
  });
});
