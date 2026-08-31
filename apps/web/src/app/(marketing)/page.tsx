import Link from 'next/link';
import Image from 'next/image';
import {
  Building2,
  TrendingUp,
  Users,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Globe,
  Mail,
  Shield,
  ArrowRight,
  ListFilter,
  Map as MapIcon,
  PlusCircle,
  Search,
} from 'lucide-react';
import { Container, Section, SectionHeader } from '@/components/layout';
import {
  FeatureCard,
  HomeHeroActions,
  HomePricingSection,
  HowItWorksStep,
} from '@/components/marketing';
import { HeroPhotoGrid } from '@/components/marketing/hero-photo-grid';
import type { HeroImage } from '@/components/marketing/hero-photo-grid';
import { APP_NAME } from '@/lib/brand';

/* ──────────────────────────── Data ──────────────────────────── */

const heroImages: HeroImage[] = [
  { src: '/images/hero/house-1.jpg', alt: 'Nowoczesna willa z basenem' },
  { src: '/images/hero/interior-1.jpg', alt: 'Eleganckie wnętrze salonu' },
  { src: '/images/hero/house-2.jpg', alt: 'Luksusowy dom jednorodzinny' },
  { src: '/images/hero/house-3.jpg', alt: 'Rezydencja z ogrodem' },
  { src: '/images/hero/interior-2.jpg', alt: 'Nowoczesna kuchnia' },
];

const features = [
  {
    icon: Building2,
    title: 'Zarządzanie ofertami',
    description:
      'Dodawaj, edytuj i porządkuj oferty w jednym miejscu. Kontroluj status, zdjęcia i gotowość publikacji.',
  },
  {
    icon: Users,
    title: 'CRM i baza klientów',
    description:
      'Zapisuj kontakty, preferencje i historię rozmów, żeby łatwiej wracać do właściwych klientów.',
  },
  {
    icon: CalendarCheck,
    title: 'Kalendarz spotkań',
    description:
      'Planuj prezentacje, zadania i kolejne kroki bez przełączania się między narzędziami.',
  },
  {
    icon: TrendingUp,
    title: 'Raporty i analityka',
    description:
      'Sprawdzaj, które oferty i działania przynoszą efekty. Szybciej oceniaj, co warto poprawić.',
  },
  {
    icon: Globe,
    title: 'Strona publiczna',
    description:
      'Pokaż swoje oferty online i prowadź zainteresowanych prosto do kontaktu.',
  },
  {
    icon: Shield,
    title: 'Bezpieczeństwo i RODO',
    description:
      'Porządkuj dane klientów, ofert i działań zespołu z myślą o bezpiecznej pracy.',
  },
];

const steps = [
  {
    title: 'Wybierz swoją ścieżkę',
    description:
      'Szukasz nieruchomości, dodajesz własną ofertę albo pracujesz jako agent? Zacznij od właściwego miejsca.',
  },
  {
    title: 'Przejdź przez prosty proces',
    description:
      'Przeglądaj katalog, uzupełnij formularz oferty albo uporządkuj dane w panelu agenta.',
  },
  {
    title: 'Kontynuuj bez chaosu',
    description:
      'Wracaj do kontaktów, spotkań i kolejnych działań bez szukania informacji w kilku miejscach.',
  },
];

const catalogHighlights = [
  {
    icon: Search,
    title: 'Szybkie wyszukiwanie',
    description: 'Filtry po mieście, cenie, typie nieruchomości i metrażu.',
  },
  {
    icon: MapIcon,
    title: 'Widok mapy',
    description: 'Oferty z lokalizacją pokazują się na mapie i liście wyników.',
  },
  {
    icon: ListFilter,
    title: 'Publiczne wyniki',
    description: 'Katalog działa bez logowania i prowadzi prosto do kontaktu.',
  },
] as const;

const audiencePaths = [
  {
    icon: Search,
    eyebrow: 'Dla kupujących',
    title: 'Szukam nieruchomości',
    description:
      'Przeglądaj oferty w katalogu i sprawdzaj lokalizację na mapie.',
    href: '/oferty',
    cta: 'Przejdź do ofert',
  },
  {
    icon: PlusCircle,
    eyebrow: 'Dla właścicieli',
    title: 'Chcę dodać ofertę',
    description:
      'Dodaj mieszkanie, dom albo działkę bez zakładania konta agenta.',
    href: '/dodaj-oferte',
    cta: 'Dodaj ofertę',
  },
  {
    icon: Users,
    eyebrow: 'Dla agentów i biur',
    title: 'Prowadzę sprzedaż',
    description:
      'Zarządzaj ofertami, klientami i kolejnymi krokami transakcji w CRM.',
    href: '/register',
    cta: 'Otwórz konto',
  },
] as const;

const ownerSellerSteps = [
  {
    icon: ClipboardCheck,
    title: 'Uzupełnij ofertę',
    description:
      'Dodaj podstawowe informacje, lokalizację, cenę, parametry i zdjęcia nieruchomości.',
  },
  {
    icon: Mail,
    title: 'Potwierdź kontakt',
    description:
      'Wyślemy wiadomość na podany email, żeby potwierdzić zgłoszenie i ograniczyć spam.',
  },
  {
    icon: CheckCircle2,
    title: 'Pokaż ją kupującym',
    description:
      'Po weryfikacji oferta może pojawić się w katalogu, na mapie i w wynikach wyszukiwania.',
  },
] as const;

const workBenefits = [
  {
    icon: Building2,
    title: 'Mniej chaosu w ofertach',
    description:
      'Widzisz, które oferty są gotowe do publikacji, wymagają uzupełnienia albo kolejnego działania.',
  },
  {
    icon: Users,
    title: 'Lepszy kontakt z klientem',
    description:
      'Masz pod ręką dane, potrzeby i historię rozmów, więc łatwiej wrócić z właściwą propozycją.',
  },
  {
    icon: CheckCircle2,
    title: 'Jasny kolejny krok',
    description:
      'Od dodania oferty po spotkanie i kontakt z kupującym każdy etap ma swoje miejsce.',
  },
] as const;

/* ──────────────────────────── Page ──────────────────────────── */

export default function Home() {
  return (
    <>
      {/* ─── Hero ─── */}
      <Section variant="gradient" className="pt-12 pb-16 lg:pt-20 lg:pb-24">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Left — copy */}
            <div>
              <h1 className="font-heading text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl xl:text-6xl">
                Znajdź ofertę.
                <br />
                Dodaj nieruchomość.
                <br />
                <span className="text-primary">Prowadź sprzedaż.</span>
              </h1>

              <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground lg:text-lg">
                {APP_NAME} łączy publiczny katalog, prosty formularz dodawania
                ofert i CRM dla agentów oraz biur nieruchomości.
              </p>

              <HomeHeroActions />
            </div>

            {/* Right — photo grid */}
            <div className="mx-auto w-full max-w-md lg:max-w-none">
              <HeroPhotoGrid images={heroImages} />
            </div>
          </div>
        </Container>
      </Section>

      {/* ─── Audience Paths ─── */}
      <Section className="border-b border-border bg-background py-8 lg:py-10">
        <Container>
          <div className="grid gap-4 md:grid-cols-3">
            {audiencePaths.map((path) => {
              const Icon = path.icon;

              return (
                <Link
                  key={path.title}
                  href={path.href}
                  className="group flex min-h-[188px] flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/60 hover:bg-primary/5 hover:shadow-[0_16px_32px_-24px_rgba(28,25,23,0.45)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-emerald-light text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {path.eyebrow}
                    </p>
                    <h2 className="mt-2 font-heading text-xl font-semibold leading-tight text-foreground">
                      {path.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {path.description}
                    </p>
                  </div>
                  <span className="mt-auto pt-4 text-sm font-semibold text-primary">
                    {path.cta}
                  </span>
                </Link>
              );
            })}
          </div>
        </Container>
      </Section>

      {/* ─── Public Catalog ─── */}
      <Section id="public-catalog" className="bg-card">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                Publiczny katalog ofert
              </p>
              <h2 className="mt-3 max-w-xl font-heading text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                Przeglądaj oferty na liście i mapie
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
                {APP_NAME} ma publiczną wyszukiwarkę nieruchomości dla osób,
                które chcą szybko znaleźć mieszkanie, dom albo działkę. Oferty z
                poprawną lokalizacją trafiają do katalogu i na mapę.
              </p>

              <div className="mt-7 grid gap-4">
                {catalogHighlights.map((item) => (
                  <div key={item.title} className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-emerald-light">
                      <item.icon className="h-5 w-5 text-primary" />
                    </span>
                    <span>
                      <span className="block font-heading text-base font-semibold text-foreground">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/oferty"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                >
                  Otwórz katalog ofert
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/dodaj-oferte"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <PlusCircle className="h-4 w-4" />
                  Dodaj swoją ofertę
                </Link>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border bg-background shadow-[0_18px_45px_-28px_rgba(28,25,23,0.45)]">
              <div className="relative aspect-[16/10] min-h-[300px]">
                <Image
                  src="/images/hero/house-2.jpg"
                  alt="Dom prezentowany w publicznym katalogu ofert"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 620px"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
                <div className="absolute left-4 top-4 rounded-full bg-card/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm sm:left-6 sm:top-6">
                  Katalog publiczny
                </div>
                <div className="absolute bottom-4 left-4 right-4 grid gap-3 sm:bottom-6 sm:left-6 sm:right-auto sm:w-[360px]">
                  <div className="rounded-xl bg-card/95 p-4 shadow-lg backdrop-blur">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                          Dom na sprzedaż
                        </p>
                        <p className="mt-1 font-heading text-lg font-semibold text-foreground">
                          Spokojna okolica, ogród i mapa
                        </p>
                      </div>
                      <span className="rounded-full bg-brand-emerald-light px-2.5 py-1 text-xs font-semibold text-primary">
                        Nowe
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <span className="rounded-lg bg-muted px-2.5 py-2">
                        Łabiszyn
                      </span>
                      <span className="rounded-lg bg-muted px-2.5 py-2">
                        124 m²
                      </span>
                      <span className="rounded-lg bg-muted px-2.5 py-2">
                        Mapa
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-card/95 p-3 text-sm font-semibold text-foreground shadow-md backdrop-blur">
                      Lista wyników
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        Filtry i sortowanie
                      </span>
                    </div>
                    <div className="rounded-xl bg-card/95 p-3 text-sm font-semibold text-foreground shadow-md backdrop-blur">
                      Widok mapy
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        Punkty ofert
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* ─── Private Owners ─── */}
      <Section
        id="private-owners"
        variant="muted"
        className="overflow-hidden py-12 sm:py-16 lg:py-24"
      >
        <Container>
          <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div className="order-2 lg:order-1">
              <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-[0_18px_45px_-30px_rgba(28,25,23,0.45)] lg:max-w-none">
                <div className="relative aspect-[4/3] min-h-[292px] sm:min-h-[320px]">
                  <Image
                    src="/images/hero/interior-1.jpg"
                    alt="Właściciel przygotowuje mieszkanie do sprzedaży"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 560px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute left-3 right-3 top-3 flex flex-wrap gap-1.5 sm:left-6 sm:right-6 sm:top-6 sm:gap-2">
                    <span className="rounded-full bg-card/95 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm sm:px-3 sm:py-1.5 sm:text-xs">
                      Bez konta na start
                    </span>
                    <span className="rounded-full bg-brand-emerald-light px-2.5 py-1 text-[11px] font-semibold text-primary shadow-sm sm:px-3 sm:py-1.5 sm:text-xs">
                      Katalog i mapa
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 sm:bottom-6 sm:left-6 sm:right-6">
                    <div className="max-w-md rounded-xl bg-card/95 p-3 shadow-lg backdrop-blur sm:p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        Dla właściciela
                      </p>
                      <p className="mt-1 font-heading text-lg font-semibold leading-tight text-foreground sm:text-xl">
                        Sprzedajesz mieszkanie, dom albo działkę?
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Dodaj ogłoszenie w kilka minut i pokaż je osobom, które
                        szukają nieruchomości w Twojej lokalizacji.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                Dla właścicieli nieruchomości
              </p>
              <h2 className="mt-3 max-w-xl font-heading text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                Dodaj ofertę bez zakładania konta agenta
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
                Wystarczy krótki formularz. Podajesz dane nieruchomości,
                potwierdzasz kontakt i czekasz na weryfikację. Gdy oferta
                spełnia zasady publikacji, może trafić do publicznego katalogu.
              </p>

              <div className="mt-7 grid gap-4">
                {ownerSellerSteps.map((step, index) => (
                  <div key={step.title} className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-card ring-1 ring-[#E7E5E4]">
                      <step.icon className="h-5 w-5 text-primary" />
                    </span>
                    <span>
                      <span className="block font-heading text-base font-semibold text-foreground">
                        {index + 1}. {step.title}
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                        {step.description}
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
                <Link
                  href="/dodaj-oferte"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 sm:w-auto"
                >
                  <PlusCircle className="h-4 w-4" />
                  Dodaj ofertę bez konta
                </Link>
                <Link
                  href="/oferty"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary sm:w-auto"
                >
                  Zobacz katalog
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* ─── Features ─── */}
      <Section id="features">
        <Container>
          <SectionHeader
            badge="✨ Funkcje"
            title="Mniej chaosu w ofertach i kontaktach"
            description={`${APP_NAME} pomaga uporządkować codzienną pracę z ofertami, klientami i spotkaniami w jednym miejscu.`}
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </Container>
      </Section>

      {/* ─── How it works ─── */}
      <Section id="how-it-works" variant="muted">
        <Container>
          <SectionHeader
            badge="🚀 Jak to działa"
            title="Od potrzeby do kolejnego kroku"
            description={`W ${APP_NAME} zaczynasz od tego, co chcesz zrobić: znaleźć ofertę, dodać nieruchomość albo prowadzić sprzedaż.`}
          />
          <div className="grid gap-10 md:grid-cols-3">
            {steps.map((step, index) => (
              <HowItWorksStep
                key={step.title}
                stepNumber={index + 1}
                {...step}
              />
            ))}
          </div>
        </Container>
      </Section>

      {/* ─── Work Benefits ─── */}
      <Section id="benefits">
        <Container>
          <SectionHeader
            badge="Efekty"
            title={`Co zyskujesz z ${APP_NAME}`}
            description="Najważniejsze efekty dla osób, które pracują z ofertami, właścicielami i kupującymi."
          />
          <div className="grid gap-6 md:grid-cols-3">
            {workBenefits.map((benefit) => (
              <FeatureCard key={benefit.title} {...benefit} />
            ))}
          </div>
        </Container>
      </Section>

      {/* ─── Pricing ─── */}
      <Section id="pricing" variant="muted">
        <Container>
          <SectionHeader
            badge="💰 Cennik"
            title="Wybierz plan dla siebie lub biura"
            description="Porównaj pakiety pod kątem liczby ofert, klientów, użytkowników i narzędzi potrzebnych na co dzień."
          />
          <HomePricingSection />
        </Container>
      </Section>

      {/* ─── Final CTA dsad───sdaasd */}
      <Section>
        <Container className="text-center">
          <h2 className="font-heading text-3xl font-bold text-foreground lg:text-4xl">
            Zacznij od tego, czego potrzebujesz
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Przejdź do katalogu, dodaj swoją nieruchomość albo otwórz konto dla
            agenta i prowadź cały proces w jednym miejscu.
          </p>
          <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
            <Link
              href="/oferty"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              <Search className="h-4 w-4" />
              Szukaj ofert
            </Link>
            <Link
              href="/dodaj-oferte"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-primary bg-card px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              <PlusCircle className="h-4 w-4" />
              Dodaj ofertę
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Users className="h-4 w-4" />
              Otwórz konto agenta
            </Link>
          </div>
        </Container>
      </Section>
    </>
  );
}
