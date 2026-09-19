export const PricingAudience = {
  PRIVATE: 'private',
  AGENT: 'agent',
} as const;

export type PricingAudience =
  (typeof PricingAudience)[keyof typeof PricingAudience];

export const PRICING_AUDIENCE_QUERY_VALUES: Record<PricingAudience, string> = {
  private: 'prywatnych',
  agent: 'agentow',
};

export function parsePricingAudience(
  value: string | null | undefined,
): PricingAudience {
  return value === PRICING_AUDIENCE_QUERY_VALUES.agent
    ? PricingAudience.AGENT
    : PricingAudience.PRIVATE;
}

export function buildPricingAudienceHref({
  pathname,
  searchParams,
  audience,
  hash,
}: {
  pathname: string;
  searchParams?: Pick<URLSearchParams, 'toString'>;
  audience: PricingAudience;
  hash?: string;
}): string {
  const params = new URLSearchParams(searchParams?.toString() ?? '');
  params.set('dla', PRICING_AUDIENCE_QUERY_VALUES[audience]);
  const query = params.toString();
  const normalizedHash = hash ? `#${hash.replace(/^#/, '')}` : '';
  return `${pathname}${query ? `?${query}` : ''}${normalizedHash}`;
}
