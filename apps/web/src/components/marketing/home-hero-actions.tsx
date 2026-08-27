'use client';

import Link from 'next/link';
import {
  ArrowRight,
  LayoutDashboard,
  PlusCircle,
  Search,
  Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getDefaultAuthenticatedPath } from '@/lib/auth';

export function HomeHeroActions() {
  const { user, isLoading } = useAuth();
  const agentAction =
    !isLoading && user
      ? {
          href: getDefaultAuthenticatedPath(user),
          kicker: 'Twoje konto',
          label: 'Przejdź do panelu',
          Icon: LayoutDashboard,
        }
      : {
          href: '/register',
          kicker: 'Dla agentów i biur',
          label: 'Otwórz konto agenta',
          Icon: Users,
        };
  const AgentIcon = agentAction.Icon;

  return (
    <div className="mt-8 grid max-w-xl gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/oferty"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(5,150,105,0.3)] transition-all hover:bg-primary/90 hover:shadow-[0_6px_16px_rgba(5,150,105,0.4)]"
        >
          <Search className="h-4 w-4" />
          Szukaj nieruchomości
        </Link>
        <Link
          href="/dodaj-oferte"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-primary bg-card px-6 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          <PlusCircle className="h-4 w-4" />
          Dodaj ofertę bez konta
        </Link>
      </div>

      <Link
        href={agentAction.href}
        className="group inline-flex min-h-16 items-center justify-between gap-4 rounded-xl border border-border bg-card/90 px-4 py-3 text-left shadow-sm transition-all hover:border-primary/60 hover:bg-primary/5"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-emerald-light">
            <AgentIcon className="h-5 w-5 text-primary" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-wide text-primary">
              {agentAction.kicker}
            </span>
            <span className="block text-sm font-semibold text-foreground">
              {agentAction.label}
            </span>
          </span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
      </Link>
    </div>
  );
}
