import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout';
import { LEGAL_LINKS } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Regulamin | EstateFlow',
  description:
    'Podstawowe zasady korzystania z EstateFlow, publicznych formularzy i funkcji freemium.',
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="Regulamin EstateFlow"
      lead="Ten dokument opisuje podstawowe zasady korzystania z aplikacji EstateFlow oraz publicznych formularzy dostępnych bez logowania."
      sections={[
        {
          title: 'Zakres usługi',
          body: [
            'EstateFlow jest narzędziem SaaS dla agentów i biur nieruchomości. Aplikacja pomaga zarządzać ofertami, klientami, spotkaniami, publicznymi stronami ofert oraz zapytaniami z formularzy.',
            'Publiczne funkcje, takie jak karta oferty, profil agenta, formularz kontaktowy i publiczne dodanie oferty, służą do prezentacji nieruchomości i obsługi zapytań.',
          ],
        },
        {
          title: 'Konta i przestrzenie robocze',
          body: [
            'Użytkownik odpowiada za poprawność danych podanych podczas rejestracji oraz za działania wykonywane w swojej przestrzeni roboczej.',
            'Limity planu freemium i płatnych planów mogą obejmować liczbę ofert, klientów, spotkań, użytkowników oraz zdjęć przypisanych do oferty.',
          ],
        },
        {
          title: 'Treści i materiały',
          body: [
            'Użytkownik odpowiada za to, aby publikowane treści, zdjęcia i dane ofert były prawdziwe, aktualne oraz publikowane zgodnie z prawem i posiadanymi uprawnieniami.',
            'EstateFlow może ograniczyć widoczność lub usunąć treści, które naruszają zasady publikacji, prawa osób trzecich albo bezpieczeństwo użytkowników.',
          ],
        },
        {
          title: 'Dane osobowe',
          body: [
            'Zasady przetwarzania danych osobowych opisuje Polityka prywatności.',
            'W przypadku formularzy publicznych dane są wykorzystywane przede wszystkim do obsługi zapytania, kontaktu zwrotnego i ochrony przed nadużyciami.',
          ],
          links: [{ label: 'Polityka prywatności', href: LEGAL_LINKS.privacy }],
        },
        {
          title: 'Zasady publikacji ofert',
          body: [
            'Publiczne oferty muszą spełniać dodatkowe zasady dotyczące poprawności danych, praw do zdjęć, ochrony prywatności i zakazu spamu.',
          ],
          links: [
            {
              label: 'Zasady publikacji ofert',
              href: LEGAL_LINKS.publicationRules,
            },
          ],
        },
      ]}
    />
  );
}

interface LegalDocumentProps {
  title: string;
  lead: string;
  sections: Array<{
    title: string;
    body: string[];
    links?: Array<{ label: string; href: string }>;
  }>;
}

function LegalDocument({ title, lead, sections }: LegalDocumentProps) {
  return (
    <Container className="py-12 lg:py-16">
      <article className="mx-auto max-w-3xl rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-primary">Dokument prawny</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">
          {title}
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">{lead}</p>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          Wersja robocza produktu MVP. Przed publicznym launch’em dokumenty
          powinny zostać zweryfikowane prawnie.
        </p>

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                {section.title}
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {section.links ? (
                <div className="mt-3 flex flex-wrap gap-3">
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </section>
          ))}
        </div>
      </article>
    </Container>
  );
}
