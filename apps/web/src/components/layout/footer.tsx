import Link from 'next/link';
import { Logo } from '@/components/common/logo';
import { Container } from '@/components/layout/container';

const footerSections = [
  {
    title: 'Produkt',
    links: [
      { label: 'Funkcje', href: '#features' },
      { label: 'Cennik', href: '#pricing' },
      { label: 'Integracje', href: '#' },
      { label: 'Roadmapa', href: '#' },
    ],
  },
  {
    title: 'Firma',
    links: [
      { label: 'O nas', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Kariera', href: '#' },
      { label: 'Kontakt', href: '#' },
    ],
  },
  {
    title: 'Wsparcie',
    links: [
      { label: 'Pomoc', href: '#' },
      { label: 'Dokumentacja', href: '#' },
      { label: 'Status', href: '#' },
    ],
  },
  {
    title: 'Prawne',
    links: [
      { label: 'Regulamin', href: '/regulamin' },
      { label: 'Polityka prywatności', href: '/polityka-prywatnosci' },
      { label: 'Zasady publikacji', href: '/zasady-publikacji' },
    ],
  },
] as const;

/** Site-wide footer with link columns and legal info. */
export function Footer() {
  return (
    <footer className="border-t border-[#E7E5E4] bg-white">
      <Container className="py-12 lg:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <Logo size="sm" />
            <p className="mt-4 text-sm leading-relaxed text-[#78716C]">
              Kompleksowa platforma SaaS dla agentów nieruchomości w Polsce.
            </p>
          </div>

          {/* Link columns */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="mb-3 text-sm font-semibold text-[#1C1917]">
                {section.title}
              </h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#78716C] transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-[#E7E5E4] pt-6 text-center text-sm text-[#78716C]">
          © {new Date().getFullYear()} EstateFlow. Wszelkie prawa zastrzeżone.
        </div>
      </Container>
    </footer>
  );
}
