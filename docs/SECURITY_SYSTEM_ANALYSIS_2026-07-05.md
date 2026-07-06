# EstateFlow — analiza bezpieczeństwa systemu

Data analizy: 2026-07-05  
Zakres: `apps/api`, `apps/web`, konfiguracja uruchomieniowa, publiczne endpointy, auth, uploady, dane osobowe, admin/billing, dokumenty projektowe.

## Streszczenie

System ma solidne fundamenty bezpieczeństwa dla etapu MVP/beta: globalne guardy NestJS, walidację DTO, RBAC dla paneli administracyjnych, httpOnly cookies, CSRF dla requestów mutujących, throttling na publicznych formularzach, podpisane webhooki billingowe oraz walidację uploadów po MIME, rozszerzeniu i sygnaturze pliku.

Nie jest to jeszcze konfiguracja gotowa do publicznego produkcyjnego launchu bez dodatkowego utwardzenia. Najważniejsze braki to brak security headers/CSP/Helmet, brak stanowego refresh-token store z możliwością unieważniania sesji, lokalny storage uploadów jako domyślny model, brak skanowania plików, brak produkcyjnego Dockerfile/runtime oraz konieczność doprecyzowania monitoringu abuse i retencji danych.

## Ocena ogólna

Status: warunkowo OK dla kontrolowanej bety, nie OK jako finalny production hardening.

Priorytety:

| Priorytet | Obszar | Decyzja |
| --- | --- | --- |
| P0 | Sekrety, produkcyjne env, JWT_SECRET, CORS, HTTPS | Wymagane przed produkcją |
| P0 | Security headers API/Web, CSP, HSTS, frame protections | Wymagane przed produkcją |
| P1 | Refresh tokeny stanowe, rotacja i revoke | Wysokie ryzyko sesyjne |
| P1 | Produkcyjny storage uploadów + antymalware/transformacja obrazów | Wysokie ryzyko operacyjne |
| P1 | Monitoring auth, abuse, webhooków i anomalii | Wysokie ryzyko wykrywalności |
| P2 | Dalsze testy IDOR/ownership i rate-limit E2E | Zalecane przed szerszym rolloutem |

## Mocne strony

### Globalna ochrona API

- `apps/api/src/app.module.ts` rejestruje globalnie `CsrfGuard`, `JwtAuthGuard`, `RolesGuard` i `ThrottlerGuard`.
- `apps/api/src/main.ts` włącza `ValidationPipe` z `whitelist`, `forbidNonWhitelisted` i `transform`.
- `TypeOrmModule` ma `synchronize` zależne od jawnego `TYPEORM_SYNCHRONIZE`, a nie automatycznie od środowiska produkcyjnego.
- `JWT_SECRET` jest wymagany przez `getOrThrow`, więc API nie powinno startować bez sekretu JWT.

### Auth i sesje

- Tokeny auth są ustawiane jako `httpOnly` cookies.
- Cookies są `secure` w produkcji albo gdy `AUTH_COOKIE_SAME_SITE=none`.
- CSRF działa w modelu double-submit: przy auth cookie requesty mutujące wymagają zgodnego cookie i nagłówka `x-csrf-token`.
- Frontendowe helpery `apiFetch`, `apiFormDataFetch`, `apiBlobFetch` i auth flow dodają CSRF do metod mutujących oraz używają `credentials: include`.
- Hasła są hashowane przez bcrypt z kosztem 12.
- Reset hasła używa losowego tokenu, w bazie trzymany jest hash tokenu, a odpowiedź request resetu jest generyczna.

### Autoryzacja i role

- Prywatne endpointy są chronione globalnie, a publiczne muszą być świadomie oznaczone `@Public()`.
- Admin endpoints dla planów, agencji, analytics, feedbacku i moderacji są chronione przez `@Roles(UserRole.ADMIN)`.
- Parametry UUID w wielu krytycznych endpointach przechodzą przez `ParseUUIDPipe`.
- Publiczne slug URL-e są ograniczane przez `PublicSlugPipe`.

### Publiczne formularze i abuse

- Publiczne leady, submissiony, upload obrazów, resend verification i analytics mają throttling.
- Publiczne formularze mają mechanizmy honeypot, minimalny czas wypełniania, fingerprint IP i heurystyki treści.
- Publiczne submissiony korzystają z tokenów weryfikacji i claimowania, a tokeny są hashowane w bazie.
- Moderacja publicznych ofert ma scoring ryzyka i potrafi wymusić review.

### Uploady i pliki

- Uploady obrazów listingów i publicznych submissionów mają limity rozmiaru/liczby plików oraz walidację MIME, rozszerzenia i magic bytes.
- Upload dokumentów dopuszcza tylko PDF/JPG/PNG, limituje rozmiar do 15 MB i sprawdza sygnaturę pliku.
- Dokumenty listingów są obsługiwane jako zasoby prywatne i pobierane przez autoryzowany endpoint z `Content-Disposition: attachment`.
- Publiczne URL-e uploadów są budowane z walidacją segmentów ścieżki, co ogranicza path traversal.

### SQL injection i walidacja danych

- Dominują repozytoria TypeORM i query builder z parametryzacją.
- Dynamiczne sortowanie w sprawdzonych miejscach używa allowlist kolumn.
- Globalna walidacja DTO ogranicza nadmiarowe pola i wymusza transformację typów.

### Billing i webhooki

- Webhook billingowy jest publiczny, ale wymaga HMAC SHA-256 na podstawie `BILLING_WEBHOOK_SECRET`.
- Brak sekretu webhooka powoduje błąd konfiguracji zamiast akceptacji eventu.
- Istnieje encja eventów webhooków, co wspiera idempotencję i audyt.

## Najważniejsze ryzyka

### P0 — brak security headers i CSP

Stan:

- `apps/web/next.config.ts` nie definiuje nagłówków bezpieczeństwa.
- API nie używa `helmet`.
- Dokumenty projektu już wskazują ten temat jako pozycję launch checklist.

Ryzyko:

- Wyższa podatność skutków XSS, clickjackingu, MIME sniffingu i downgrade ruchu.
- Brak CSP utrudnia kontrolę skryptów, obrazów i zewnętrznych integracji.

Rekomendacja:

- Dodać Helmet do NestJS z konfiguracją `contentSecurityPolicy` albo świadomie delegować CSP do reverse proxy.
- Dodać nagłówki Next.js: `Content-Security-Policy`, `X-Frame-Options` albo `frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` na HTTPS.
- CSP wdrażać etapowo: najpierw `Content-Security-Policy-Report-Only`, potem enforcement.

### P0 — konfiguracja produkcyjna i sekrety

Stan:

- `.env.example` i `docker-compose.yml` są developerskie.
- Docker Compose ustawia przykładowy `JWT_SECRET`, hasło Postgres `postgres`, `NODE_ENV=development`.
- `Dockerfile.api` uruchamia `pnpm --filter api dev`.

Ryzyko:

- Przypadkowe uruchomienie konfiguracji developerskiej publicznie.
- Watch/dev server w kontenerze produkcyjnym zwiększa powierzchnię awarii i niekontrolowanych zachowań.

Rekomendacja:

- Przygotować osobne `.env.production.example` bez realnych sekretów, ale z wymogami długości i rotacji.
- Wymusić produkcyjny `JWT_SECRET` min. 256 bitów entropii.
- Dodać produkcyjny Dockerfile/runtime: build artefaktów, `NODE_ENV=production`, `pnpm --filter api start:prod`, brak mounted source.
- Ustawić `FRONTEND_URL` na dokładną domenę produkcyjną i nie dopuszczać wildcard CORS.

### P1 — refresh tokeny nie są stanowe

Stan:

- Access i refresh token są JWT podpisane tym samym `JWT_SECRET`.
- Refresh token nie jest przechowywany jako hash w bazie, nie ma `jti`, wersji sesji ani listy unieważnień.
- `logout` czyści cookie po stronie klienta, ale nie unieważnia tokenu po stronie serwera.

Ryzyko:

- Przejęty refresh token pozostaje ważny do czasu wygaśnięcia.
- Brak możliwości wymuszenia wylogowania konkretnej sesji po incydencie.
- Zmiana hasła nie unieważnia automatycznie wszystkich aktywnych refresh tokenów.

Rekomendacja:

- Dodać tabelę sesji/refresh tokenów: `id`, `userId`, `tokenHash`, `expiresAt`, `revokedAt`, `userAgent`, `ipHash`.
- Rotować refresh token przy każdym `/auth/refresh`.
- Unieważniać sesje przy zmianie hasła, dezaktywacji konta i podejrzanym zdarzeniu.
- Rozważyć osobny sekret dla access i refresh tokenów.

### P1 — publiczny/local storage uploadów

Stan:

- Lokalny storage jest domyślnym driverem.
- W produkcji lokalny storage jest blokowany, chyba że jawnie ustawiono `FILE_STORAGE_ALLOW_LOCAL_IN_PRODUCTION=true`.
- Publiczne uploady są serwowane przez `/uploads/*`.

Ryzyko:

- Lokalny storage utrudnia skalowanie, backupy, retencję i kontrolę dostępu.
- Brak skanowania antymalware.
- Obrazy nie są normalizowane/transkodowane, więc metadane EXIF i nietypowe payloady mogą przejść dalej.

Rekomendacja:

- Przed publicznym launch wdrożyć S3/R2 lub równoważny storage obiektowy.
- Dodać skanowanie plików albo kolejkę asynchroniczną z kwarantanną.
- Transkodować obrazy do bezpiecznego profilu i usuwać EXIF.
- Dodać lifecycle cleanup dla nieprzejętych public submission images.

### P1 — monitoring i alerting

Stan:

- Istnieją eventy analytics, activity logi i dokumenty monitoringowe, ale nie widać kompletnej technicznej konfiguracji alertów.

Ryzyko:

- Nadużycia publicznych formularzy, brute force loginów, błędy webhooków i anomalia uploadów mogą zostać wykryte z opóźnieniem.

Rekomendacja:

- Alerty dla: wzrostu 401/403/429, login failures per IP/email, password reset bursts, upload failures, public form spikes, invalid webhook signatures, admin plan changes.
- Logi bezpieczeństwa nie powinny zawierać haseł, tokenów ani pełnych danych wrażliwych.
- Dodać dashboard operacyjny albo przynajmniej gotowe zapytania dla incydentów.

### P1 — publiczne endpointy auth bez dedykowanego limitu login/register

Stan:

- Jest globalny throttling `30/min`.
- Reset hasła ma własne limity.
- `login` i `register` nie mają ostrzejszego limitu per endpoint.

Ryzyko:

- Globalny limit może być zbyt szeroki dla brute force loginów i credential stuffing.

Rekomendacja:

- Dodać osobne limity na `POST /auth/login` i `POST /auth/register`.
- Rozważyć licznik błędnych logowań per email/IP z krótkim cooldownem.
- Dodać alerty na nietypowe wzorce logowania.

### P2 — zgodność danych osobowych i retencja

Stan:

- System przetwarza dane kontaktowe leadów, klientów, sprzedających, agentów, adresy, IP hash, user agent i dokumenty ofert.
- Istnieją dokumenty legal/privacy i plan retencji, ale wymaga to operacyjnego domknięcia.

Ryzyko:

- Brak pełnej procedury DSAR/usunięcia/anonimizacji może być problemem przy publicznym ruchu.
- Dokumenty listingów mogą zawierać dane szczególnie wrażliwe operacyjnie.

Rekomendacja:

- Spisać realną retencję dla leadów, public submissions, documents, analytics, logs i inactive accounts.
- Dodać procedurę eksportu/usunięcia danych użytkownika oraz checklistę anonimizacji.
- Ograniczyć dostęp do dokumentów do minimalnych ról i dodać testy IDOR.

## Analiza modułowa

### Platforma i konfiguracja

Poziom ryzyka: wysoki przed produkcją.

Co działa:

- Globalne guardy i walidacja są włączone.
- CORS jest ograniczony do `FRONTEND_URL`.
- Brak automatycznego `synchronize` w produkcji, chyba że jawnie ustawiono env.

Ryzyka:

- Brak Helmet/security headers.
- Brak produkcyjnego Docker runtime.
- Konfiguracja developerska jest łatwa do pomylenia z produkcyjną.

### Auth, użytkownicy, role

Poziom ryzyka: średni/wysoki.

Co działa:

- Bcrypt 12, httpOnly cookies, CSRF, reset token hashing, generyczna odpowiedź resetu.
- Admin role są egzekwowane guardem.

Ryzyka:

- Refresh tokeny nie są stanowe.
- Login/register potrzebują ostrzejszego rate limiting.
- Brak pełnej obsługi globalnego wylogowania sesji po zmianie hasła.

### Listings, CRM i ownership

Poziom ryzyka: średni.

Co działa:

- Prywatne endpointy wymagają auth.
- Publiczne endpointy zwracają tylko opublikowane dane.
- UUID i slug są walidowane.
- Sortowanie jest allowlistowane w krytycznych listach.

Ryzyka:

- Warto utrzymywać testy IDOR dla każdego nowego endpointu zasobowego.
- Publiczne dane oferty muszą być stale porównywane z prywatnym modelem, żeby nie wyciekały pola CRM.

### Publiczne formularze, leady i sprzedający

Poziom ryzyka: średni/wysoki.

Co działa:

- Throttling, honeypot, timing, fingerprint, tokeny weryfikacji, abuse scoring.
- Publiczne uploady mają walidację plików.

Ryzyka:

- Brak automatycznej moderacji/queue dla każdego rodzaju abuse.
- Potrzebna procedura obsługi zgłoszeń i cleanup osieroconych uploadów.

### Dokumenty listingów

Poziom ryzyka: wysoki ze względu na charakter danych.

Co działa:

- Prywatne endpointy, autoryzowane pobieranie, attachment download.
- Walidacja PDF/JPG/PNG i limit 15 MB.

Ryzyka:

- Brak antymalware.
- Brak szyfrowania obiektów i polityki retencji widocznej w kodzie.
- Potrzebne testy, że dokumenty nigdy nie pojawiają się w publicznych odpowiedziach API.

### Blog i treści publiczne

Poziom ryzyka: średni.

Co działa:

- Frontend nie renderuje markdownu jako surowego HTML; używa własnego parsera React.
- JSON-LD przez `dangerouslySetInnerHTML` używa `JSON.stringify`, co jest typowym i akceptowalnym wzorcem.
- Backend usuwa część ryzykownych tagów i atrybutów.

Ryzyka:

- Sanitizer backendowy jest regexowy i nie powinien być traktowany jako pełny HTML sanitizer.
- Jeżeli kiedyś zostanie wprowadzony surowy HTML w blogu, należy użyć sprawdzonego sanitizera i CSP.

### Billing i admin

Poziom ryzyka: średni/wysoki.

Co działa:

- Admin endpointy mają RBAC.
- Webhook ma HMAC.
- Eventy webhooków są zapisywane.

Ryzyka:

- Zmiany planów i limitów są krytyczne biznesowo, więc powinny mieć pełny audit log, alert i opcjonalnie wymóg ponownego potwierdzenia dla operacji wysokiego wpływu.

## Checklist przed produkcją

### P0

- [ ] Dodać Helmet/security headers w API albo reverse proxy.
- [ ] Dodać security headers i CSP w Next.js.
- [ ] Przygotować produkcyjny Dockerfile/runtime dla API i Web.
- [ ] Usunąć dev sekrety z jakichkolwiek konfiguracji używanych poza lokalnym dev.
- [ ] Ustawić silny `JWT_SECRET`, `BILLING_WEBHOOK_SECRET`, hasła DB i rotację sekretów.
- [ ] Wymusić HTTPS, HSTS i produkcyjne `secure` cookies.
- [ ] Zweryfikować CORS tylko dla docelowej domeny.

### P1

- [ ] Wdrożyć stanowe refresh tokeny z rotacją i revoke.
- [ ] Dodać dedykowany rate limit i monitoring dla login/register.
- [ ] Wdrożyć produkcyjny storage obiektowy dla uploadów.
- [ ] Dodać antymalware albo pipeline kwarantanny dla dokumentów i uploadów publicznych.
- [ ] Transkodować obrazy i usuwać EXIF przed publikacją.
- [ ] Dodać lifecycle cleanup dla osieroconych uploadów.
- [ ] Skonfigurować alerty bezpieczeństwa i operacyjne dashboardy.

### P2

- [ ] Rozszerzyć testy IDOR/ownership dla listings, documents, leads, appointments, clients i admin flows.
- [ ] Doprecyzować retencję danych i procedury DSAR/usunięcia/anonimizacji.
- [ ] Dodać okresowy dependency audit w CI.
- [ ] Uzupełnić runbook incydentów: wyciek tokenu, spam formularzy, złośliwy upload, błędny webhook, przejęcie konta admina.

## Sugerowane testy bezpieczeństwa

- Auth: login brute force, reset password enumeration, refresh replay, logout/revoke behavior.
- CSRF: mutujące endpointy z auth cookie bez `x-csrf-token` powinny zwracać 403.
- IDOR: dostęp do cudzych listingów, dokumentów, leadów, klientów, appointmentów i seller submissions.
- RBAC: użytkownik `agent` i `viewer` nie mogą wejść w admin endpoints.
- Public API: public listing nie zwraca pól prywatnych, dokumentów, danych CRM ani nieopublikowanych ofert.
- Upload: fałszywe MIME, fałszywe rozszerzenie, zły magic bytes, oversize, wiele plików, path traversal w nazwie.
- Webhook: brak podpisu, zły podpis, replay eventu, brak sekretu w konfiguracji.
- Headers: CSP, HSTS, frame protections, MIME nosniff i referrer policy w środowisku staging.

## Wniosek

Architektura bezpieczeństwa jest sensowna i świadomie prowadzona, szczególnie jak na produkt SaaS w fazie rozbudowy. Największy problem nie leży w pojedynczej luce typu natychmiastowy wyciek danych, tylko w braku produkcyjnego hardeningu operacyjnego: nagłówki, sesje stanowe, storage, monitoring i runtime. Po domknięciu pozycji P0 i P1 system będzie miał dużo mocniejszą bazę do publicznego rollout’u.
