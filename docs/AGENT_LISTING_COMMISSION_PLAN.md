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

Status: wykonane - etap 2 API 2026-06-11

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

- [x] Nie da się zapisać niepoprawnej prowizji.
- [x] Dashboard dostaje wyliczoną kwotę prowizji.
- [x] Publiczne API nie ujawnia prowizji.

Wykonane:

- Rozszerzono `CreateListingDto` i `UpdateListingDto` o:
  - `commissionType`,
  - `commissionValue`.
- Dodano `apps/api/src/listings/listing-commission.ts` z helperami:
  - `normalizeListingCommissionInput()`,
  - `calculateListingCommissionAmount()`.
- Backend normalizuje prowizję przy tworzeniu i aktualizacji oferty:
  - brak typu prowizji czyści `commissionType` i `commissionValue`,
  - wartość bez typu jest odrzucana,
  - typ bez wartości jest odrzucany,
  - wartości ujemne są odrzucane,
  - prowizja procentowa powyżej `100` jest odrzucana.
- Dashboardowe odpowiedzi listingów dostają pochodne `commissionAmount`.
- Publiczne mapowania `PublicListingView`, `PublicListingCatalogItem`,
  `PublicListingCatalogMapMarker`, `PublicAgentProfileListing` nadal budują
  jawne obiekty bez pól prowizyjnych.
- Snapshot historii zmian zawiera `commissionType`, `commissionValue` i
  `commissionAmount`, żeby zmiana prowizji była widoczna w historii dashboardu.

Weryfikacja:

- `pnpm --filter api type-check` - przechodzi.
- `pnpm --filter api test -- listing-commission.spec.ts` - przechodzi.

### C3. Frontend typy i schema formularza

Status: wykonane - etap 3 web contract 2026-06-11

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

- [x] TypeScript rozumie pola prowizji w dashboardowym typie `Listing`.
- [x] Formularz nie pozwala wysłać niepoprawnej kombinacji pól.
- [x] Brak prowizji działa bez błędów w istniejących ofertach.

Wykonane:

- Dodano webowy enum `ListingCommissionType` oraz labelki
  `LISTING_COMMISSION_TYPE_LABELS` w `apps/web/src/lib/listings.ts`.
- Rozszerzono dashboardowy typ `Listing` o:
  - `commissionType`,
  - `commissionValue`,
  - `commissionAmount`.
- Rozszerzono `createListingSchema` o walidację prowizji:
  - wartość bez typu prowizji jest odrzucana,
  - typ prowizji bez wartości jest odrzucany,
  - prowizja procentowa powyżej `100` jest odrzucana,
  - brak prowizji pozostaje poprawnym stanem.
- Dodano `cleanListingPayload()`, który pozwala świadomie wyczyścić prowizję
  przez wysłanie `commissionType: null` i `commissionValue: null`.
- Dodano helpery:
  - `calculateListingCommissionAmount()`,
  - `formatListingCommission()`.
- Publiczne typy listingów nie zostały rozszerzone o pola prowizyjne.

Weryfikacja:

- `pnpm --filter web type-check` - przechodzi.
- `pnpm --filter web exec eslint src/lib/listings.ts` - przechodzi.

### C4. UI formularza oferty

Status: wykonane - etap 4 formularz dashboardu 2026-06-11

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

- [x] Agent może dodać prowizję przy tworzeniu oferty.
- [x] Agent może edytować albo usunąć prowizję przy edycji oferty.
- [x] UI nie sugeruje, że prowizja będzie publiczna.
- [ ] Formularz pozostaje czytelny na mobile i desktop.

Wykonane:

- Dodano sekcję `Prowizja agenta` w
  `apps/web/src/components/listings/listing-form.tsx`.
- Sekcja działa w trybie tworzenia i edycji oferty.
- Dodano wybór:
  - `Brak prowizji`,
  - `% ceny`,
  - `Kwota stała`.
- Dodano pole wartości prowizji z dynamiczną etykietą i ograniczeniem `max=100`
  dla prowizji procentowej.
- Dodano podgląd `Szacowana prowizja`, liczony z aktualnej ceny oferty i
  wartości prowizji.
- Wybranie `Brak prowizji` czyści wartość prowizji i pozwala wysłać `null` dla
  pól prowizyjnych przez istniejący payload formularza.
- Copy sekcji jasno wskazuje, że prowizja jest prywatną informacją dashboardową.

Weryfikacja:

- `pnpm --filter web type-check` - przechodzi.
- `pnpm --filter web exec eslint src/components/listings/listing-form.tsx src/lib/listings.ts` - przechodzi.

Pozostałe:

- Nie wykonywano screenshotów ani manualnego QA.
- Responsywność mobile/desktop zostaje do ręcznego sprawdzenia w `QA-COM-08`.

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
