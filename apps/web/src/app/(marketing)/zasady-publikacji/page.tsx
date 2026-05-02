import type { Metadata } from 'next';
import { Container } from '@/components/layout';

export const metadata: Metadata = {
  title: 'Zasady publikacji ofert | EstateFlow',
  description:
    'Zasady dodawania publicznych ofert, zdjęć, danych kontaktowych i zgłaszania nadużyć w EstateFlow.',
};

export default function PublicationRulesPage() {
  return (
    <Container className="py-12 lg:py-16">
      <article className="mx-auto max-w-3xl rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-primary">Publiczne oferty</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">
          Zasady publikacji ofert
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Te zasady pomagają utrzymać publiczne oferty w EstateFlow jako
          bezpieczne, aktualne i zgodne z oczekiwaniami klientów.
        </p>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          Wersja robocza produktu MVP. Przed publicznym launch’em dokument
          powinien zostać zweryfikowany prawnie.
        </p>

        <div className="mt-8 space-y-8">
          <Rule title="Prawdziwe i aktualne dane">
            Oferta powinna opisywać realną nieruchomość, a cena, lokalizacja,
            parametry i status powinny być aktualne na moment publikacji.
          </Rule>

          <Rule title="Prawo do zdjęć i treści">
            Osoba dodająca ofertę potwierdza, że ma prawo do publikacji zdjęć,
            opisów, danych technicznych i innych materiałów wykorzystanych w
            ogłoszeniu.
          </Rule>

          <Rule title="Ochrona prywatności">
            Oferta nie powinna ujawniać danych osobowych osób trzecich bez
            podstawy prawnej lub zgody. Dokładny adres można ukryć na stronie
            publicznej.
          </Rule>

          <Rule title="Zakaz spamu i treści wprowadzających w błąd">
            Niedozwolone są fałszywe oferty, spam, treści podszywające się pod
            inne osoby, linki do podejrzanych stron oraz materiały naruszające
            prawa osób trzecich.
          </Rule>

          <Rule title="Zgłaszanie nadużyć">
            Publiczna strona oferty zawiera mechanizm zgłoszenia nadużycia.
            Zgłoszenia trafiają do logu operacyjnego i mogą skutkować ręczną
            weryfikacją albo wycofaniem oferty.
          </Rule>
        </div>
      </article>
    </Container>
  );
}

function Rule({
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
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{children}</p>
    </section>
  );
}
