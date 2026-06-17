import { ServiceUnavailableException } from '@nestjs/common';
import { mapGoogleGeocodingResponse } from './google-geocoding.provider';

describe('google geocoding provider mapping', () => {
  it('maps rooftop results to high-confidence geocoding response', () => {
    expect(
      mapGoogleGeocodingResponse('Gdańska 10, Bydgoszcz, PL', {
        status: 'OK',
        results: [
          {
            formatted_address: 'Gdańska 10, 85-001 Bydgoszcz, Polska',
            geometry: {
              location: {
                lat: 53.124,
                lng: 18.01,
              },
              location_type: 'ROOFTOP',
            },
          },
        ],
      }),
    ).toEqual({
      query: 'Gdańska 10, Bydgoszcz, PL',
      result: {
        lat: 53.124,
        lng: 18.01,
        formattedAddress: 'Gdańska 10, 85-001 Bydgoszcz, Polska',
        precision: 'rooftop',
        confidence: 0.95,
        provider: 'google',
      },
    });
  });

  it('returns null result for zero results', () => {
    expect(
      mapGoogleGeocodingResponse('Nieznana 1, Bydgoszcz, PL', {
        status: 'ZERO_RESULTS',
        results: [],
      }),
    ).toEqual({
      query: 'Nieznana 1, Bydgoszcz, PL',
      result: null,
      warning: 'Nie znaleziono adresu.',
    });
  });

  it('throws controlled error for provider failures', () => {
    expect(() =>
      mapGoogleGeocodingResponse('Gdańska 10, Bydgoszcz, PL', {
        status: 'REQUEST_DENIED',
        error_message: 'Invalid key',
      }),
    ).toThrow(ServiceUnavailableException);
  });
});
