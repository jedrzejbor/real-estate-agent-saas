'use client';

import Link from 'next/link';
import { LayoutDashboard, PlusCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import {
  getDefaultAuthenticatedPath,
  isPrivateSellerUser,
} from '@/lib/auth';

export function PublicListingsHeroActions() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="h-11 w-44 rounded-xl bg-muted" />
        <div className="h-11 w-40 rounded-xl bg-muted" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/dodaj-oferte"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <PlusCircle className="h-4 w-4" />
          Dodaj ofertę bez konta
        </Link>
        <Link
          href="/register"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-semibold transition-colors hover:bg-muted"
        >
          Załóż konto agenta
        </Link>
      </div>
    );
  }

  const addListingHref = isPrivateSellerUser(user)
    ? '/dodaj-oferte'
    : '/dashboard/listings/new';

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <Link
        href={addListingHref}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <PlusCircle className="h-4 w-4" />
        Dodaj ofertę
      </Link>
      <Link
        href={getDefaultAuthenticatedPath(user)}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-5 text-sm font-semibold transition-colors hover:bg-muted"
      >
        <LayoutDashboard className="h-4 w-4" />
        Przejdź do panelu
      </Link>
    </div>
  );
}
