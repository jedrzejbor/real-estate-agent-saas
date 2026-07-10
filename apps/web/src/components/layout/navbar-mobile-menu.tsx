'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  LogIn,
  Menu,
  PlusCircle,
  UserPlus,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { getDefaultAuthenticatedPath } from '@/lib/auth';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Oferty', href: '/oferty' },
  { label: 'Cechy', href: '/#features' },
  { label: 'Cennik', href: '/#pricing' },
  { label: 'Blog', href: '/blog' },
] as const;

export function NavbarMobileMenu() {
  const { user, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  function closeMenu() {
    setIsOpen(false);
  }

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-primary bg-card px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        aria-label={isOpen ? 'Zamknij menu' : 'Otwórz menu'}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        Menu
      </button>

      {isOpen ? (
        <div className="absolute inset-x-0 top-16 border-t border-border bg-card shadow-lg">
          <nav
            aria-label="Menu mobilne"
            className="mx-auto flex max-w-[1280px] flex-col gap-1 px-5 py-4"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted hover:text-primary"
                onClick={closeMenu}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mx-auto grid max-w-[1280px] gap-2 border-t border-border px-5 py-4">
            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
              <span className="text-sm font-semibold text-foreground">
                Motyw
              </span>
              <ThemeToggle />
            </div>

            <Link
              href="/dodaj-oferte"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              onClick={closeMenu}
            >
              <PlusCircle className="h-4 w-4" />
              Dodaj ofertę
            </Link>

            {isLoading ? (
              <div className="h-11 rounded-xl bg-muted" />
            ) : user ? (
              <Link
                href={getDefaultAuthenticatedPath(user)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-primary px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                onClick={closeMenu}
              >
                <LayoutDashboard className="h-4 w-4" />
                Panel
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                  onClick={closeMenu}
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-primary px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  onClick={closeMenu}
                >
                  <UserPlus className="h-4 w-4" />
                  Konto
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
