'use client';

import Link from 'next/link';
import { LayoutDashboard, LogIn, PlusCircle, UserCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getDefaultAuthenticatedPath, type AuthUser } from '@/lib/auth';

export function NavbarAuthActions() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="hidden h-10 w-48 rounded-full bg-muted md:block" />;
  }

  if (!user) {
    return (
      <div className="hidden items-center gap-2 md:flex">
        <Link
          href="/dodaj-oferte"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-[#047857]"
        >
          <PlusCircle className="h-4 w-4" />
          Dodaj ofertę
        </Link>
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-[#44403C] transition-colors hover:border-primary hover:text-primary"
        >
          <LogIn className="h-4 w-4" />
          Logowanie
        </Link>
        <Link
          href="/register"
          className="inline-flex h-10 items-center justify-center rounded-full border-2 border-primary bg-transparent px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
        >
          Darmowe konto
        </Link>
      </div>
    );
  }

  return (
    <div className="hidden items-center gap-4 md:flex">
      <span className="inline-flex min-w-0 max-w-52 items-center gap-2 text-sm font-medium text-[#44403C]">
        <UserCircle className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate">Witaj, {getUserDisplayName(user)}</span>
      </span>
      <div className="flex items-center gap-2">
        <Link
          href="/dodaj-oferte"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-[#047857]"
        >
          <PlusCircle className="h-4 w-4" />
          Dodaj ofertę
        </Link>
        <Link
          href={getDefaultAuthenticatedPath(user)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border-2 border-primary bg-transparent px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
        >
          <LayoutDashboard className="h-4 w-4" />
          Panel
        </Link>
      </div>
    </div>
  );
}

export function NavbarMobileAuthAction() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-9 w-20 rounded-full bg-muted md:hidden" />;
  }

  return (
    <Link
      href={user ? getDefaultAuthenticatedPath(user) : '/login'}
      className="inline-flex h-9 items-center justify-center rounded-full border border-border px-3 text-sm font-semibold text-[#44403C] transition-colors hover:border-primary hover:text-primary md:hidden"
    >
      {user ? 'Panel' : 'Login'}
    </Link>
  );
}

function getUserDisplayName(user: AuthUser): string {
  const fullName = [user.agent?.firstName, user.agent?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (fullName) {
    return fullName;
  }

  return user.email.split('@')[0] || user.email;
}
