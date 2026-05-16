'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Building2,
  Home,
  LogOut,
  PlusCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import {
  AGENT_DASHBOARD_PATH,
  isPrivateSellerUser,
} from '@/lib/auth';
import { Logo } from '@/components/common/logo';

export default function SellerDashboardPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const isPrivateSeller = user ? isPrivateSellerUser(user) : false;

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!isPrivateSeller) {
      router.replace(AGENT_DASHBOARD_PATH);
    }
  }, [isLoading, isPrivateSeller, router, user]);

  if (isLoading || !user || !isPrivateSeller) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAFAF9]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF9] text-[#1C1917]">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/seller" aria-label="Panel właściciela EstateFlow">
            <Logo size="sm" />
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              href="/oferty"
              className="hidden h-9 items-center justify-center rounded-xl border border-border px-3 text-sm font-semibold transition-colors hover:bg-muted sm:inline-flex"
            >
              Katalog ofert
            </Link>
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold transition-colors hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              Wyloguj
            </button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">
              Panel właściciela
            </p>
            <h1 className="mt-2 max-w-3xl font-heading text-3xl font-bold leading-tight sm:text-4xl">
              Zarządzaj swoim ogłoszeniem bez panelu CRM
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              Dodaj ogłoszenie, przejdź weryfikację i pokaż nieruchomość w
              publicznym katalogu EstateFlow.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-foreground">
              Konto: {user.email}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Widok uproszczony dla właścicieli prywatnych.
            </p>
          </div>
        </div>

        <SellerEmptyState />
      </section>
    </main>
  );
}

function SellerEmptyState() {
  return (
    <section className="mt-8 rounded-2xl border border-border bg-white p-6 text-center shadow-sm sm:p-10">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Home className="h-7 w-7" />
      </div>
      <h2 className="mt-5 font-heading text-2xl font-semibold">
        Nie masz jeszcze ogłoszeń
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        Dodaj pierwszą nieruchomość, a po weryfikacji będzie mogła pojawić się
        w katalogu ofert i na mapie.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/dodaj-oferte"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <PlusCircle className="h-4 w-4" />
          Dodaj ogłoszenie
        </Link>
        <Link
          href="/oferty"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-5 py-2 text-sm font-semibold transition-colors hover:bg-muted"
        >
          <Building2 className="h-4 w-4" />
          Zobacz katalog
        </Link>
      </div>

      <div className="mx-auto mt-8 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
        <Step title="1. Dodaj dane" description="Uzupełnij opis, cenę i lokalizację." />
        <Step title="2. Dodaj zdjęcia" description="Pokaż nieruchomość kupującym." />
        <Step title="3. Opublikuj" description="Po weryfikacji pokażemy ofertę publicznie." />
      </div>
    </section>
  );
}

function Step({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl bg-muted/40 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {title}
        <ArrowRight className="h-3.5 w-3.5 text-primary" />
      </p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
