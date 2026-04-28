import type { DashboardStats } from './dashboard';

export type DashboardOnboardingStepId =
  | 'listing'
  | 'client'
  | 'appointment'
  | 'publish'
  | 'share';

export type DashboardOnboardingStepState =
  | 'completed'
  | 'ready'
  | 'upcoming';

export interface DashboardOnboardingStep {
  id: DashboardOnboardingStepId;
  title: string;
  description: string;
  href?: string;
  ctaLabel: string;
  state: DashboardOnboardingStepState;
  helperText?: string;
}

export interface DashboardOnboardingChecklist {
  steps: DashboardOnboardingStep[];
  completedCount: number;
  totalCount: number;
  completionPercentage: number;
}

export function getDashboardOnboardingChecklist(
  stats: DashboardStats,
): DashboardOnboardingChecklist {
  const steps: DashboardOnboardingStep[] = [
    {
      id: 'listing',
      title: 'Dodaj ofertę',
      description: 'Utwórz pierwszą ofertę, żeby zacząć pracę z CRM i uruchomić podstawowy pipeline.',
      href: stats.listings.total > 0 ? '/dashboard/listings' : '/dashboard/listings/new',
      ctaLabel: stats.listings.total > 0 ? 'Zobacz oferty' : 'Dodaj ofertę',
      state: stats.listings.total > 0 ? 'completed' : 'ready',
      helperText:
        stats.listings.total > 0
          ? `${stats.listings.total} ofert w systemie`
          : 'Pierwszy krok do aktywacji workspace',
    },
    {
      id: 'client',
      title: 'Dodaj klienta',
      description: 'Zapisz pierwszego klienta lub lead, żeby rozpocząć budowę relacji i pipeline’u sprzedażowego.',
      href: stats.clients.total > 0 ? '/dashboard/clients' : '/dashboard/clients/new',
      ctaLabel: stats.clients.total > 0 ? 'Zobacz klientów' : 'Dodaj klienta',
      state: stats.clients.total > 0 ? 'completed' : 'ready',
      helperText:
        stats.clients.total > 0
          ? `${stats.clients.total} klientów w CRM`
          : 'Lead lub klient odblokowuje dalszą pracę z CRM',
    },
    {
      id: 'appointment',
      title: 'Dodaj spotkanie',
      description: 'Zaplanuj pierwsze spotkanie, aby aktywnie korzystać z kalendarza i codziennego workflow.',
      href:
        stats.appointments.total > 0
          ? '/dashboard/calendar'
          : '/dashboard/calendar/new',
      ctaLabel:
        stats.appointments.total > 0
          ? 'Zobacz kalendarz'
          : 'Zaplanuj spotkanie',
      state: stats.appointments.total > 0 ? 'completed' : 'ready',
      helperText:
        stats.appointments.total > 0
          ? `${stats.appointments.total} spotkań zapisanych`
          : 'Spotkanie wzmacnia realne użycie produktu',
    },
    {
      id: 'publish',
      title: 'Opublikuj ofertę',
      description: 'W kolejnym etapie odblokujemy publikację publicznej strony oferty z poziomu CRM.',
      ctaLabel: 'Wkrótce',
      state: 'upcoming',
      helperText: 'Planowane w Sprintach 3–4',
    },
    {
      id: 'share',
      title: 'Udostępnij link',
      description: 'Po wdrożeniu publicznych stron będziesz mógł kopiować i udostępniać link oferty klientom.',
      ctaLabel: 'Wkrótce',
      state: 'upcoming',
      helperText: 'Krok zależny od publicznych ofert',
    },
  ];

  const completedCount = steps.filter((step) => step.state === 'completed').length;

  return {
    steps,
    completedCount,
    totalCount: steps.length,
    completionPercentage: Math.round((completedCount / steps.length) * 100),
  };
}
