import type { AuthUser } from './auth';

type UsageMetricKey = 'activeListings' | 'clients' | 'monthlyAppointments' | 'users';
type FeatureKey = keyof AuthUser['entitlements']['features'];

interface UsageMetricConfig {
  key: UsageMetricKey;
  label: string;
  helper: string;
  description: string;
}

interface FeatureConfig {
  key: FeatureKey;
  label: string;
  description: string;
}

export interface PlanUsageMetric extends UsageMetricConfig {
  usage: number;
  limit: number | null;
}

export interface PlanFeatureItem extends FeatureConfig {
  enabled: boolean;
}

const usageMetricConfig: UsageMetricConfig[] = [
  {
    key: 'activeListings',
    label: 'Oferty',
    helper: 'w limicie planu',
    description: 'Aktywne oferty publikowane i obsługiwane w CRM.',
  },
  {
    key: 'clients',
    label: 'Klienci',
    helper: 'łącznie',
    description: 'Wszystkie kontakty przechowywane w bazie klientów.',
  },
  {
    key: 'monthlyAppointments',
    label: 'Spotkania',
    helper: 'w tym miesiącu',
    description: 'Nowe spotkania tworzone w bieżącym miesiącu kalendarzowym.',
  },
  {
    key: 'users',
    label: 'Użytkownicy',
    helper: 'w workspace',
    description: 'Liczba osób, które mogą pracować w tym samym workspace.',
  },
];

const featureConfig: FeatureConfig[] = [
  {
    key: 'reportsOverview',
    label: 'Dashboard i overview',
    description: 'Podstawowy przegląd aktywności i KPI na starcie pracy.',
  },
  {
    key: 'reportsListingsBasic',
    label: 'Raport ofert',
    description: 'Podstawowa analiza aktywności i skuteczności ofert.',
  },
  {
    key: 'reportsClientsBasic',
    label: 'Raport klientów',
    description: 'Podstawowy wgląd w napływ i konwersję klientów.',
  },
  {
    key: 'reportsAppointmentsBasic',
    label: 'Raport spotkań',
    description: 'Raportowanie spotkań i obłożenia kalendarza.',
  },
  {
    key: 'publicListings',
    label: 'Publiczne strony ofert',
    description: 'Publikacja ofert z gotową stroną publiczną i linkiem do udostępnienia.',
  },
  {
    key: 'publicLeadForms',
    label: 'Formularze leadowe',
    description: 'Zbieranie leadów bezpośrednio z publicznych stron ofert.',
  },
  {
    key: 'customBranding',
    label: 'Własny branding',
    description: 'Usunięcie brandingu EstateFlow i pełniejsze dopasowanie do marki biura.',
  },
  {
    key: 'multiUser',
    label: 'Praca zespołowa',
    description: 'Dodawanie kolejnych użytkowników i współpraca w workspace.',
  },
];

export function getPlanUsageMetrics(user: AuthUser): PlanUsageMetric[] {
  return usageMetricConfig.map((item) => ({
    ...item,
    usage: user.usage[item.key],
    limit: user.entitlements.limits[item.key],
  }));
}

export function getPlanFeatureItems(user: AuthUser): PlanFeatureItem[] {
  return featureConfig.map((item) => ({
    ...item,
    enabled: user.entitlements.features[item.key],
  }));
}

export function getRemainingLimit(
  usage: number,
  limit: number | null | undefined,
): number | null {
  if (limit === null || limit === undefined) {
    return null;
  }

  return Math.max(limit - usage, 0);
}
