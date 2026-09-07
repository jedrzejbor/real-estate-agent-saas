import {
  buildPricingAudienceHref,
  parsePricingAudience,
  PricingAudience,
} from './pricing-audience';

describe('pricing audience URL model', () => {
  it.each([null, undefined, '', 'nieznane', 'prywatnych'])(
    'defaults %s to the private audience',
    (value) => {
      expect(parsePricingAudience(value)).toBe(PricingAudience.PRIVATE);
    },
  );

  it('recognizes the agent audience', () => {
    expect(parsePricingAudience('agentow')).toBe(PricingAudience.AGENT);
  });

  it('preserves unrelated query parameters and puts the homepage hash last', () => {
    const href = buildPricingAudienceHref({
      pathname: '/',
      searchParams: new URLSearchParams('kampania=jesien'),
      audience: PricingAudience.AGENT,
      hash: '#pricing',
    });

    expect(href).toBe('/?kampania=jesien&dla=agentow#pricing');
  });

  it('builds a shareable full-pricing URL', () => {
    expect(
      buildPricingAudienceHref({
        pathname: '/cennik',
        audience: PricingAudience.PRIVATE,
      }),
    ).toBe('/cennik?dla=prywatnych');
  });
});
