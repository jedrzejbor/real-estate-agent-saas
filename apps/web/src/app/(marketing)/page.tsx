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
  HomePricingSection,
  HowItWorksStep,
  TestimonialCard,
} from '@/components/marketing';
import { HeroPhotoGrid } from '@/components/marketing/hero-photo-grid';
import type { HeroImage } from '@/components/marketing/hero-photo-grid';

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
      'Centralna baza ofert z pełnym CRUD, statusami, zdjęciami i automatycznym generowaniem kart ofertowych.',
  },
  {
    icon: Users,
    title: 'CRM i baza klientów',
    description:
      'Prowadź bazę klientów z timeline kontaktów, preferencjami i automatycznym matchowaniem ofert.',
  },
  {
    icon: CalendarCheck,
    title: 'Kalendarz spotkań',
    description:
      'Planuj prezentacje i spotkania z klientami. Automatyczne przypomnienia i synchronizacja.',
  },
  {
    icon: TrendingUp,
    title: 'Raporty i analityka',
    description:
      'Dashboard z KPI: konwersje, przychody, aktywność zespołu. Eksport do PDF.',
  },
  {
    icon: Globe,
    title: 'Strona publiczna',
    description:
      'Profesjonalna wizytówka online z Twoimi ofertami. Własna domena i SEO.',
  },
  {
    icon: Shield,
    title: 'Bezpieczeństwo i RODO',
    description:
      'Pełna zgodność z RODO, szyfrowanie danych, regularne kopie zapasowe.',
  },
];

const steps = [
  {
    title: 'Załóż konto',
    description:
      'Rejestracja zajmuje 30 sekund. Bez karty kredytowej, bez zobowiązań.',
  },
  {
    title: 'Dodaj oferty',
    description: 'Wprowadź swoje nieruchomości lub zaimportuj je z pliku CSV.',
  },
  {
    title: 'Zarządzaj i rozwijaj',
    description:
      'Korzystaj z CRM, kalendarza i raportów, aby zwiększyć swoją efektywność.',
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

const testimonials = [
  {
    quote:
      'EstateFlow zmienił sposób, w jaki zarządzam swoimi ofertami. Oszczędzam minimum 2 godziny dziennie.',
    authorName: 'Anna Kowalska',
    authorRole: 'Agent nieruchomości, Warszawa',
    rating: 5,
  },
  {
    quote:
      'Najlepsze narzędzie CRM dedykowane dla branży nieruchomości. Wszystko w jednym miejscu.',
    authorName: 'Piotr Nowak',
    authorRole: 'Właściciel biura, Kraków',
    rating: 5,
  },
  {
    quote:
      'Raporty i analityka pozwoliły mi zidentyfikować, które kanały pozyskiwania klientów działają najlepiej.',
    authorName: 'Maria Wiśniewska',
    authorRole: 'Senior Agent, Gdańsk',
    rating: 5,
  },
];

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
                Znajdź, dodaj i <br className="hidden sm:inline" />
                zarządzaj ofertami <br className="hidden sm:inline" />
                nieruchomości
              </h1>

              <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground lg:text-lg">
                Przeglądaj publiczny katalog nieruchomości, dodaj własną ofertę
                bez konta albo prowadź sprzedaż w CRM zaprojektowanym dla
                agentów.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/oferty"
                  className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(5,150,105,0.3)] transition-all hover:bg-primary/90 hover:shadow-[0_6px_16px_rgba(5,150,105,0.4)]"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Szukaj nieruchomości
                </Link>
                <Link
                  href="/dodaj-oferte"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-primary bg-card px-7 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  <PlusCircle className="h-4 w-4" />
                  Dodaj ofertę bez konta
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-full border border-border bg-card px-7 py-3 text-sm font-semibold text-foreground transition-colors hover:border-border hover:bg-muted"
                >
                  Darmowe konto agenta
                </Link>
              </div>
            </div>

            {/* Right — photo grid */}
            <div className="mx-auto w-full max-w-md lg:max-w-none">
              <HeroPhotoGrid images={heroImages} />
            </div>
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
                EstateFlow ma publiczną wyszukiwarkę nieruchomości dla osób,
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
      <Section id="private-owners" variant="muted">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div className="order-2 lg:order-1">
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_18px_45px_-30px_rgba(28,25,23,0.45)]">
                <div className="relative aspect-[4/3] min-h-[320px]">
                  <Image
                    src="/images/hero/interior-1.jpg"
                    alt="Właściciel przygotowuje mieszkanie do sprzedaży"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 560px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute left-4 right-4 top-4 flex flex-wrap gap-2 sm:left-6 sm:right-6 sm:top-6">
                    <span className="rounded-full bg-card/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm">
                      Bez konta na start
                    </span>
                    <span className="rounded-full bg-brand-emerald-light px-3 py-1.5 text-xs font-semibold text-primary shadow-sm">
                      Katalog i mapa
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
                    <div className="max-w-md rounded-xl bg-card/95 p-4 shadow-lg backdrop-blur">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        Dla właściciela
                      </p>
                      <p className="mt-1 font-heading text-xl font-semibold text-foreground">
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

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/dodaj-oferte"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                >
                  <PlusCircle className="h-4 w-4" />
                  Dodaj ofertę bez konta
                </Link>
                <Link
                  href="/oferty"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
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
            title="Wszystko czego potrzebujesz"
            description="EstateFlow zastępuje arkusze, notatniki, kalendarze i osobne strony internetowe — wszystko w jednym narzędziu."
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
            title="Zacznij w 3 prostych krokach"
            description="Konfiguracja EstateFlow jest szybka i bezbolesna."
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

      {/* ─── Testimonials ─── */}
      <Section id="testimonials">
        <Container>
          <SectionHeader
            badge="💬 Opinie"
            title="Zaufali nam agenci z całej Polski"
            description="Dołącz do rosnącej społeczności agentów, którzy już korzystają z EstateFlow."
          />
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <TestimonialCard key={testimonial.authorName} {...testimonial} />
            ))}
          </div>
        </Container>
      </Section>

      {/* ─── Pricing ─── */}
      <Section id="pricing" variant="muted">
        <Container>
          <SectionHeader
            badge="💰 Cennik"
            title="Prosty i przejrzysty cennik"
            description="Nazwy, ceny, limity i funkcje są zgodne z aktualną konfiguracją planów."
          />
          <HomePricingSection />
        </Container>
      </Section>

      {/* ─── Final CTA ─── */}
      <Section>
        <Container className="text-center">
          <h2 className="font-heading text-3xl font-bold text-foreground lg:text-4xl">
            Gotowy, by zwiększyć swoją efektywność?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Dołącz do tysięcy agentów, którzy już korzystają z EstateFlow.
            Pierwsze 14 dni za darmo.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Załóż darmowe konto
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Container>
      </Section>
    </>
  );
}
