import Link from 'next/link';
import { ArrowRight, Home, PlusCircle, UserPlus } from 'lucide-react';

interface ArticleCtaProps {
  variant?: 'register' | 'listings' | 'submit-listing';
}

const ctaCopy = {
  register: {
    icon: UserPlus,
    title: 'Zarządzaj nieruchomościami w EstateFlow',
    description:
      'Prowadź oferty, klientów i zapytania z jednego panelu stworzonego dla rynku nieruchomości.',
    href: '/register',
    label: 'Załóż konto',
  },
  listings: {
    icon: Home,
    title: 'Sprawdź aktualne oferty nieruchomości',
    description:
      'Przejdź do publicznego katalogu i zobacz mieszkania, domy oraz działki opublikowane w EstateFlow.',
    href: '/oferty',
    label: 'Zobacz oferty',
  },
  'submit-listing': {
    icon: PlusCircle,
    title: 'Chcesz sprzedać lub wynająć nieruchomość?',
    description:
      'Dodaj ofertę przez publiczny formularz i przygotuj ją do weryfikacji oraz publikacji.',
    href: '/dodaj-oferte',
    label: 'Dodaj ofertę',
  },
} as const;

export function ArticleCta({ variant = 'register' }: ArticleCtaProps) {
  const cta = ctaCopy[variant];
  const Icon = cta.icon;

  return (
    <section className="rounded-2xl border border-[#059669]/20 bg-[#ECFDF5] p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-semibold text-[#1C1917]">
              {cta.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#44403C]">
              {cta.description}
            </p>
          </div>
        </div>
        <Link
          href={cta.href}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          {cta.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
