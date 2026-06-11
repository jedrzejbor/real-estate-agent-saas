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

Status: wykonane - etap 5 widoczność dashboardu 2026-06-11

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

- [x] Szczegóły oferty pokazują prowizję, jeśli jest ustawiona.
- [x] Brak prowizji pokazuje neutralny stan, np. `Nie ustawiono`.
- [x] Publiczne strony i katalog nie pokazują prowizji.

Wykonane:

- Dodano kartę `Prowizja agenta` w prywatnym widoku szczegółów oferty:
  `apps/web/src/app/(dashboard)/dashboard/listings/[id]/page.tsx`.
- Karta pokazuje:
  - wyliczoną kwotę prowizji,
  - neutralny stan `Nie ustawiono`,
  - opis typu i wartości wejściowej,
  - informację, że pole jest widoczne tylko w dashboardzie.
- Dodano skrót prowizji na prywatnej karcie oferty w dashboardzie:
  `apps/web/src/components/listings/listing-card.tsx`.
- Nie zmieniano publicznych komponentów ofert, katalogu, mapy ani publicznego
  profilu agenta.

Weryfikacja:

- `pnpm --filter web type-check` - przechodzi.
- `pnpm --filter web exec eslint 'src/app/(dashboard)/dashboard/listings/[id]/page.tsx' src/components/listings/listing-card.tsx src/lib/listings.ts` - przechodzi.

### C6. Bezpieczeństwo i prywatność

Status: wykonane - etap 6 privacy check 2026-06-11

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

- [x] Prowizja jest prywatna dla dashboardu.
- [x] Publiczne endpointy nie zwracają pól prowizyjnych.
- [x] Analytics nie wysyła wartości prowizji.

Wykonane:

- Przeskanowano wystąpienia pól `commissionType`, `commissionValue` i
  `commissionAmount` w `apps/api/src` oraz `apps/web/src`.
- Potwierdzono, że prowizja jest używana tylko w:
  - dashboardowym typie `Listing`,
  - formularzu i widokach dashboardu,
  - backendowym modelu/DTO dashboardowych listingów,
  - helperach walidacji i liczenia prowizji.
- Publiczne typy webowe nie zostały rozszerzone o pola prowizyjne:
  - `PublicListing`,
  - `PublicListingCatalogItem`,
  - `PublicAgentProfileListing`.
- Publiczne mapowania API nadal tworzą jawne obiekty bez spreadowania encji.
- Dodano test `apps/api/src/listings/listing-public-privacy.spec.ts`, który
  sprawdza, że publiczny detail, item katalogu i marker mapy nie zawierają
  `commissionType`, `commissionValue` ani `commissionAmount`, nawet jeśli
  źródłowa encja listing ma te pola.
- Sprawdzono analytics po stronie web: eventy listingów wysyłają identyfikatory,
  typy, statusy i publiczne metadane, ale nie wysyłają wartości prowizji.

Weryfikacja:

- `pnpm --filter api type-check` - przechodzi.
- `pnpm --filter api test -- listing-public-privacy.spec.ts listing-commission.spec.ts` - przechodzi.
- `pnpm --filter web type-check` - przechodzi.

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

### C8. Agregacje prowizji w dashboardzie i raportach

Status: W TRAKCIE - etap 1 wykonany

Cel:

- Pokazać agentowi realny kontekst finansowy prowizji na bazie danych zapisanych
  przy ofertach.
- Rozdzielić wartość nieruchomości od szacowanej prowizji agenta, żeby dashboard
  i raporty nie sugerowały, że suma cen ofert jest zarobkiem agenta.
- Zachować prywatność prowizji: dane są dostępne tylko w dashboardzie i raportach
  zalogowanego agenta.

Zakres backendu:

- Dodać wspólną, testowalną logikę agregacji prowizji po stronie API:
  - `percentage`: `price * commissionValue / 100`,
  - `fixed`: `commissionValue`,
  - brak typu lub wartości: `0`.
- Rozszerzyć `DashboardService` / `RevenueStats` o pola:
  - `activeCommissionValue` - suma szacowanej prowizji z aktywnych ofert,
  - `closedCommissionValue` - suma szacowanej prowizji z ofert sprzedanych i
    wynajętych,
  - opcjonalnie `totalCommissionValue` jako suma kontrolna, jeśli UI będzie jej
    potrzebował.
- Rozszerzyć raport `overview` o pole:
  - `estimatedCommissionValue` dla aktywnych ofert w wybranym zakresie/scope.
- Rozszerzyć porównanie okresów w raportach o deltę dla
  `estimatedCommissionValue`.
- Nie dodawać jeszcze miesięcznych rozliczeń, statusów wypłat ani eksportu
  prowizji. To zostaje poza MVP.

Zakres frontendu:

- Rozszerzyć typy dashboardu i raportów o nowe pola prowizyjne.
- Dodać KPI w dashboardzie `Przegląd`, np. `Szacowana prowizja`, z opisem jasno
  wskazującym, czy dotyczy aktywnych ofert, czy zamkniętych transakcji.
- Dodać KPI w raportach `Przegląd`, np. `Szacowana prowizja portfela`.
- W copy UI używać słowa `szacowana`, ponieważ na tym etapie nie mamy jeszcze
  statusów rozliczenia, faktur ani wypłat.
- Nie pokazywać prowizji w publicznych komponentach, SEO metadata, JSON-LD,
  Open Graph ani analytics eventach.

Wykonano w etapie 1:

- Dodano `apps/api/src/listings/listing-commission-query.ts` ze wspólnym
  helperem SQL do liczenia kwoty i sumy prowizji dla zapytań agregujących.
- Rozszerzono `DashboardService` / `RevenueStats` o:
  - `activeCommissionValue`,
  - `closedCommissionValue`.
- Dashboard API liczy teraz szacowaną prowizję aktywnych ofert oraz prowizję
  ofert sprzedanych/wynajętych tym samym wzorem, którego używa oferta.
- Rozszerzono raport `overview` o:
  - `summary.estimatedCommissionValue`,
  - `comparison.deltas.estimatedCommissionValue`.
- Dodano notatkę raportową wyjaśniającą, że szacowana prowizja nie jest jeszcze
  rozliczonym przychodem ani wypłatą.
- Rozszerzono typy webowe dashboardu i raportów o nowe pola prowizyjne.
- Dodano KPI prowizji w dashboardzie `Przegląd`:
  - `Szac. prowizja aktywna`,
  - `Prowizja zamknięta`.
- Dodano KPI `Szac. prowizja` w raportach `Przegląd`.
- Hotfix po integracji: poprawiono helper SQL tak, aby cytował camelCase kolumny
  `listing."commissionType"` i `listing."commissionValue"`. Bez tego Postgres
  mógł zwracać błąd 500 na agregacjach dashboardu/raportów.
- Dodano test regresyjny sprawdzający, że SQL agregacji prowizji używa
  cytowanych nazw kolumn.

Weryfikacja etapu 1:

- `pnpm --filter api type-check` - przechodzi.
- `pnpm --filter web type-check` - przechodzi.
- `pnpm --filter api test -- listing-commission.spec.ts` - przechodzi, w tym
  test regresyjny dla SQL agregacji prowizji.
- `pnpm --filter web exec eslint src/lib/dashboard.ts src/lib/reports.ts src/app/'(dashboard)'/dashboard/page.tsx src/components/reports/reports-kpi-strip.tsx` - przechodzi.
- Celowany `eslint` dla API nie został uruchomiony, ponieważ pakiet API nie ma
  konfiguracji ESLint 9 (`eslint.config.*`). Weryfikację API na tym etapie
  pokrywają type-check i test helperów prowizji.

Testy automatyczne:

- API:
  - agregacja ignoruje oferty bez prowizji,
  - agregacja liczy prowizję procentową,
  - agregacja liczy prowizję stałą,
  - dashboard zwraca sumę prowizji aktywnych ofert,
  - dashboard zwraca sumę prowizji zamkniętych ofert,
  - raport `overview` zwraca `estimatedCommissionValue`,
  - raport `overview` zwraca deltę dla `estimatedCommissionValue`.
- Web:
  - typy raportów i dashboardu obsługują nowe pola,
  - komponent KPI renderuje prowizję jako kwotę,
  - brak prowizji renderuje `0 zł`, a nie błąd lub `NaN`.

Manual QA:

| ID | Scenariusz | Oczekiwany wynik | Status |
| --- | --- | --- | --- |
| QA-COM-09 | Utwórz aktywną ofertę z prowizją procentową. | Dashboard `Przegląd` pokazuje szacowaną prowizję z aktywnych ofert. | TODO |
| QA-COM-10 | Utwórz aktywną ofertę z prowizją stałą. | Dashboard i raporty sumują stałą prowizję jako kwotę. | TODO |
| QA-COM-11 | Zmień status oferty na sprzedaną albo wynajętą. | Prowizja przechodzi do agregacji zamkniętych ofert. | TODO |
| QA-COM-12 | Usuń prowizję z oferty. | Agregacje prowizji aktualizują się i nie pokazują starej kwoty. | TODO |
| QA-COM-13 | Otwórz publiczną stronę, katalog i profil agenta. | Prowizja nadal nie jest widoczna publicznie. | TODO |

Komendy weryfikacyjne:

```bash
pnpm --filter api type-check
pnpm --filter web type-check
pnpm --filter api test -- dashboard reports listing-commission
pnpm --filter web exec eslint src/lib/dashboard.ts src/lib/reports.ts src/app/'(dashboard)'/dashboard/page.tsx src/components/reports/reports-kpi-strip.tsx
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
- [ ] dashboard i raporty pokazują agregacje szacowanej prowizji,
- [ ] publiczne endpointy i komponenty nie ujawniają prowizji,
- [ ] walidacja backendu i frontendu jest spójna,
- [ ] type-check API i web przechodzą,
- [ ] manualny QA `QA-COM-01` - `QA-COM-13` ma status `PASS` albo świadome `N/A`.
