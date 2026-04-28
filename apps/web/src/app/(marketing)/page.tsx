import Link from 'next/link';
import {
  Building2,
  TrendingUp,
  Users,
  CalendarCheck,
  BarChart3,
  Globe,
  Shield,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Container, Section, SectionHeader } from '@/components/layout';
import { FeatureCard, HowItWorksStep, TestimonialCard, PricingCard } from '@/components/marketing';
import { HeroPhotoGrid } from '@/components/marketing/hero-photo-grid';
import type { HeroImage } from '@/components/marketing/hero-photo-grid';
import { ScrollLink } from '@/components/common/scroll-link';

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
    description:
      'Wprowadź swoje nieruchomości lub zaimportuj je z pliku CSV.',
  },
  {
    title: 'Zarządzaj i rozwijaj',
    description:
      'Korzystaj z CRM, kalendarza i raportów, aby zwiększyć swoją efektywność.',
  },
];

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

const pricingPlans = [
  {
    name: 'Starter',
    price: 49,
    description: 'Idealny na start dla agentów indywidualnych',
    features: [
      'Do 25 aktywnych ofert',
      '1 konto agenta',
      'Zarządzanie ofertami',
      'Baza klientów',
      'Kalendarz spotkań',
      'Wsparcie email',
    ],
  },
  {
    name: 'Professional',
    price: 149,
    description: 'Dla rozwijających się biur nieruchomości',
    features: [
      'Do 200 aktywnych ofert',
      'Do 5 kont agentów',
      'Wszystko ze Starter +',
      'Raporty i analityka',
      'Automatyzacje',
      'Eksport PDF',
      'Priorytetowe wsparcie',
    ],
    isPopular: true,
  },
  {
    name: 'Enterprise',
    price: 399,
    description: 'Pełna moc dla dużych biur nieruchomości',
    features: [
      'Nielimitowane oferty',
      'Nielimitowani agenci',
      'Wszystko z Professional +',
      'Dostęp do API',
      'White-label branding',
      'Własna domena',
      'Dedykowany opiekun',
    ],
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
                <h1 className="font-heading text-4xl font-bold leading-[1.1] tracking-tight text-[#1C1917] sm:text-5xl xl:text-6xl">
                  Usprawnij swoją{' '}
                  <br className="hidden sm:inline" />
                  pracę jako agent{' '}
                  <br className="hidden sm:inline" />
                  nieruchomości
                </h1>

                <p className="mt-6 max-w-lg text-base leading-relaxed text-[#78716C] lg:text-lg">
                  Kompleksowa platforma do zarządzania klientami, ofertami
                  i transakcjami, zaprojektowana dla nowoczesnych pośredników.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(5,150,105,0.3)] transition-all hover:bg-[#047857] hover:shadow-[0_6px_16px_rgba(5,150,105,0.4)]"
                  >
                    Rozpocznij dzisiaj
                  </Link>
                  <ScrollLink
                    href="#features"
                    className="inline-flex items-center justify-center rounded-full border border-[#E7E5E4] bg-white px-7 py-3 text-sm font-semibold text-[#44403C] transition-colors hover:border-[#D6D3D1] hover:bg-[#F5F0EB]"
                  >
                    Dowiedz się więcej
                  </ScrollLink>
                </div>
              </div>

              {/* Right — photo grid */}
              <div className="mx-auto w-full max-w-md lg:max-w-none">
                <HeroPhotoGrid images={heroImages} />
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
              description="Bez ukrytych opłat. Zmień plan lub anuluj w dowolnym momencie."
            />
            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
              {pricingPlans.map((plan) => (
                <PricingCard key={plan.name} {...plan} />
              ))}
            </div>
          </Container>
        </Section>

        {/* ─── Final CTA ─── */}
        <Section>
          <Container className="text-center">
            <h2 className="font-heading text-3xl font-bold text-[#1C1917] lg:text-4xl">
              Gotowy, by zwiększyć swoją efektywność?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-[#78716C]">
              Dołącz do tysięcy agentów, którzy już korzystają z EstateFlow.
              Pierwsze 14 dni za darmo.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-[#047857]"
            >
              Załóż darmowe konto
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Container>
        </Section>
    </>
  );
}
