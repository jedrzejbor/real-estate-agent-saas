import type { Metadata } from 'next';
import { Container } from '@/components/layout';
import { APP_NAME } from '@/lib/brand';
import { LEGAL_META } from '@/lib/legal';
import { STORAGE_KEYS } from '@/lib/storage-keys';

export const metadata: Metadata = {
  title: `Polityka cookies | ${APP_NAME}`,
  description: `Informacje o cookies, localStorage, sessionStorage i zgodach opcjonalnych w ${APP_NAME}.`,
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
          Ten dokument opisuje, jak {APP_NAME} używa cookies, localStorage,
          sessionStorage, httpOnly cookies oraz podobnych technologii w
          przeglądarce.
        </p>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          Wersja robocza produktu MVP. Przed publicznym launch’em dokument
          powinien zostać zweryfikowany prawnie oraz uzupełniony o finalne dane
          operatora.
        </p>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          Wersja: {LEGAL_META.version}. Data obowiązywania:{' '}
          {LEGAL_META.effectiveDate}. Kontakt: {LEGAL_META.contactEmail}.
        </p>

        <div className="mt-8 space-y-8">
          <Section title="Czym są cookies i browser storage">
            <p>
              Cookies, localStorage i sessionStorage to technologie
              przeglądarki, które pozwalają zapamiętać stan aplikacji,
              preferencje użytkownika, informacje techniczne albo zgodę na
              opcjonalne kategorie. W {APP_NAME} sesja użytkownika jest
              obsługiwana przez httpOnly cookies ustawiane przez API, a
              preferencje i wybrane funkcje mogą korzystać z localStorage albo
              sessionStorage.
            </p>
          </Section>

          <Section title="Kategorie">
            <p>
              {APP_NAME} rozróżnia technologie niezbędne, funkcjonalne,
              analityczne i marketingowe. Niezbędne mechanizmy są wymagane do
              działania aplikacji, bezpieczeństwa, obsługi sesji i zapamiętania
              wyboru zgód.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Niezbędne: sesja użytkownika, zapamiętanie decyzji cookie
                consent, techniczne mechanizmy bezpieczeństwa i obsługa zgłoszeń
                nadużyć.
              </li>
              <li>
                Funkcjonalne: motyw interfejsu, stan checklisty onboardingowej,
                roboczy draft formularza dodania oferty i lokalne preferencje
                produktu.
              </li>
              <li>
                Analityczne: własne eventy pomagające mierzyć oglądalność ofert,
                artykułów, kliknięcia CTA i użycie funkcji.
              </li>
              <li>
                Marketingowe: kategoria przygotowana na przyszłe integracje
                reklamowe. Na moment tej wersji nie używamy zewnętrznych pikseli
                marketingowych.
              </li>
            </ul>
          </Section>

          <Section title="Mechanizmy używane w aplikacji">
            <StorageTable />
          </Section>

          <Section title="Własna analityka">
            <p>
              Aplikacja może zapisywać własne eventy analityczne dotyczące
              oglądalności ofert, artykułów, kliknięć CTA i użycia funkcji
              produktu. Eventy pomiarowe są wysyłane wyłącznie po zgodzie na
              kategorię analityczną. Brak decyzji użytkownika traktujemy jak
              brak zgody na analitykę.
            </p>
            <p>
              Zgłoszenia nadużyć i techniczne działania potrzebne do
              bezpieczeństwa mogą działać niezależnie od zgody analitycznej,
              ponieważ służą ochronie użytkowników, ofert i formularzy.
            </p>
          </Section>

          <Section title="Zewnętrzni dostawcy">
            <p>
              Na moment tej wersji w kodzie aplikacji nie ma aktywnej integracji
              z Google Analytics, Meta Pixel, Hotjar, Clarity ani podobnymi
              zewnętrznymi narzędziami marketingowymi lub remarketingowymi.
              Dodanie takiego dostawcy wymaga aktualizacji tej polityki, listy
              dostawców i blokady ładowania skryptu przed zgodą użytkownika.
            </p>
          </Section>

          <Section title="Retencja">
            <p>
              Preferencje zgód są przechowywane lokalnie do czasu zmiany wyboru,
              wyczyszczenia danych przeglądarki albo zmiany wersji mechanizmu
              zgód. sessionStorage jest usuwany przez przeglądarkę po zakończeniu
              sesji. Dane zapisane w localStorage pozostają do czasu ich
              nadpisania, usunięcia przez aplikację albo wyczyszczenia przez
              użytkownika.
            </p>
            <p>
              Eventy analityczne zapisane po stronie API powinny być
              przechowywane w formie ograniczonej do celów bezpieczeństwa,
              diagnostyki i pomiaru produktu zgodnie z polityką prywatności.
            </p>
          </Section>

          <Section title="Zmiana zgody">
            <p>
              Użytkownik może zmienić wybór w stopce strony przez przycisk
              „Ustawienia cookies”. Preferencje są zapisywane lokalnie w
              przeglądarce pod kluczem `{STORAGE_KEYS.cookieConsent}`. Starszy
              klucz `{STORAGE_KEYS.legacyCookieConsent}` jest obsługiwany tylko
              migracyjnie.
            </p>
            <p>
              Wyczyszczenie danych przeglądarki usuwa zapisane preferencje i
              może spowodować ponowne pokazanie banera zgód.
            </p>
          </Section>

          <Section title="Kontakt">
            <p>
              W sprawach prywatności, cookies i żądań dotyczących danych można
              skontaktować się przez adres {LEGAL_META.contactEmail}.
            </p>
          </Section>
        </div>
      </article>
    </Container>
  );
}

function StorageTable() {
  const rows = [
    {
      name: STORAGE_KEYS.cookieConsent,
      type: 'localStorage',
      category: 'Niezbędne',
      purpose: 'Zapamiętanie wyboru zgód użytkownika.',
    },
    {
      name: 'accessToken, refreshToken',
      type: 'httpOnly cookies',
      category: 'Niezbędne',
      purpose:
        'Utrzymanie i odświeżanie sesji użytkownika bez udostępniania tokenów JavaScriptowi.',
    },
    {
      name: 'podadresem.csrf-token',
      type: 'cookie',
      category: 'Niezbędne',
      purpose:
        'Ochrona mutujących requestów zalogowanego użytkownika przed atakami CSRF. Starszy cookie estateflow.csrf-token jest akceptowany tylko w okresie przejściowym.',
    },
    {
      name: STORAGE_KEYS.theme,
      type: 'localStorage',
      category: 'Funkcjonalne',
      purpose: 'Zapamiętanie motywu interfejsu.',
    },
    {
      name: STORAGE_KEYS.publicListingWizard,
      type: 'localStorage',
      category: 'Funkcjonalne',
      purpose:
        'Roboczy draft publicznego formularza dodania oferty, w tym dane wpisane przez użytkownika.',
    },
    {
      name: `${STORAGE_KEYS.dashboardOnboardingPrefix}.*`,
      type: 'localStorage',
      category: 'Funkcjonalne',
      purpose: 'Zapamiętanie postępu checklisty onboardingowej.',
    },
    {
      name: `${STORAGE_KEYS.listingDescriptionAssistantPrefix}:*`,
      type: 'localStorage',
      category: 'Funkcjonalne',
      purpose:
        'Zapamiętanie miesięcznego limitu użycia asystenta opisu oferty.',
    },
    {
      name: 'blog-article-viewed:*',
      type: 'sessionStorage',
      category: 'Analityczne',
      purpose:
        'Deduplikacja pomiaru wyświetlenia artykułu w danej sesji po zgodzie analitycznej.',
    },
    {
      name: 'analytics_events',
      type: 'API / baza danych',
      category: 'Analityczne albo operacyjne',
      purpose:
        'Pomiar produktu po zgodzie analitycznej oraz wybrane zdarzenia operacyjne, np. zgłoszenia nadużyć.',
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="grid grid-cols-1 divide-y divide-border text-sm md:grid-cols-[1.2fr_0.9fr_0.9fr_1.6fr] md:divide-y-0">
        <TableHeader>Nazwa</TableHeader>
        <TableHeader>Typ</TableHeader>
        <TableHeader>Kategoria</TableHeader>
        <TableHeader>Cel</TableHeader>
        {rows.map((row) => (
          <Row key={`${row.type}-${row.name}`} {...row} />
        ))}
      </div>
    </div>
  );
}

function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="hidden bg-muted px-3 py-2 text-xs font-semibold uppercase text-muted-foreground md:block">
      {children}
    </div>
  );
}

function Row({
  name,
  type,
  category,
  purpose,
}: {
  name: string;
  type: string;
  category: string;
  purpose: string;
}) {
  return (
    <>
      <TableCell label="Nazwa">{name}</TableCell>
      <TableCell label="Typ">{type}</TableCell>
      <TableCell label="Kategoria">{category}</TableCell>
      <TableCell label="Cel">{purpose}</TableCell>
    </>
  );
}

function TableCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border px-3 py-3 text-muted-foreground md:border-t">
      <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground md:hidden">
        {label}
      </span>
      <span className="text-sm leading-6">{children}</span>
    </div>
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
