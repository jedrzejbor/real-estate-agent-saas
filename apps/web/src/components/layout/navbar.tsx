import Link from 'next/link';
import { Logo } from '@/components/common/logo';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { Container } from '@/components/layout/container';
import { NavbarAuthActions } from '@/components/layout/navbar-auth-actions';
import { NavbarMobileMenu } from '@/components/layout/navbar-mobile-menu';
import { APP_NAME } from '@/lib/brand';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Oferty', href: '/oferty' },
  { label: 'Cechy', href: '/#features' },
  { label: 'Cennik', href: '/#pricing' },
  { label: 'Blog', href: '/blog' },
] as const;

/** Marketing top navigation bar. */
export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <Container className="flex h-16 min-w-0 items-center justify-between gap-2 lg:h-20">
        <Link
          href="/"
          aria-label={`Strona główna ${APP_NAME}`}
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
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <NavbarAuthActions />
        </div>

        <NavbarMobileMenu />
      </Container>
    </header>
  );
}
