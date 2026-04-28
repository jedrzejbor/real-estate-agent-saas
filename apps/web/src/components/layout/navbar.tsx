import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/common/logo';
import { Container } from '@/components/layout/container';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Cechy', href: '#features' },
  { label: 'Cennik', href: '#pricing' },
  { label: 'Blog', href: '#' },
  { label: 'Logowanie', href: '/login' },
] as const;

/** Marketing top navigation bar. */
export function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between lg:h-20">
        <Link href="/" aria-label="Strona główna EstateFlow">
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
        <Link
          href="/register"
          className="hidden rounded-full border-2 border-primary bg-transparent px-5 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white md:inline-flex"
        >
          Rozpocznij darmowy test
        </Link>

        {/* Mobile hamburger — placeholder for future client component */}
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#44403C] md:hidden"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </Container>
    </header>
  );
}
