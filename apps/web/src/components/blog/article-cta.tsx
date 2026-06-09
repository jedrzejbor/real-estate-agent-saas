'use client';

import Link from 'next/link';
import { ArrowRight, Home, Mail, PlusCircle, UserPlus } from 'lucide-react';
import { AnalyticsEventName, trackPublicBlogEvent } from '@/lib/analytics';

export type ArticleCtaVariant =
  | 'register'
  | 'contact'
  | 'listings'
  | 'submit-listing';

interface ArticleCtaProps {
  variant?: ArticleCtaVariant;
  blogContext?: {
    slug: string;
    title: string;
  };
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
  contact: {
    icon: Mail,
    title: 'Porozmawiajmy o wdrożeniu EstateFlow',
    description:
      'Napisz do nas, jeśli chcesz dopasować EstateFlow do pracy Twojego biura lub zespołu sprzedaży.',
    href: 'mailto:legal@estateflow.pl',
    label: 'Skontaktuj się',
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

export function ArticleCta({
  variant = 'register',
  blogContext,
}: ArticleCtaProps) {
  const cta = ctaCopy[variant];
  const Icon = cta.icon;
  const href = getTrackedHref(cta.href, blogContext?.slug);

  function handleClick() {
    if (!blogContext) {
      return;
    }

    trackPublicBlogEvent({
      slug: blogContext.slug,
      name: AnalyticsEventName.BLOG_CTA_CLICKED,
      properties: {
        ctaVariant: variant,
        ctaLabel: cta.label,
        targetHref: href,
        postTitle: blogContext.title,
      },
    });
  }

  return (
    <section className="rounded-2xl border border-primary/20 bg-brand-emerald-light p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card text-primary shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              {cta.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground">
              {cta.description}
            </p>
          </div>
        </div>
        <Link
          href={href}
          onClick={handleClick}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          {cta.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function getTrackedHref(href: string, blogSlug: string | undefined) {
  if (!blogSlug || !href.startsWith('/')) {
    return href;
  }

  const [pathname, queryString] = href.split('?');
  const params = new URLSearchParams(queryString);
  params.set('source', 'blog');
  params.set('blogPost', blogSlug);

  return `${pathname}?${params.toString()}`;
}
