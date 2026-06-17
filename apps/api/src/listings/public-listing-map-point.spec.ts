import {
  buildPublicDistrictCentroidKey,
  selectPublicListingMapPoint,
} from './public-listing-map-point';

describe('public listing map point', () => {
  it('builds a normalized city and district key', () => {
    expect(
      buildPublicDistrictCentroidKey(' Bydgoszcz ', 'Dzielnica Fordon'),
    ).toBe('bydgoszcz|fordon');
  });

  it('uses the district centroid before city fallback', () => {
    const point = selectPublicListingMapPoint(
      {
        showExactAddressOnPublicPage: false,
        address: {
          city: 'Bydgoszcz',
          district: 'Fordon',
          voivodeship: 'kujawsko-pomorskie',
        },
      },
      () => ({
        lat: 53.1235,
        lng: 18.0084,
        source: 'city',
        label: 'Bydgoszcz',
      }),
    );

    expect(point).toEqual({
      lat: 53.148,
      lng: 18.17,
      precision: 'approximate',
      source: 'district',
      label: 'Fordon, Bydgoszcz',
    });
  });

  it('falls back to city point when district is missing', () => {
    const point = selectPublicListingMapPoint(
      {
        showExactAddressOnPublicPage: false,
        address: {
          city: 'Bydgoszcz',
          voivodeship: 'kujawsko-pomorskie',
        },
      },
      () => ({
        lat: 53.1235,
        lng: 18.0084,
        source: 'city',
        label: 'Bydgoszcz',
      }),
    );

    expect(point).toEqual({
      lat: 53.1235,
      lng: 18.0084,
      precision: 'approximate',
      source: 'city',
      label: 'Bydgoszcz',
    });
  });

  it('uses exact coordinates only when public exact address is enabled', () => {
    const address = {
      city: 'Bydgoszcz',
      district: 'Fordon',
      lat: 53.151,
      lng: 18.181,
    };

    expect(
      selectPublicListingMapPoint(
        {
          showExactAddressOnPublicPage: true,
          address,
        },
        () => null,
      ),
    ).toEqual({
      lat: 53.151,
      lng: 18.181,
      precision: 'exact',
      source: 'exact',
      label: 'Dokładna lokalizacja',
    });

    expect(
      selectPublicListingMapPoint(
        {
          showExactAddressOnPublicPage: false,
          address,
        },
        () => null,
      ),
    ).toMatchObject({
      precision: 'approximate',
      source: 'district',
    });
  });
});
