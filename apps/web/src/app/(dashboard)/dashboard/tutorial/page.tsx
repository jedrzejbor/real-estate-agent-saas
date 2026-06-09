'use client';

import { useMemo, useState, type ElementType } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Gauge,
  HelpCircle,
  MessageSquareText,
  Search,
  Settings,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type TutorialSectionId =
  | 'start'
  | 'navigation'
  | 'listings'
  | 'clients'
  | 'calendar'
  | 'reports'
  | 'support';

interface TutorialStep {
  title: string;
  description: string;
  href?: string;
  ctaLabel?: string;
}

interface TutorialSection {
  id: TutorialSectionId;
  label: string;
  description: string;
  icon: ElementType;
  badge?: string;
  steps: TutorialStep[];
}

const tutorialSections: TutorialSection[] = [
  {
    id: 'start',
    label: 'Start pracy',
    description: 'Pierwsza ścieżka od pustego workspace do realnej pracy.',
    icon: Gauge,
    badge: 'Najpierw',
    steps: [
      {
        title: 'Zacznij od Dashboardu',
        description:
          'Dashboard pokazuje najważniejsze liczby, onboarding, aktywność, pipeline, limity planu i ankiety produktowe w zakładkach.',
        href: '/dashboard',
        ctaLabel: 'Otwórz dashboard',
      },
      {
        title: 'Uzupełniaj system małymi krokami',
        description:
          'Najpierw dodaj ofertę, potem klienta, a następnie spotkanie. Te trzy działania odblokowują podstawowy rytm pracy w CRM.',
      },
      {
        title: 'Wracaj do checklisty',
        description:
          'Zakładka Start na dashboardzie przypomina, co warto zrobić dalej i prowadzi do odpowiednich ekranów.',
      },
    ],
  },
  {
    id: 'navigation',
    label: 'Poruszanie się',
    description: 'Gdzie czego szukać w panelu i jak szybko wracać do pracy.',
    icon: Search,
    steps: [
      {
        title: 'Sidebar to główna mapa systemu',
        description:
          'Po lewej stronie masz moduły: oferty, klienci, zapytania, kalendarz, raporty, samouczek i feedback.',
      },
      {
        title: 'Topbar służy do szybkiego wyszukiwania',
        description:
          'Pole wyszukiwania u góry pomaga szybko odnaleźć oferty, klientów i spotkania bez ręcznego przechodzenia przez moduły.',
      },
      {
        title: 'Ustawienia i limity są na dole sidebara',
        description:
          'W Ustawieniach sprawdzisz profil, aktualny plan, wykorzystanie limitów oraz dostępne funkcje pakietu.',
        href: '/dashboard/settings',
        ctaLabel: 'Otwórz ustawienia',
      },
    ],
  },
  {
    id: 'listings',
    label: 'Oferty',
    description: 'Dodawanie, edycja, publikacja i obsługa ofert.',
    icon: Building2,
    steps: [
      {
        title: 'Dodaj pierwszą ofertę',
        description:
          'Uzupełnij typ transakcji, typ nieruchomości, lokalizację, cenę, parametry i zdjęcia. Formularz prowadzi przez wymagane dane.',
        href: '/dashboard/listings/new',
        ctaLabel: 'Dodaj ofertę',
      },
      {
        title: 'Zarządzaj statusem oferty',
        description:
          'Na liście ofert i w szczegółach możesz pracować ze szkicem, aktywną ofertą, rezerwacją, sprzedażą albo archiwum.',
        href: '/dashboard/listings',
        ctaLabel: 'Lista ofert',
      },
      {
        title: 'Publikuj ofertę, gdy jest gotowa',
        description:
          'Panel publikacji w szczegółach oferty pokaże, czy publiczna karta może być widoczna dla klientów.',
      },
    ],
  },
  {
    id: 'clients',
    label: 'Klienci',
    description: 'CRM, preferencje, notatki i pipeline kontaktów.',
    icon: Users,
    steps: [
      {
        title: 'Dodaj klienta albo lead',
        description:
          'Zapisz dane kontaktowe, źródło pozyskania i status. Dzięki temu klient zacznie być widoczny w pipeline.',
        href: '/dashboard/clients/new',
        ctaLabel: 'Dodaj klienta',
      },
      {
        title: 'Uzupełnij preferencje',
        description:
          'Budżet, typ nieruchomości, miasto i liczba pokoi pomagają łączyć klienta z właściwymi ofertami.',
      },
      {
        title: 'Prowadź historię kontaktu',
        description:
          'Notatki i zmiany statusu pomagają wrócić do kontekstu rozmowy bez szukania informacji poza systemem.',
        href: '/dashboard/clients',
        ctaLabel: 'Lista klientów',
      },
    ],
  },
  {
    id: 'calendar',
    label: 'Kalendarz',
    description: 'Spotkania, prezentacje i rytm codziennej pracy.',
    icon: CalendarCheck,
    steps: [
      {
        title: 'Zaplanuj spotkanie',
        description:
          'Dodaj termin, typ spotkania, status, lokalizację i opcjonalnie powiąż je z klientem lub ofertą.',
        href: '/dashboard/calendar/new',
        ctaLabel: 'Zaplanuj spotkanie',
      },
      {
        title: 'Korzystaj z widoku kalendarza',
        description:
          'Widok kalendarza pomaga zobaczyć obciążenie tygodnia i szybko przejść do szczegółów spotkania.',
        href: '/dashboard/calendar',
        ctaLabel: 'Otwórz kalendarz',
      },
      {
        title: 'Aktualizuj status',
        description:
          'Po spotkaniu oznacz je jako zakończone albo anulowane, żeby raporty i dashboard pokazywały realny obraz pracy.',
      },
    ],
  },
  {
    id: 'reports',
    label: 'Raporty',
    description: 'Analiza ofert, klientów, spotkań, bloga i wzrostu produktu.',
    icon: BarChart3,
    steps: [
      {
        title: 'Zacznij od Przeglądu',
        description:
          'Raporty mają zakładki. Przegląd pokazuje najważniejsze KPI, a kolejne zakładki rozbijają dane na moduły.',
        href: '/dashboard/reports',
        ctaLabel: 'Otwórz raporty',
      },
      {
        title: 'Ustaw zakres dat',
        description:
          'Filtry raportów pozwalają zawęzić dane do konkretnego okresu, typu nieruchomości, transakcji albo agenta.',
      },
      {
        title: 'Czytaj raporty jako decyzje',
        description:
          'Raporty nie są tylko liczbami. Szukaj sygnałów: które oferty pracują, gdzie klienci odpadają i co wymaga reakcji.',
      },
    ],
  },
  {
    id: 'support',
    label: 'Pomoc i feedback',
    description: 'Gdzie zgłaszać problemy i wpływać na rozwój systemu.',
    icon: HelpCircle,
    steps: [
      {
        title: 'Zgłoś problem albo pomysł',
        description:
          'Moje zgłoszenia służą do przekazywania błędów, usprawnień i potrzeb z codziennej pracy.',
        href: '/dashboard/feedback',
        ctaLabel: 'Moje zgłoszenia',
      },
      {
        title: 'Wypełniaj ankiety produktowe',
        description:
          'Ankiety pomagają ustalić priorytety rozwoju i dopasować system do realnego sposobu pracy agentów.',
        href: '/dashboard/feedback/surveys',
        ctaLabel: 'Ankiety',
      },
      {
        title: 'Głosuj na pomysły',
        description:
          'W zakładce Głosowanie możesz poprzeć funkcje, które są dla Ciebie najważniejsze.',
        href: '/dashboard/feedback/ideas',
        ctaLabel: 'Głosowanie',
      },
    ],
  },
];

const quickLinks = [
  {
    label: 'Dodaj ofertę',
    href: '/dashboard/listings/new',
    icon: Building2,
  },
  {
    label: 'Dodaj klienta',
    href: '/dashboard/clients/new',
    icon: Users,
  },
  {
    label: 'Zaplanuj spotkanie',
    href: '/dashboard/calendar/new',
    icon: CalendarCheck,
  },
  {
    label: 'Ustawienia',
    href: '/dashboard/settings',
    icon: Settings,
  },
] as const;

export default function DashboardTutorialPage() {
  const [activeSectionId, setActiveSectionId] =
    useState<TutorialSectionId>('start');

  const activeSection = useMemo(
    () =>
      tutorialSections.find((section) => section.id === activeSectionId) ??
      tutorialSections[0],
    [activeSectionId],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Samouczek
            </h1>
            <Badge variant="brand">Przewodnik systemu</Badge>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Krótki przewodnik po EstateFlow: co gdzie jest, jak zacząć pracę i
            do których ekranów przejść, gdy chcesz wykonać konkretną akcję.
          </p>
        </div>

        <Button className="w-fit rounded-xl" render={<Link href="/dashboard" />}>
          Wróć do dashboardu
          <ArrowRight className="h-4 w-4" />
        </Button>
      </header>

      <section className="grid gap-4 lg:grid-cols-4">
        {quickLinks.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-foreground">
                {item.label}
              </span>
            </Link>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="border-b border-border bg-muted/20 p-2">
          <div
            className="grid gap-2 md:grid-cols-2 xl:grid-cols-7"
            role="tablist"
            aria-label="Sekcje samouczka"
          >
            {tutorialSections.map((section) => {
              const Icon = section.icon;
              const isActive = section.id === activeSection.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveSectionId(section.id)}
                  className={cn(
                    'min-h-20 rounded-xl border px-3 py-3 text-left transition-colors',
                    isActive
                      ? 'border-primary bg-white text-foreground shadow-sm'
                      : 'border-transparent bg-transparent text-muted-foreground hover:bg-white/70 hover:text-foreground',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">
                        {section.label}
                      </span>
                    </div>
                    {section.badge ? (
                      <Badge variant="secondary" className="rounded-full">
                        {section.badge}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs leading-5">
                    {section.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Aktywna lekcja
          </p>
          <h2 className="mt-1 font-heading text-xl font-semibold text-foreground">
            {activeSection.label}
          </h2>
        </div>

        <div className="grid gap-5 bg-[#FAFAF9] p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            {activeSection.steps.map((step, index) => (
              <article
                key={step.title}
                className="rounded-2xl border border-border bg-white p-5 shadow-sm"
              >
                <div className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading text-lg font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {step.description}
                    </p>
                    {step.href && step.ctaLabel ? (
                      <Button
                        className="mt-4 rounded-xl"
                        variant="outline"
                        render={<Link href={step.href} />}
                      >
                        {step.ctaLabel}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <BookOpenCheck className="h-5 w-5 text-primary" />
                <h3 className="font-heading text-base font-semibold text-foreground">
                  Jak korzystać z samouczka?
                </h3>
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                  Wybierz zakładkę z obszarem, którego chcesz się nauczyć.
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                  Czytaj kroki po kolei i klikaj przyciski prowadzące do
                  właściwych ekranów.
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                  Po wykonaniu akcji wróć tutaj albo do checklisty na
                  dashboardzie.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                <h3 className="font-heading text-base font-semibold text-foreground">
                  Najważniejsza ścieżka
                </h3>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  'Dodaj ofertę',
                  'Dodaj klienta',
                  'Zaplanuj spotkanie',
                  'Sprawdź raporty',
                ].map((label, index) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-xl bg-muted/30 px-3 py-2"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-primary ring-1 ring-border">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
