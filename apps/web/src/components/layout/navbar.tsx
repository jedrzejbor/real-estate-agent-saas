import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Logo } from '@/components/common/logo';
import { Container } from '@/components/layout/container';
import {
  NavbarAuthActions,
  NavbarMobileAuthAction,
} from '@/components/layout/navbar-auth-actions';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Oferty', href: '/oferty' },
  { label: 'Cechy', href: '#features' },
  { label: 'Cennik', href: '#pricing' },
  { label: 'Blog', href: '/blog' },
] as const;

/** Marketing top navigation bar. */
export function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md">
      <Container className="flex h-16 min-w-0 items-center justify-between gap-2 lg:h-20">
        <Link
          href="/"
          aria-label="Strona główna EstateFlow"
          className="shrink-0"
        >
          <Logo />
        </Link>

        {/* Desktop nav — centered */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-[#44403C] transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <NavbarAuthActions />

        <div className="flex shrink-0 items-center gap-1 md:hidden">
          <Link
            href="/oferty"
            className="inline-flex h-9 items-center justify-center rounded-full border border-border px-2 text-xs font-semibold text-[#44403C] transition-colors hover:border-primary hover:text-primary"
          >
            Oferty
          </Link>
          <NavbarMobileAuthAction />

          {/* Mobile hamburger — placeholder for future client component */}
          <button
            className="hidden h-10 w-10 items-center justify-center rounded-lg text-[#44403C] sm:inline-flex md:hidden"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </Container>
    </header>
  );
}
