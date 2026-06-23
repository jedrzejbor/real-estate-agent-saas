# Project critical review - 2026-06-23

Zakres: szybki przegląd repozytorium `real-estate-agent-saas` pod kątem krytycznych ryzyk technicznych, release readiness, bezpieczeństwa i jakości procesu. To nie jest pełny audyt bezpieczeństwa ani pełny code review wszystkich modułów, ale lista rzeczy, które warto traktować jako najwyższy priorytet przed szerszym uruchomieniem.

## Executive summary

Projekt ma solidne fundamenty po stronie API: globalne guardy JWT/CSRF/roles/throttling, walidację DTO, testy jednostkowe dla krytycznych obszarów billing/limity/uploady oraz sensowne zabezpieczenia uploadów przez magic bytes. Największe ryzyka są obecnie procesowe i release'owe: web lint nie przechodzi, build weba jest zależny od pobrania Google Fonts, API lint jest źle skonfigurowany dla ESLint 9, a produkcyjna strategia storage/migracji wymaga dopięcia.

## Sprawdzone komendy

| Komenda                                                        | Wynik             | Uwagi                                                                                      |
| -------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| `pnpm --filter web type-check`                                 | OK                | TypeScript web przechodzi.                                                                 |
| `pnpm --filter api type-check`                                 | OK                | TypeScript API przechodzi.                                                                 |
| `pnpm --filter api test`                                       | OK                | 33 suites, 162 testy. Testy schedulerów logują oczekiwane błędy, co robi szum w outputcie. |
| `pnpm --filter web lint`                                       | FAIL              | 7 błędów i 14 warningów. Główne błędy: `react-hooks/set-state-in-effect`.                  |
| `pnpm --filter api exec eslint "{src,apps,libs,test}/**/*.ts"` | FAIL konfiguracji | ESLint 9 nie znajduje `eslint.config.*` dla API.                                           |
| `pnpm --filter web build`                                      | FAIL środowiskowo | Next build nie może pobrać fontów `Inter` i `Outfit` z Google Fonts.                       |

## Krytyczne / release blockers

### 1. Web lint jest czerwony

`pnpm --filter web lint` zwraca 7 błędów blokujących. Najważniejsze lokalizacje:

- `apps/web/src/app/(auth)/register/page.tsx:77`
- `apps/web/src/app/(dashboard)/dashboard/calendar/[id]/page.tsx:50`
- `apps/web/src/app/(dashboard)/dashboard/clients/[id]/edit/page.tsx:18`
- `apps/web/src/app/(dashboard)/dashboard/listings/[id]/edit/page.tsx:45`
- `apps/web/src/components/listings/public-listing-catalog.tsx:70`
- `apps/web/src/contexts/theme-context.tsx:45`
- `apps/web/src/hooks/use-global-search.ts:31`

Reguła: `react-hooks/set-state-in-effect`. To nie musi oznaczać natychmiastowych bugów runtime, ale blokuje sensowny CI i utrudnia bezpieczne merge. Priorytet: wysoki.

Rekomendacja:

- Naprawić błędy przez przeniesienie stanu inicjalnego do `useState` initializerów, `useMemo`, eventów albo query/load helperów.
- Dla przypadków realnego syncu z systemem zewnętrznym zostawić efekt, ale unikać natychmiastowego setState na starcie efektu.
- Po naprawie dodać lint jako wymagany check PR.

### 2. Produkcyjny build weba zależy od sieci do Google Fonts

`pnpm --filter web build` pada, bo `next/font/google` próbuje pobrać `Inter` i `Outfit` z `fonts.googleapis.com`. Kod: `apps/web/src/app/layout.tsx:3` oraz definicje fontów w liniach 12-24.

Ryzyko:

- Build w CI/offline/restricted network może nie przejść mimo poprawnego kodu.
- Deploy staje się zależny od zewnętrznego requestu w czasie builda.

Rekomendacja:

- Przejść na lokalnie vendoryzowane fonty przez `next/font/local`.
- Alternatywnie zapewnić sieć i cache fontów w CI, ale lokalne fonty są stabilniejsze.

### 3. API lint nie jest realnie uruchamialny w obecnej konfiguracji

Skrypt `apps/api/package.json:11` ma `eslint "{src,apps,libs,test}/**/*.ts" --fix`, ale uruchomienie ESLint 9 bezpośrednio kończy się błędem braku `eslint.config.*`. Dodatkowo `--fix` w skrypcie `lint` jest ryzykowne dla CI, bo komenda jakościowa nie powinna modyfikować plików.

Rekomendacja:

- Dodać flat config ESLint dla API albo poprawnie importować lokalny config z `packages/eslint-config/nestjs.js`.
- Rozdzielić skrypty:
  - `lint`: raportuje i failuje bez zmian w plikach.
  - `lint:fix`: wykonuje auto-fix lokalnie.

### 4. `synchronize` TypeORM zależy tylko od `NODE_ENV !== 'production'`

Kod: `apps/api/src/app.module.ts:46`.

Ryzyko:

- Każde środowisko nieustawione jako dokładnie `production` uruchamia automatyczne zmiany schematu.
- Staging, preview albo źle skonfigurowany deployment mogą przypadkowo działać z `synchronize: true`.

Rekomendacja:

- Zastąpić warunek jawnie sterowaną zmienną, np. `TYPEORM_SYNCHRONIZE=false`.
- Domyślnie `false`, lokalnie świadomie `true` tylko dla developmentu.
- Produkcyjnie używać wyłącznie migracji.

## Wysokie ryzyka produkcyjne

### 5. Publiczny lokalny storage `/uploads` wymaga decyzji produkcyjnej

Kod: `apps/api/src/main.ts:10-18` tworzy lokalny katalog `uploads` i serwuje go publicznie przez `/uploads/`.

Plusy:

- Prosty model dla MVP i lokalnego developmentu.
- Uploady zdjęć mają walidację typu i magic bytes.

Ryzyka:

- Lokalny dysk nie jest dobrym storage dla produkcji wieloinstancyjnej.
- Backup/retencja/CDN/antywirus/limity katalogu nie są wymuszone kodem.
- Publiczne URL-e do uploadów wymagają jasnego rozdzielenia zdjęć publicznych od prywatnych dokumentów.

Rekomendacja:

- Utrzymać lokalny storage tylko jako dev/beta.
- Dla produkcji użyć S3-compatible/object storage z prywatnymi bucketami i CDN dla publicznych zdjęć.
- Dodać dokumentowaną politykę retencji i cleanup dla `public-submissions`.

### 6. Middleware weba jest przestarzałe i ma mylący komentarz

Kod: `apps/web/src/middleware.ts:11-29`.

Problem:

- Next 16 ostrzega, że konwencja `middleware` jest deprecated na rzecz `proxy`.
- Komentarz mówi o `localStorage`, ale auth działa przez cookie `accessToken`.
- Middleware finalnie nie chroni dashboardu, bo tylko czyta token i zawsze przepuszcza request; realna ochrona jest w `AuthProvider`/API.

Rekomendacja:

- Zdecydować: albo przenieść do `proxy` i użyć go tylko do UX redirectów, albo usunąć mylący middleware.
- Nie traktować tego jako security boundary. Security boundary powinno pozostać w API.

### 7. Brak testów frontendu

W `apps/web/src` nie znaleziono testów `*.test.*` ani `*.spec.*`. API ma 29 plików spec i 162 testy, web nie ma analogicznej siatki bezpieczeństwa.

Ryzyko:

- Krytyczne flow UI: auth, limity planu, upload zdjęć, publikacja oferty, publiczne zgłoszenia i billing upsell nie mają automatycznej regresji.
- Przy rosnącej liczbie funkcji frontend będzie podatny na regresje interakcji.

Rekomendacja:

- Dodać Playwright smoke tests dla:
  - login/register,
  - dashboard listings CRUD,
  - upload/edycja/usuwanie zdjęć,
  - publiczne dodanie oferty,
  - plan limit exceeded UX.
- Dodać małe testy komponentów/hooków dla walidacji formularzy i bulk-selection.

## Security/privacy observations

### Mocne strony

- Globalne guardy w API: `CsrfGuard`, `JwtAuthGuard`, `RolesGuard`, `ThrottlerGuard` w `apps/api/src/app.module.ts:72-78`.
- DTO validation z `whitelist`, `forbidNonWhitelisted`, `transform` w `apps/api/src/main.ts:25-30`.
- Uploady zdjęć i dokumentów sprawdzają nie tylko mimetype, ale też sygnatury plików (`common/image-upload-security.ts`, `common/document-upload-security.ts`).
- Billing webhook używa HMAC i `timingSafeEqual`.
- Auth cookie są `httpOnly`, `secure` w production i mają CSRF double-submit token.

### Rzeczy do dopięcia

- Zweryfikować, czy wszystkie publiczne endpointy mają adekwatny throttling i abuse protection. Część ma `@Throttle`, ale warto zrobić tabelę endpointów publicznych.
- Dodać monitoring błędów i alerty dla:
  - webhook billing failed,
  - plan limit enforcement failed,
  - upload validation rejected spike,
  - auth brute force / reset password spike.
- Uporządkować logi testów schedulerów, bo dziś expected-error stack traces mogą maskować realny błąd w CI.

## Medium priority / maintainability

### 8. Dużo planów w docs ma status TODO

Repo ma bardzo rozbudowaną dokumentację produktową i techniczną, ale część planów nadal zawiera checklisty `TODO`. To nie jest samo w sobie złe, ale przed release warto oddzielić:

- dokumenty historyczne,
- aktywny backlog,
- release blockers,
- nice-to-have.

Rekomendacja:

- Dodać jeden dokument `RELEASE_READINESS.md` jako źródło prawdy.
- Linkować z niego do planów szczegółowych zamiast utrzymywać wiele równorzędnych checklist.

### 9. Ostrzeżenia Next/React kumulują się

Pełny web lint pokazuje 14 warningów, m.in.:

- `@next/next/no-img-element` w wielu galeriach i publicznych stronach.
- nieużywane importy,
- missing deps w efektach,
- `jsx-a11y/role-has-required-aria-props` dla custom selecta.

Rekomendacja:

- Po naprawie błędów lint ustawić warning budget: nowe warningi nie powinny przybywać.
- Priorytetowo poprawić warning a11y dla selecta i missing deps w efektach.

## Rekomendowany plan napraw

### P0 - przed kolejnym większym merge/release

1. Naprawić `pnpm --filter web lint`.
2. Ustabilizować `pnpm --filter web build` przez lokalne fonty albo CI cache/network policy.
3. Naprawić API ESLint config i usunąć `--fix` z podstawowego `lint`.
4. Wyłączyć TypeORM `synchronize` domyślnie i sterować tym osobną zmienną.

### P1 - przed publicznym launch/beta z realnymi użytkownikami

1. Ustalić produkcyjny storage dla zdjęć i dokumentów.
2. Dodać Playwright smoke suite dla najważniejszych przepływów.
3. Dodać monitoring/alerty dla billing, limit enforcement, uploadów i auth.
4. Uporządkować middleware/proxy w Next 16.

### P2 - stabilizacja techniczna

1. Zredukować warningi lint i usunąć zbędne `eslint-disable`.
2. Zrobić release readiness checklist jako jeden dokument nadrzędny.
3. Rozważyć audyt publicznych endpointów i ich throttlingu.

## Stan końcowy przeglądu

Projekt nie wygląda jak "prototyp bez zabezpieczeń"; API ma już sporo dojrzałych mechanizmów. Największy problem to nie pojedyncza luka, tylko brak zielonego, powtarzalnego pipeline'u jakościowego dla web/build/lint oraz niedomknięte decyzje produkcyjne wokół storage i migracji DB.
