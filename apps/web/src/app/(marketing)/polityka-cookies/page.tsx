import type { Metadata } from 'next';
import { Container } from '@/components/layout';
import { LEGAL_META } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Polityka cookies | EstateFlow',
  description:
    'Informacje o cookies, localStorage, sessionStorage i zgodach opcjonalnych w EstateFlow.',
};

export default function CookiePolicyPage() {
  return (
    <Container className="py-12 lg:py-16">
      <article className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-primary">Dokument prawny</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">
          Polityka cookies
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Ten dokument opisuje, jak EstateFlow używa cookies, localStorage,
          sessionStorage oraz podobnych technologii w przeglądarce.
        </p>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          Wersja robocza produktu MVP. Przed publicznym launch’em dokument
          powinien zostać zweryfikowany prawnie i uzupełniony w etapie C5.
        </p>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          Wersja: {LEGAL_META.version}. Data obowiązywania:{' '}
          {LEGAL_META.effectiveDate}. Kontakt: {LEGAL_META.contactEmail}.
        </p>

        <div className="mt-8 space-y-8">
          <Section title="Kategorie">
            <p>
              EstateFlow rozróżnia technologie niezbędne, funkcjonalne,
              analityczne i marketingowe. Niezbędne mechanizmy są wymagane do
              działania aplikacji, bezpieczeństwa, obsługi sesji i zapamiętania
              wyboru zgód.
            </p>
          </Section>

          <Section title="Własna analityka">
            <p>
              Aplikacja może zapisywać własne eventy analityczne dotyczące
              oglądalności ofert, artykułów, kliknięć CTA i użycia funkcji
              produktu. Eventy analityczne powinny być wysyłane wyłącznie po
              zgodzie na kategorię analityczną.
            </p>
          </Section>

          <Section title="Zmiana zgody">
            <p>
              Użytkownik może zmienić wybór w stopce strony przez przycisk
              „Ustawienia cookies”. Preferencje są zapisywane lokalnie w
              przeglądarce.
            </p>
          </Section>
        </div>
      </article>
    </Container>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-heading text-xl font-semibold text-foreground">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
