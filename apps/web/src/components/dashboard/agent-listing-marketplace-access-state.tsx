'use client';

import Link from 'next/link';
import { AlertCircle, ShieldAlert } from 'lucide-react';

type AgentListingMarketplaceAccessStateVariant = 'error' | 'plan' | 'role';

interface AgentListingMarketplaceAccessStateProps {
  variant: AgentListingMarketplaceAccessStateVariant;
  message: string;
}

const ACCESS_STATE_COPY: Record<
  AgentListingMarketplaceAccessStateVariant,
  {
    title: string;
    ctaLabel?: string;
    ctaHref?: string;
    icon: typeof AlertCircle;
  }
> = {
  error: {
    title: 'Nie udało się pobrać danych',
    icon: AlertCircle,
  },
  plan: {
    title: 'Funkcja dostępna w płatnym planie',
    ctaLabel: 'Zobacz plany',
    ctaHref: '/dashboard/upgrade',
    icon: AlertCircle,
  },
  role: {
    title: 'Dostęp tylko dla kont agentów',
    ctaLabel: 'Przejdź do panelu',
    ctaHref: '/dashboard',
    icon: ShieldAlert,
  },
};

export function AgentListingMarketplaceAccessState({
  variant,
  message,
}: AgentListingMarketplaceAccessStateProps) {
  const copy = ACCESS_STATE_COPY[variant];
  const Icon = copy.icon;

  return (
    <section className="rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="mt-4 font-heading text-2xl font-semibold">
        {copy.title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {message}
      </p>
      {copy.ctaHref && copy.ctaLabel ? (
        <Link
          href={copy.ctaHref}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {copy.ctaLabel}
        </Link>
      ) : null}
    </section>
  );
}
