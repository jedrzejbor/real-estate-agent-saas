import type { Metadata } from 'next';
import { Container } from '@/components/layout';

export const metadata: Metadata = {
  title: 'Polityka prywatności | EstateFlow',
  description:
    'Informacje o przetwarzaniu danych w EstateFlow, publicznych formularzach, leadach i zgłoszeniach ofert.',
};

export default function PrivacyPolicyPage() {
  return (
    <Container className="py-12 lg:py-16">
      <article className="mx-auto max-w-3xl rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-primary">Dokument prawny</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">
          Polityka prywatności
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Ten dokument opisuje, jakie dane mogą być przetwarzane w EstateFlow
          oraz w publicznych formularzach ofert i profili.
        </p>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          Wersja robocza produktu MVP. Przed publicznym launch’em dokument
          powinien zostać zweryfikowany prawnie.
        </p>

        <div className="mt-8 space-y-8">
          <Section title="Administrator i role">
            <p>
              W przypadku danych przekazywanych przez formularze publiczne
              administratorem danych jest agent lub biuro obsługujące ofertę
              albo profil. EstateFlow działa jako dostawca narzędzia do obsługi
              formularzy, leadów i zgłoszeń.
            </p>
          </Section>

          <Section title="Zakres danych">
            <p>
              Formularze mogą zbierać imię i nazwisko, adres email, numer
              telefonu, treść wiadomości, zgody, źródło zgłoszenia, UTM,
              referrer, dane techniczne formularza oraz informacje potrzebne do
              ochrony przed spamem.
            </p>
          </Section>

          <Section title="Cele przetwarzania">
            <p>
              Dane są przetwarzane w celu odpowiedzi na zapytanie, obsługi leada
              w CRM, weryfikacji publicznego zgłoszenia oferty, przejęcia oferty
              do konta użytkownika, ochrony przed nadużyciami oraz prowadzenia
              podstawowej analityki produktu.
            </p>
          </Section>

          <Section title="Zdjęcia i treści ofert">
            <p>
              Zdjęcia i treści dodawane do publicznej oferty mogą być
              publikowane na publicznej stronie oferty po weryfikacji i
              przejęciu zgłoszenia do konta. Osoba dodająca ofertę powinna mieć
              prawo do publikacji tych materiałów.
            </p>
          </Section>

          <Section title="Prawa osób, których dane dotyczą">
            <p>
              Osoba, której dane dotyczą, może żądać dostępu do danych,
              sprostowania, usunięcia, ograniczenia przetwarzania lub wycofania
              zgody, jeżeli właściwe przepisy dają takie uprawnienia. Wnioski
              powinny być kierowane do agenta lub biura obsługującego ofertę
              albo profil.
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
