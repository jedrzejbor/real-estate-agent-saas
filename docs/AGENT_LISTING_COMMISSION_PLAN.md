# Agent listing commission plan

## Cel

Dodać możliwość zapisania prowizji agenta przy konkretnej ofercie w dashboardzie.
Funkcja ma pokazywać agentowi, ile potencjalnie zarobi na sprzedaży albo obsłudze
danej nieruchomości.

Na obecnym etapie aplikacja obsługuje pojedyncze konta agentów. Widoczność
agencyjna, prowizje pracowników i raport managera/agencji są poza zakresem tego
sprintu.

## Założenia produktu

- Prowizja jest prywatną informacją operacyjną agenta.
- Prowizja nie może być widoczna na publicznej stronie oferty, w publicznym
  katalogu, sitemapie, SEO metadata ani publicznym profilu agenta.
- Prowizja jest przypisana do oferty w dashboardzie.
- Agent widzi prowizję tylko dla ofert, do których ma dostęp w obecnym modelu
  uprawnień.
- W MVP nie dodajemy statusów typu `oczekiwana`, `uzyskana`, `wypłacona`.
- W MVP nie dodajemy rozliczeń agencyjnych ani podziału prowizji między osoby.

## Decyzja MVP

Dodajemy dwa pola wejściowe:

- `commissionType`:
  - `percentage` - prowizja jako procent ceny oferty,
  - `fixed` - prowizja jako stała kwota,
  - `null` - brak prowizji.
- `commissionValue`:
  - dla `percentage`: liczba od `0` do `100`,
  - dla `fixed`: kwota `>= 0`.

Kwota prowizji jest wyliczana jako pole pochodne:

- `percentage`: `price * commissionValue / 100`,
- `fixed`: `commissionValue`.

Rekomendacja techniczna: nie zapisywać `commissionAmount` w bazie w pierwszej
iteracji. Liczyć ją po stronie backendu i frontendu z `price`,
`commissionType` i `commissionValue`, żeby uniknąć rozjazdu po zmianie ceny
oferty.

## Proponowany kontrakt danych

Backend enum:

```ts
export enum ListingCommissionType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}
```

Pola na encji `Listing`:

```ts
commissionType?: ListingCommissionType | null;
commissionValue?: number | null;
```

Pole pochodne w odpowiedzi dashboardowej:

```ts
commissionAmount?: number | null;
```

Nie dodawać tych pól do publicznych modeli:

- `PublicListing`,
- `PublicListingCatalogItem`,
- `PublicAgentProfileListing`,
- publiczne DTO/listing serializers,
- publiczne submission/claim payloads, chyba że później świadomie zdecydujemy,
  że prywatny sprzedający też może podać prowizję dla agenta. To nie jest zakres
  MVP.

## Zakres sprintu

### C1. Backend model i migracja

Status: wykonane - etap 1 modelu danych 2026-06-11

Zakres:

- Dodać enum prowizji w module wspólnych enumów albo lokalnie w module listings,
  zgodnie z aktualnym stylem repo.
- Dodać pola do `apps/api/src/listings/entities/listing.entity.ts`:
  - `commissionType` jako nullable enum,
  - `commissionValue` jako nullable decimal.
- Przygotować migrację DB, jeśli repo ma już ustalony mechanizm migracji.
  Jeśli nadal używamy `synchronize` lokalnie, zapisać decyzję w tym planie i w
  checklistach przed produkcją.
- Sprawdzić, czy `decimal` z TypeORM wraca jako string i uwzględnić to w
  serializerze/typach.

Kryteria akceptacji:

- [x] Baza potrafi przechować typ i wartość prowizji.
- [x] Brak prowizji jest reprezentowany jako `null`, nie jako magiczne `0`.
- [x] Zmiana jest kompatybilna z istniejącymi ofertami.

Wykonane:

- Dodano `ListingCommissionType` w `apps/api/src/common/enums/index.ts`.
- Dodano pola w `apps/api/src/listings/entities/listing.entity.ts`:
  - `commissionType` jako nullable enum,
  - `commissionValue` jako nullable decimal `precision: 12, scale: 2`.
- `commissionValue` jest typowane jako `number | string | null`, bo TypeORM dla
  kolumn `decimal` w Postgresie może zwracać string. To trzeba uwzględnić w
  kontrakcie API i helperach liczących w kolejnych etapach.
- Nie dodano jeszcze `commissionAmount` do bazy. Zgodnie z decyzją MVP ma być
  liczone jako pole pochodne.

Decyzja migracyjna:

- W repo nie ma obecnie skonfigurowanego katalogu/komend migracji TypeORM.
- `apps/api/src/app.module.ts` używa `synchronize` dla środowisk innych niż
  `production`.
- Na etapie C1 nie dodano migracji produkcyjnej. Przed wdrożeniem na produkcję
  trzeba przygotować migrację SQL/TypeORM dla:
  - enumu `listing_commission_type`,
  - kolumny `listings.commissionType`,
  - kolumny `listings.commissionValue`.

Weryfikacja:

- `pnpm --filter api type-check` - przechodzi.

### C2. Walidacja API i kontrakt dashboardowy

Status: TODO

Zakres:

- Rozszerzyć `CreateListingDto` i `UpdateListingDto`.
- Walidować:
  - `commissionType` musi być `percentage`, `fixed` albo puste,
  - `commissionValue` jest wymagane, jeśli podano `commissionType`,
  - `commissionValue` musi być puste/null, jeśli nie podano `commissionType`,
  - dla `percentage`: `0 <= value <= 100`,
  - dla `fixed`: `value >= 0`.
- Dodać helper backendowy do liczenia `commissionAmount`.
- Upewnić się, że endpointy dashboardowe zwracają pola:
  - `commissionType`,
  - `commissionValue`,
  - `commissionAmount`.
- Upewnić się, że publiczne endpointy nie zwracają żadnych danych prowizyjnych.

Kryteria akceptacji:

- [ ] Nie da się zapisać niepoprawnej prowizji.
- [ ] Dashboard dostaje wyliczoną kwotę prowizji.
- [ ] Publiczne API nie ujawnia prowizji.

### C3. Frontend typy i schema formularza

Status: TODO

Zakres:

- Rozszerzyć `apps/web/src/lib/listings.ts`:
  - typ `Listing`,
  - `createListingSchema`,
  - payload create/update,
  - helper do liczenia i formatowania prowizji.
- Dodać typ:

```ts
type ListingCommissionType = 'percentage' | 'fixed';
```

- Dodać walidację Zod zgodną z backendem.
- Przygotować wartości domyślne dla nowych i edytowanych ofert.

Kryteria akceptacji:

- [ ] TypeScript rozumie pola prowizji w dashboardowym typie `Listing`.
- [ ] Formularz nie pozwala wysłać niepoprawnej kombinacji pól.
- [ ] Brak prowizji działa bez błędów w istniejących ofertach.

### C4. UI formularza oferty

Status: TODO

Zakres:

- Dodać sekcję w `apps/web/src/components/listings/listing-form.tsx`.
- Sekcja powinna być prywatna i dashboardowa, np. `Prowizja agenta`.
- Kontrolki:
  - select albo segmented control: `Brak`, `% ceny`, `Kwota stała`,
  - input liczbowy dla wartości,
  - podgląd wyliczonej kwoty prowizji.
- Podgląd powinien aktualizować się po zmianie ceny i prowizji.
- Copy powinno jasno mówić, że pole jest widoczne tylko w dashboardzie.

Kryteria akceptacji:

- [ ] Agent może dodać prowizję przy tworzeniu oferty.
- [ ] Agent może edytować albo usunąć prowizję przy edycji oferty.
- [ ] UI nie sugeruje, że prowizja będzie publiczna.
- [ ] Formularz pozostaje czytelny na mobile i desktop.

### C5. Widoczność w dashboardzie

Status: TODO

Zakres:

- Dodać prezentację prowizji w widoku szczegółów oferty:
  `apps/web/src/app/(dashboard)/dashboard/listings/[id]/page.tsx`.
- Rozważyć pokazanie skrótu na karcie/listingu:
  `apps/web/src/components/listings/listing-card.tsx`.
- Format:
  - typ prowizji,
  - wartość wejściowa,
  - wyliczona kwota,
  - waluta zgodna z ofertą.
- Nie dodawać tej informacji do publicznych komponentów ofert.

Kryteria akceptacji:

- [ ] Szczegóły oferty pokazują prowizję, jeśli jest ustawiona.
- [ ] Brak prowizji pokazuje neutralny stan, np. `Nie ustawiono`.
- [ ] Publiczne strony i katalog nie pokazują prowizji.

### C6. Bezpieczeństwo i prywatność

Status: TODO

Zakres:

- Sprawdzić serializację publicznych listingów w backendzie.
- Sprawdzić typy publiczne w web:
  - `PublicListing`,
  - `PublicListingCatalogItem`,
  - `PublicAgentProfileListing`.
- Dodać test albo checklistę, że publiczne odpowiedzi nie zawierają:
  - `commissionType`,
  - `commissionValue`,
  - `commissionAmount`.
- Upewnić się, że prowizja nie trafia do analytics eventów.
- Upewnić się, że prowizja nie trafia do SEO metadata, JSON-LD ani Open Graph.

Kryteria akceptacji:

- [ ] Prowizja jest prywatna dla dashboardu.
- [ ] Publiczne endpointy nie zwracają pól prowizyjnych.
- [ ] Analytics nie wysyła wartości prowizji.

### C7. Testy i QA

Status: TODO

Testy automatyczne:

- API:
  - create listing bez prowizji,
  - create listing z prowizją procentową,
  - create listing z prowizją stałą,
  - odrzucenie procentu powyżej `100`,
  - odrzucenie wartości ujemnej,
  - update usuwa prowizję,
  - publiczny listing response nie zawiera prowizji.
- Web:
  - schema formularza waliduje `percentage`,
  - schema formularza waliduje `fixed`,
  - helper poprawnie liczy `commissionAmount`.

Manual QA:

| ID | Scenariusz | Oczekiwany wynik | Status |
| --- | --- | --- | --- |
| QA-COM-01 | Utwórz ofertę bez prowizji. | Oferta zapisuje się poprawnie, szczegóły pokazują brak prowizji. | TODO |
| QA-COM-02 | Utwórz ofertę z prowizją `2.5%`. | Dashboard pokazuje wyliczoną kwotę na podstawie ceny. | TODO |
| QA-COM-03 | Utwórz ofertę z prowizją stałą. | Dashboard pokazuje wpisaną kwotę jako prowizję. | TODO |
| QA-COM-04 | Zmień cenę oferty z prowizją procentową. | Wyliczona prowizja aktualizuje się po zapisie. | TODO |
| QA-COM-05 | Usuń prowizję z oferty. | Pola są czyszczone, dashboard pokazuje neutralny stan. | TODO |
| QA-COM-06 | Otwórz publiczną stronę oferty. | Nie ma żadnej informacji o prowizji. | TODO |
| QA-COM-07 | Sprawdź publiczny katalog i profil agenta. | Prowizja nie jest zwracana ani renderowana. | TODO |
| QA-COM-08 | Sprawdź mobile formularza. | Pola prowizji są czytelne i nie rozbijają layoutu. | TODO |

Komendy weryfikacyjne:

```bash
pnpm --filter api type-check
pnpm --filter web type-check
pnpm --filter api test -- listings
pnpm --filter web exec eslint src/lib/listings.ts src/components/listings/listing-form.tsx src/components/listings/listing-card.tsx
```

## Poza zakresem MVP

- Widok managera agencji z prowizjami pracowników.
- Podział prowizji między agenta, agencję i partnerów.
- Statusy rozliczeń prowizji.
- Faktury, wypłaty, księgowość.
- Raport prowizji miesięcznych.
- Eksport prowizji do CSV/PDF.
- Uprawnienia multi-user dla prowizji.

## Przyszły etap agencyjny

Gdy aplikacja zacznie obsługiwać konta agencyjne i pracowników, należy dodać:

- role i uprawnienia dla widoczności prowizji,
- widok właściciela/managera agencji,
- filtrowanie prowizji po agencie,
- raport sum prowizji per okres,
- opcjonalne ukrywanie prowizji między pracownikami,
- audit log zmian prowizji.

## Release gate

Nie uznajemy funkcji za gotową, dopóki:

- [ ] pola prowizji działają w create/update listing,
- [ ] dashboard pokazuje wyliczoną prowizję,
- [ ] publiczne endpointy i komponenty nie ujawniają prowizji,
- [ ] walidacja backendu i frontendu jest spójna,
- [ ] type-check API i web przechodzą,
- [ ] manualny QA `QA-COM-01` - `QA-COM-08` ma status `PASS` albo świadome `N/A`.
