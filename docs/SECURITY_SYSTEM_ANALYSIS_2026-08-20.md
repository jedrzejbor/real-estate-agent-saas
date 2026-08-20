# Analiza bezpieczeństwa systemu - 2026-08-20

Status: notatka do wglądu po zakończeniu bieżącego zadania. Ten dokument opisuje ryzyka i rekomendowaną kolejność poprawek. Nie oznacza, że poprawki zostały już wdrożone.

## Wniosek ogólny

System ma sensowne fundamenty bezpieczeństwa, ale nie jest jeszcze gotowy na produkcyjne wystawienie bez zamknięcia kilku krytycznych tematów. Najpilniejsze obszary to: eskalacja planu podczas rejestracji, podatność stored XSS przez JSON-LD, rozmyta granica ról, błędne rozróżnienie tokenów JWT, publiczny upload plików oraz zależności z podatnościami.

## Priorytety

| Priorytet | Obszar | Ryzyko |
| --- | --- | --- |
| P0 | Plan/subskrypcja przy rejestracji | Użytkownik może sam nadać sobie płatny plan, w tym enterprise. |
| P0 | JSON-LD / stored XSS | Treść użytkownika może trafić do `dangerouslySetInnerHTML` w skrypcie JSON-LD. |
| P0/P1 | Zależności | `next`, `multer`, `@nestjs/core`, `typeorm`, `nodemailer` i zależności transitive mają podatności z audytu. |
| P1 | Role i autoryzacja | Użytkownik `VIEWER` technicznie dostaje `Agent` i może wejść w część CRM. |
| P1 | JWT / sesje | Refresh token może być zaakceptowany jako bearer access token. Brakuje revokacji sesji. |
| P1 | Publiczny upload | Niezalogowany użytkownik może generować duży koszt pamięci/dysku i osierocone pliki. |
| P1 | Rate limiting i IP trust | Limitowanie jest lokalne/in-memory, a część logiki ufa `x-forwarded-for`. |
| P1 | Nagłówki i konfiguracja produkcyjna | Brakuje Helmet/CSP/HSTS/env validation i produkcyjnych Dockerfile. |
| P1/P2 | Prywatność i retencja danych | Soft delete i lokalne pliki utrudniają zgodność z retencją/RODO. |

## Najważniejsze problemy i poprawki

## 1. P0 - Eskalacja planu/subskrypcji przy rejestracji

Dowody:

- `apps/api/src/auth/dto/register.dto.ts` dopuszcza `selectedPlan` jako `free`, `starter`, `professional`, `enterprise`.
- `apps/api/src/auth/auth.service.ts` przekazuje `selectedPlan` jako `initialPlan`.
- `apps/api/src/users/users.service.ts` tworzy agencję z `plan: params.initialPlan` i `subscription: ACTIVE`.
- Plan `enterprise` ma nielimitowane funkcje/limity.

Ryzyko:

Niezalogowany użytkownik może zarejestrować konto z planem płatnym lub enterprise bez płatności.

Poprawki:

- Serwer powinien zawsze tworzyć konto w planie `FREE` albo kontrolowanym `TRIAL`.
- `selectedPlan` z formularza traktować wyłącznie jako intencję checkoutu, nie jako źródło prawdy.
- Aktywację planu płatnego wykonywać tylko przez podpisany webhook billingowy albo akcję admina.
- Dodać audyt istniejących agencji z płatnym planem bez billing/customer/subscription ID.
- Dodać test: public register z `selectedPlan=enterprise` kończy się planem `FREE` albo checkout intentem, ale nie aktywnym enterprise.

## 2. P0 - Stored XSS przez JSON-LD

Dowody:

- `apps/web/src/app/(public)/oferty/[slug]/page.tsx` używa `dangerouslySetInnerHTML` dla `application/ld+json`.
- JSON-LD zawiera pola kontrolowane przez użytkownika: tytuł, opis, adres.
- `apps/web/src/app/(public)/agenci/[id]/page.tsx` ma analogiczny wzorzec dla profilu agenta i ofert.
- `JSON.stringify` nie zabezpiecza przed sekwencją zamykającą tag `<script>`.

Ryzyko:

Atakujący może zapisać treść, która po publikacji wykona JavaScript w przeglądarce użytkownika.

Poprawki:

- Dodać wspólny serializer JSON-LD, który escapuje co najmniej `<`, `>`, `&`, U+2028 i U+2029.
- Zastąpić wszystkie bezpośrednie `JSON.stringify(jsonLd)` w `dangerouslySetInnerHTML`.
- Dodać test regresyjny dla wartości zawierającej `</script><script>...`.
- Dodać CSP jako warstwę obrony, ale nie traktować CSP jako właściwej naprawy.
- Przeskanować istniejące opublikowane dane pod kątem podejrzanych sekwencji.

## 3. P1 - Role i granica autoryzacji

Dowody:

- Rejestracja prywatnego sprzedającego ustawia rolę `VIEWER`, ale `UsersService.create` nadal tworzy rekord `Agent` i `Agency`.
- Większość kontrolerów CRM ma globalny `JwtAuthGuard`, ale nie ma jawnego `@Roles`.
- Serwisy często autoryzują dostęp przez obecność agenta/agencji, co działa również dla `VIEWER`.

Ryzyko:

Prywatny sprzedający może uzyskać dostęp do części funkcji CRM w swoim workspace, mimo że model produktu sugeruje oddzielenie ról.

Poprawki:

- Dodać klasowe `@Roles` do kontrolerów agentowych: listings, clients, appointments, transactions, tasks, dashboard, reports, search itd.
- Dodać osobny model uprawnień dla sprzedającego prywatnego zamiast traktowania go jak agenta.
- Nie używać samego istnienia rekordu `Agent` jako dowodu uprawnienia.
- Dodać test matrix: role kontra kontrolery, z zasadą default deny.

## 4. P1 - JWT, refresh token i sesje

Dowody:

- Access token i refresh token są podpisywane tym samym sekretem i zawierają taki sam payload.
- Strategie access i refresh weryfikują ten sam `JWT_SECRET`.
- Brakuje `typ`, `aud`, `iss`, `jti` i backendowej tabeli sesji.
- Logout usuwa cookie, ale nie unieważnia tokena po stronie serwera.

Ryzyko:

Skradziony refresh token może działać jako bearer access token nawet przez 7 dni. Trudno też wymusić wylogowanie po zmianie hasła, resecie albo dezaktywacji.

Poprawki:

- Rozdzielić typy tokenów przez `typ=access|refresh` oraz walidację w strategiach.
- Dodać `aud`, `iss`, `jti`.
- Rozważyć osobne sekrety/klucze dla access i refresh.
- Dodać tabelę sesji z hashem refresh tokena, rotacją i wykrywaniem reuse.
- Unieważniać sesje przy logout, zmianie/resetowaniu hasła i dezaktywacji konta.
- Usunąć albo mocno ograniczyć legacy `x-refresh-token`.

## 5. P1 - Publiczny upload i DoS przez pliki

Dowody:

- Publiczny endpoint uploadu dopuszcza 15 plików po 10 MB.
- Pliki są obsługiwane przez `file.buffer`, czyli w pamięci procesu.
- Upload może zostawiać osierocone pliki na lokalnym storage.
- URL-e obrazów w DTO są głównie stringami, bez ścisłej walidacji hosta.

Ryzyko:

Niezalogowany atakujący może zużyć pamięć procesu, dysk albo dodać zewnętrzne URL-e śledzące/hotlinkujące.

Poprawki:

- Obniżyć limity count/size albo tymczasowo ograniczyć publiczny upload release flagą.
- Dodać limit całego body na edge/proxy.
- Przenieść upload na object storage z presigned URL i streamingiem.
- Związać `assetId` z sesją/submission, żeby plik bez zgłoszenia był czyszczony.
- Dodać allowlist hosta dla URL-i obrazów.
- Dodać skanowanie malware, stripping EXIF, transkodowanie i cleanup osieroconych assetów.

## 6. P1 - Rate limiting, proxy i abuse protection

Dowody:

- Globalny throttler jest in-memory i lokalny dla instancji.
- Logika abuse protection ufa pierwszemu `x-forwarded-for`.
- Brakuje jawnej konfiguracji `trust proxy`.
- Login/register opierają się głównie na globalnym limicie.

Ryzyko:

Limity mogą być omijane przez spoofing nagłówków albo rozmyte przy wielu instancjach. Login może być kosztowny przez bcrypt i podatny na credential stuffing.

Poprawki:

- Skonfigurować dokładne zaufane proxy/hopy i używać `request.ip`.
- Przenieść throttling do Redis albo innego współdzielonego store.
- Dodać limity per endpoint, per konto/email i per IP.
- Dodać CAPTCHA lub step-up po progu nadużyć.
- Dodać dummy bcrypt compare i mniej rozróżniające komunikaty dla przypadków loginu.

## 7. P0/P1 - Podatne zależności

Wynik `pnpm audit --prod --json`:

- 42 high
- 56 moderate
- 8 low
- 0 critical

Najważniejsze paczki:

- `next@16.2.2` - liczne high advisories; cel minimum `>=16.2.11`.
- `@nestjs/core@11.1.17` - advisory naprawione w `>=11.1.18`.
- `multer@2.1.1` - DoS, cel `>=2.2.0`.
- `typeorm@0.3.28` - cel `>=0.3.31`.
- `nodemailer@6.10.1` - kilka advisories, wymaga kontrolowanej aktualizacji i testów maili.
- `shadcn` jest w production dependencies frontendu i ściąga duże drzewo narzędziowe; powinien być devDependency albo zostać usunięty z runtime.

Poprawki:

- Najpierw zaktualizować `next`.
- Następnie podnieść Nest/Multer/TypeORM i odświeżyć lockfile.
- Przenieść/usunąć `shadcn` z production dependencies.
- Zaktualizować `nodemailer` po sprawdzeniu kompatybilności.
- Włączyć Dependabot/Renovate i CI audit z polityką blokowania reachable high/critical.

## 8. P1 - Nagłówki bezpieczeństwa i konfiguracja produkcyjna

Dowody:

- API nie używa Helmet.
- `next.config.ts` nie definiuje nagłówków bezpieczeństwa.
- Brakuje CSP, HSTS, `frame-ancestors`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- `ConfigModule` nie ma walidacji zmiennych środowiskowych.
- Dockerfile uruchamiają tryb dev i najpewniej działają jako root.

Ryzyko:

Brak defense-in-depth, większa podatność na XSS/clickjacking/misconfig oraz ryzyko przypadkowego deploya konfiguracji developerskiej.

Poprawki:

- Dodać Helmet w API.
- Dodać nagłówki bezpieczeństwa w Next/edge.
- Wdrożyć CSP najpierw w `report-only`, potem enforce.
- Dodać walidację env z fail-fast.
- Odrzucać krótkie/placeholders dla `JWT_SECRET`.
- Wymagać DB TLS i poprawnych URL-i w produkcji.
- Przepisać Dockerfile na produkcyjne multi-stage, non-root, prod deps only, `start:prod`.
- Nie deployować developerskiego `docker-compose`.

## 9. P1/P2 - Prywatność, dokumenty i retencja

Dowody:

- Dokumenty mają sensowną walidację MIME/magic bytes, ale są przechowywane lokalnie.
- Usunięcie dokumentów wygląda na soft delete w bazie, bez fizycznego usuwania pliku.
- Usunięcie konta dezaktywuje użytkownika, ale nie realizuje pełnego procesu retencji/usunięcia danych.

Ryzyko:

Problem z retencją, żądaniami DSAR/RODO, backupami i oczekiwaniami użytkownika wobec przycisku "usuń konto".

Poprawki:

- Zdefiniować politykę retencji per typ danych.
- Rozdzielić "dezaktywuj konto" od "usuń dane".
- Dodać proces anonimizacji/usuwania danych i plików.
- Szyfrować prywatne pliki w storage.
- Dodać audyt pobrań i dostępu do dokumentów.
- Ograniczyć PII w logach.

## Mocne strony obecnego systemu

- Globalny domyślny `JwtAuthGuard`.
- `RolesGuard` istnieje i jest używany w części modułów.
- Globalny `ValidationPipe` z `whitelist`, `forbidNonWhitelisted`, `transform`.
- Hasła hashowane przez bcrypt 12.
- Tokeny resetu/claim/verification są hashowane.
- Walidacja JWT ponownie ładuje użytkownika i odrzuca nieaktywne konta.
- Cookies są `HttpOnly` i `Secure` w produkcji.
- Jest CSRF guard.
- Publiczny widok oferty ukrywa dokładny adres, jeśli nie ma opt-in.
- Upload dokumentów sprawdza MIME, rozszerzenie i magic bytes.
- Billing webhook używa HMAC i `timingSafeEqual`.
- Lokalny storage jest blokowany w produkcji bez jawnego override.
- Skan podstawowych sekretów nie pokazał oczywistych sekretów w repo.

## Testy wykonane podczas analizy

Uruchomiono:

```bash
pnpm --filter api test -- --runInBand auth.service csrf.guard billing-webhooks document-upload-security listing-public-privacy public-listing-submissions
```

Wynik:

- 7 suite passed
- 68 tests passed

Luki testowe:

- Brak testu eskalacji planu przez `selectedPlan`.
- Brak testu stored XSS w JSON-LD.
- Brak pełnej macierzy ról kontra kontrolery.
- Brak testów rozróżniających access token i refresh token.

## Rekomendowana kolejność prac

1. Naprawić eskalację planu przy rejestracji.
2. Naprawić JSON-LD serializer i dodać test XSS.
3. Zaktualizować krytyczne zależności, szczególnie `next`.
4. Rozdzielić access/refresh JWT i dodać sesje/revokację.
5. Uszczelnić role na kontrolerach CRM i seller.
6. Ograniczyć publiczny upload oraz przejść na storage z kontrolą assetów.
7. Przenieść throttling do współdzielonego store i poprawić IP trust.
8. Dodać Helmet, CSP, HSTS i walidację env.
9. Przygotować produkcyjne Dockerfile i konfigurację deploy.
10. Dodać politykę retencji, DSAR i fizyczne usuwanie/anonimizację danych.

## Uwaga operacyjna

Podczas analizy repo miało już istniejące lokalne zmiany w wielu plikach. Ta notatka nie opisuje implementacji ani nie zastępuje bieżącego taska. Ma służyć jako backlog bezpieczeństwa do realizacji po zakończeniu aktualnej pracy.
