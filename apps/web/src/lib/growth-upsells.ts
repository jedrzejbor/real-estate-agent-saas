export type GrowthUpsellId =
  | 'custom-branding'
  | 'profile-pro'
  | 'embed-customization'
  | 'growth-automation'
  | 'higher-limits';

export interface GrowthUpsell {
  id: GrowthUpsellId;
  title: string;
  description: string;
  benefit: string;
  ctaLabel: string;
  recommendedPlan: UpgradePlanCode;
}

export type UpgradePlanCode = 'starter' | 'professional' | 'enterprise';

export const GROWTH_UPSELLS: Record<GrowthUpsellId, GrowthUpsell> = {
  'custom-branding': {
    id: 'custom-branding',
    title: 'Własny branding publicznych stron',
    description:
      'Ukryj branding EstateFlow i pokaż markę swojego biura na ofertach, profilach, QR i widgetach.',
    benefit: 'Lepsze zaufanie przy udostępnianiu ofert klientom.',
    ctaLabel: 'Odblokuj branding',
    recommendedPlan: 'professional',
  },
  'profile-pro': {
    id: 'profile-pro',
    title: 'Rozbudowane profile agentów i biur',
    description:
      'Dodaj publiczne slugi, wyróżnione sekcje, zespół, specjalizacje i mocniejsze SEO profilu.',
    benefit: 'Więcej wejść z publicznego profilu i lepsza prezentacja biura.',
    ctaLabel: 'Rozbuduj profil',
    recommendedPlan: 'professional',
  },
  'embed-customization': {
    id: 'embed-customization',
    title: 'Personalizowane widgety lead form',
    description:
      'Dostosuj kolor, wysokość, branding i wariant osadzenia formularza do własnej strony.',
    benefit: 'Spójniejszy formularz na landing page i stronie biura.',
    ctaLabel: 'Dostosuj widget',
    recommendedPlan: 'starter',
  },
  'growth-automation': {
    id: 'growth-automation',
    title: 'Automatyzacje po leadzie',
    description:
      'Wysyłaj autorespondery, przypomnienia follow-up i zadania po zapytaniu z publicznej oferty.',
    benefit: 'Szybsza reakcja na lead bez ręcznego pilnowania inboxa.',
    ctaLabel: 'Dodaj automatyzacje',
    recommendedPlan: 'professional',
  },
  'higher-limits': {
    id: 'higher-limits',
    title: 'Większe limity ofert, klientów i zdjęć',
    description:
      'Zwiększ limity aktywnych ofert, bazy klientów, spotkań i zdjęć na publicznych stronach.',
    benefit: 'Skalowanie pracy bez blokowania nowych rekordów.',
    ctaLabel: 'Zwiększ limity',
    recommendedPlan: 'starter',
  },
};

export const PUBLICATION_GROWTH_UPSELL_IDS: GrowthUpsellId[] = [
  'custom-branding',
  'embed-customization',
  'growth-automation',
];

export const SETTINGS_GROWTH_UPSELL_IDS: GrowthUpsellId[] = [
  'higher-limits',
  'custom-branding',
  'profile-pro',
  'embed-customization',
  'growth-automation',
];

export function getGrowthUpsells(ids: GrowthUpsellId[]): GrowthUpsell[] {
  return ids.map((id) => GROWTH_UPSELLS[id]);
}

export function getUpgradeHref({
  source,
  upsellId,
  plan,
  resource,
}: {
  source: string;
  upsellId?: GrowthUpsellId;
  plan?: UpgradePlanCode;
  resource?: 'listings' | 'clients' | 'appointments' | 'images';
}): string {
  const params = new URLSearchParams({ source });

  if (upsellId) {
    params.set('upsellId', upsellId);
    params.set('plan', plan ?? GROWTH_UPSELLS[upsellId].recommendedPlan);
  } else if (plan) {
    params.set('plan', plan);
  }

  if (resource) {
    params.set('resource', resource);
  }

  return `/dashboard/upgrade?${params.toString()}`;
}
