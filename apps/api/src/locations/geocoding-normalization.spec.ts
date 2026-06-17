import {
  buildGeocodeQuery,
  buildNormalizedGeocodeQuery,
  hashGeocodeQuery,
  normalizeGeocodeAddressInput,
} from './geocoding-normalization';

describe('geocoding normalization', () => {
  it('normalizes address input and defaults country to Poland', () => {
    expect(
      normalizeGeocodeAddressInput({
        city: '  Bydgoszcz ',
        district: ' Śródmieście  ',
        street: '  Gdańska   10 ',
        postalCode: '',
      }),
    ).toEqual({
      city: 'Bydgoszcz',
      district: 'Śródmieście',
      street: 'Gdańska 10',
      postalCode: null,
      voivodeship: null,
      country: 'PL',
    });
  });

  it('builds stable display and cache queries', () => {
    const address = normalizeGeocodeAddressInput({
      city: 'Bydgoszcz',
      district: 'Śródmieście',
      street: 'Gdańska 10',
      voivodeship: 'kujawsko-pomorskie',
    });

    expect(buildGeocodeQuery(address)).toBe(
      'Gdańska 10, Śródmieście, Bydgoszcz, kujawsko-pomorskie, PL',
    );
    expect(buildNormalizedGeocodeQuery(address)).toBe(
      'gdanska 10, srodmiescie, bydgoszcz, kujawsko-pomorskie, pl',
    );
  });

  it('hashes query with provider namespace', () => {
    const hash = hashGeocodeQuery('google', 'gdanska 10, bydgoszcz, pl');

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toBe(
      hashGeocodeQuery('other', 'gdanska 10, bydgoszcz, pl'),
    );
  });
});
