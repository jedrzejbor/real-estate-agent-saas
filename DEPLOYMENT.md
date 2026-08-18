# Deployment i CI/CD dla PodAdresem24

Ten dokument opisuje praktyczny plan uruchomienia testowego/stagingowego projektu pod domena `podadresem24.pl`.

Stan repozytorium na dzis:

- monorepo: Turborepo + pnpm
- frontend: `apps/web`, Next.js 16, React, TypeScript, Tailwind CSS, shadcn/ui
- backend: `apps/api`, NestJS 11, TypeORM, PostgreSQL
- lokalny runtime: `docker-compose.yml` z PostgreSQL, Mailpit, API i web
- migracje: pliki SQL w `apps/api/migrations`
- storage: aktualnie tylko lokalny adapter plikow; produkcyjny S3/R2/Supabase Storage wymaga osobnej implementacji adaptera

## Rekomendowany setup na test/staging

Najprostszy, czysty wariant na start:

| Element | Rekomendacja |
|---|---|
| Domena | `podadresem24.pl`, kupiona w OVHcloud |
| DNS | Cloudflare |
| Frontend | Vercel, projekt z rootem `apps/web` |
| Backend API | Railway albo Render, najlepiej z Dockerfile albo komenda Node |
| Baza danych | Neon albo Supabase PostgreSQL |
| Storage plikow | Cloudflare R2 albo Supabase Storage, po dodaniu adaptera w API |
| Email SMTP | Resend, Brevo, Mailgun, SMTP OVH lub inny provider transakcyjny |
| CI/CD | GitHub Actions + integracje providerow |

Na tym etapie publiczny portal i panel agenta moga zostac w jednej aplikacji Next.js. Docelowo domeny powinny byc rozdzielone logicznie:

```txt
podadresem24.pl      -> public portal / landing / katalog ofert
www.podadresem24.pl  -> redirect do podadresem24.pl
app.podadresem24.pl  -> panel agenta
api.podadresem24.pl  -> backend API
```

## Srodowiska

| Srodowisko | Cel | Przykladowe URL |
|---|---|---|
| `local` | development na komputerze | `http://localhost:3000`, `http://localhost:4000/api` |
| `preview` | pull requesty | URL-e generowane przez Vercel/provider backendu |
| `staging` / `test` | aktualny test dla wlasciciela projektu | `https://podadresem24.pl`, `https://app.podadresem24.pl`, `https://api.podadresem24.pl` |
| `production` | przyszli realni uzytkownicy | osobne zasoby, osobna baza, osobne sekrety |

Na teraz wdrazamy tylko `staging/test`.

## DNS w Cloudflare

1. Dodaj domene `podadresem24.pl` do Cloudflare.
2. W OVHcloud ustaw nameservery podane przez Cloudflare.
3. Poczekaj na aktywacje domeny w Cloudflare.
4. Dodaj rekordy DNS zgodnie z wartosciami podanymi przez Vercel i backend provider.

Nie wpisuj na sztywno losowych targetow DNS. Vercel, Railway, Render albo Fly.io podadza dokladne rekordy.

| Host | Typ rekordu | Cel |
|---|---|---|
| `podadresem24.pl` | `A` / `CNAME` wedlug Vercel | frontend publiczny |
| `www.podadresem24.pl` | `CNAME` wedlug Vercel | redirect lub alias frontendu |
| `app.podadresem24.pl` | `CNAME` wedlug Vercel | panel agenta w tej samej aplikacji Next.js |
| `api.podadresem24.pl` | `CNAME` / `A` wedlug backend providera | NestJS API |

Dla maili dodaj osobno rekordy `MX`, `SPF`, `DKIM` i `DMARC` podane przez dostawce SMTP.

## Frontend na Vercel

1. Polacz repozytorium GitHub z Vercel.
2. Utworz projekt dla frontendu.
3. Ustaw:

```txt
Root Directory: apps/web
Framework: Next.js
Install Command: cd ../.. && pnpm install --frozen-lockfile
Build Command: cd ../.. && pnpm --filter web build
Output: domyslne dla Next.js
Node.js: 20+
```

4. Dodaj domeny:

```txt
podadresem24.pl
www.podadresem24.pl
app.podadresem24.pl
```

5. Dodaj zmienne srodowiskowe w Vercel:

```env
NEXT_PUBLIC_APP_URL=https://podadresem24.pl
NEXT_PUBLIC_AGENT_APP_URL=https://app.podadresem24.pl
NEXT_PUBLIC_API_URL=https://api.podadresem24.pl/api
```

Uwaga: w obecnym frontendzie kluczowa zmienna to `NEXT_PUBLIC_API_URL`. Dodatkowe URL-e aplikacji sa przygotowane pod routing i przyszly podzial domen.

## Backend API

Najprostszy wariant testowy: Railway albo Render.

Backend musi uruchamiac NestJS z `apps/api`:

```bash
pnpm install --frozen-lockfile
pnpm --filter api build
pnpm --filter api start:prod
```

Port powinien pochodzic ze zmiennej `PORT`. API ustawia globalny prefix `/api`, wiec publiczny endpoint zdrowia/zasobow bedzie pod `https://api.podadresem24.pl/api/...`.

### Zmienne backendu

W providerze backendu ustaw minimum:

```env
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://podadresem24.pl
DB_HOST=
DB_PORT=5432
DB_USERNAME=
DB_PASSWORD=
DB_NAME=
JWT_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
AUTH_COOKIE_SAME_SITE=none
EMAIL_PROVIDER=smtp
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM="PodAdresem <noreply@podadresem24.pl>"
FILE_STORAGE_DRIVER=local
FILE_STORAGE_ALLOW_LOCAL_IN_PRODUCTION=true
FILE_STORAGE_LOCAL_PUBLIC_ROOT=uploads
FILE_STORAGE_LOCAL_PRIVATE_ROOT=private-uploads
FILE_STORAGE_PUBLIC_BASE_URL=https://api.podadresem24.pl
BILLING_WEBHOOK_SECRET=
GEOCODING_PROVIDER=
GEOCODING_API_KEY=
```

`AUTH_COOKIE_SAME_SITE=none` jest potrzebne, gdy frontend i API sa na roznych subdomenach. W `NODE_ENV=production` cookie beda `secure`.

Wazne ograniczenie: kod ciasteczek nie ustawia obecnie `COOKIE_DOMAIN=.podadresem24.pl`. Przy `app.podadresem24.pl` -> `api.podadresem24.pl` cookie ustawione przez API powinny dzialac jako host-only dla `api.podadresem24.pl` przy requestach `credentials: include`, ale jezeli panel ma czytac cookie CSRF z domeny aplikacji, moze byc potrzebna mala zmiana w backendzie: dodanie obslugi `AUTH_COOKIE_DOMAIN`.

## Baza PostgreSQL

Projekt uzywa TypeORM i osobnych zmiennych `DB_*`. Obecnie nie ma obslugi `DATABASE_URL` w `apps/api/src/app.module.ts`.

1. Utworz baze w Neon albo Supabase.
2. Skopiuj connection string.
3. Rozbij go na:

```txt
DB_HOST
DB_PORT
DB_USERNAME
DB_PASSWORD
DB_NAME
```

4. Dodaj te zmienne w backend providerze.
5. Nie wlaczaj `TYPEORM_SYNCHRONIZE=true` na staging/production.
6. Uruchom migracje SQL z katalogu `apps/api/migrations`.

Na teraz w repo nie ma skryptu typu `pnpm --filter api migration:run`. Dopoki go nie dodamy, migracje trzeba wykonac narzedziem providera albo `psql`:

```bash
psql "$DATABASE_URL" -f apps/api/migrations/20260429_freemium_public_listings_and_analytics.sql
```

Uruchamiaj pliki w kolejnosci chronologicznej. Przed automatyzacja migracji w CI warto dodac techniczna tabele historii migracji albo przejsc na oficjalny runner TypeORM migrations.

## Storage plikow

Aplikacja przechowuje:

- zdjecia ofert
- dokumenty nieruchomosci/transakcji
- logotypy agencji
- avatary agentow

Docelowy podzial bucketow:

```txt
listing-images       -> publiczne albo signed URLs
property-documents   -> prywatne, nigdy publiczne
agency-assets        -> publiczne albo signed URLs
user-avatars         -> publiczne albo signed URLs
```

Rekomendacja:

- `listing-images`: publiczne na start, bo ulatwia SEO, Open Graph i szybkie renderowanie kart ofert.
- `property-documents`: zawsze prywatne, dostep tylko przez backend po autoryzacji.
- `agency-assets` i `user-avatars`: publiczne, jesli nie zawieraja danych wrazliwych.

Aktualny kod wspiera tylko `FILE_STORAGE_DRIVER=local`. W `NODE_ENV=production` lokalny storage jest blokowany, chyba ze ustawisz `FILE_STORAGE_ALLOW_LOCAL_IN_PRODUCTION=true`. To jest akceptowalne tylko dla kontrolowanej bety, bo pliki moga zniknac przy redeployu providera albo nie skalowac sie na wiele instancji.

Przed publicznym launchem trzeba dodac adapter S3/R2/Supabase Storage w `apps/api/src/common/file-storage.config.ts` i miejscach uploadu.

## Email SMTP

Do testow potrzebujesz prawdziwego providera SMTP. Mailpit z `docker-compose.yml` jest tylko lokalny.

Minimalne zmienne:

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM="PodAdresem <noreply@podadresem24.pl>"
```

Po stronie DNS dodaj rekordy `SPF`, `DKIM` i `DMARC`, inaczej maile resetu hasla i powiadomienia moga trafiac do spamu.

## GitHub Actions

W repo sa przygotowane dwa workflowy:

- `.github/workflows/pr-checks.yml` - kontrola pull requestow
- `.github/workflows/deploy.yml` - walidacja i opcjonalny deployment staging z GitHub Actions

### Pull request checks

Na kazdym PR workflow:

```txt
pnpm install --frozen-lockfile
pnpm lint
pnpm type-check
pnpm --filter api test
pnpm build
```

### Deployment z main

Rekomendacja praktyczna:

- frontend: pozwol Vercel robic automatyczne preview i deployment po pushu do `main`
- backend: uzyj natywnego auto-deploy providera albo deploy hooka
- GitHub Actions: niech najpierw robi lint/typecheck/test/build, a dopiero potem odpala deploy hooki

Workflow `deploy.yml` jest przygotowany tak, aby:

1. uruchomic walidacje,
2. opcjonalnie deployowac frontend przez Vercel CLI, jesli ustawisz sekrety Vercel,
3. opcjonalnie odpalic backend deploy hook, jesli ustawisz sekret backendu,
4. nie uruchamiac migracji automatycznie, dopoki nie ma bezpiecznego runnera migracji.

## Wymagane GitHub Secrets

Minimalnie dla samego CI nie potrzebujesz sekretow.

Dla deploymentu z GitHub Actions:

| Secret | Kiedy potrzebny | Opis |
|---|---|---|
| `VERCEL_TOKEN` | gdy GitHub Actions deployuje frontend | token Vercel |
| `VERCEL_ORG_ID` | gdy GitHub Actions deployuje frontend | ID organizacji/teamu Vercel |
| `VERCEL_PROJECT_ID` | gdy GitHub Actions deployuje frontend | ID projektu Vercel |
| `BACKEND_DEPLOY_HOOK_URL` | gdy backend provider ma deploy hook | URL hooka Railway/Render/Fly/innego providera |
| `STAGING_DATABASE_URL` | tylko do recznych/bezpiecznych migracji | connection string staging DB, nieuzywany automatycznie w aktualnym workflow |

Sekrety aplikacji ustawiaj przede wszystkim w panelach Vercel/backend providera, nie w repo.

## Deployment flow po pushu do main

1. Developer robi PR.
2. `pr-checks.yml` sprawdza lint, typecheck, testy API i build.
3. Po merge do `main` uruchamia sie `deploy.yml`.
4. Jesli walidacja przejdzie:
   - Vercel GitHub Integration albo Vercel CLI deployuje frontend,
   - backend provider robi auto-deploy albo dostaje deploy hook,
   - migracje SQL wykonujesz kontrolowanie przed/po deployu backendu.
5. Po wdrozeniu sprawdzasz:
   - `https://podadresem24.pl`
   - `https://app.podadresem24.pl`
   - `https://api.podadresem24.pl/api`

## Preview deployments dla PR

Frontend:

- Vercel automatycznie tworzy preview deployment dla pull requestow.
- Dla preview ustaw `NEXT_PUBLIC_API_URL` na staging API albo osobne preview API.

Backend:

- Railway/Render moga tworzyc preview environments, ale na start nie jest to konieczne.
- Najprosciej: PR preview frontendu laczy sie ze staging API.

## Komendy lokalne

```bash
pnpm install
pnpm lint
pnpm type-check
pnpm --filter api test
pnpm build
docker compose up --build
```

Adresy lokalne:

```txt
web: http://localhost:3000
api: http://localhost:4000/api
mailpit: http://localhost:8025
postgres: localhost:5433 z docker-compose.yml
```

## Checklist przed otwarciem testowej aplikacji

- [ ] Domena `podadresem24.pl` jest aktywna w Cloudflare.
- [ ] Rekordy DNS wskazuja na Vercel i backend provider.
- [ ] Vercel ma ustawione `NEXT_PUBLIC_API_URL=https://api.podadresem24.pl/api`.
- [ ] Backend ma ustawione produkcyjne `DB_*`.
- [ ] Backend ma mocny `JWT_SECRET`.
- [ ] `TYPEORM_SYNCHRONIZE` nie jest wlaczone.
- [ ] Migracje SQL zostaly uruchomione na staging DB.
- [ ] SMTP dziala i domena ma SPF/DKIM/DMARC.
- [ ] CORS jest ograniczony do prawdziwych domen.
- [ ] Upload dokumentow nie jest publiczny.
- [ ] Backup bazy jest wlaczony.
- [ ] Jest plan odzyskania plikow ze storage.

## Bezpieczenstwo testowego srodowiska

- Uzywaj mocnych sekretow, generowanych losowo.
- Nigdy nie commituj `.env`, `.env.local` ani connection stringow.
- GitHub Secrets trzymaj tylko w GitHub, a runtime secrets w panelach providerow.
- Lokalna, stagingowa i przyszla produkcyjna baza musza byc osobne.
- CORS powinien dopuszczac tylko:

```txt
https://podadresem24.pl
https://www.podadresem24.pl
https://app.podadresem24.pl
```

- Dokumenty nieruchomosci/transakcji nigdy nie powinny byc w publicznym buckecie.
- Publiczne zdjecia ofert moga byc publiczne, ale jesli wlasciciel oferty oczekuje prywatnosci przed publikacja, uzyj signed URLs.
- Rate limiting jest juz wlaczony globalnie przez `@nestjs/throttler`, ale auth/uploady warto dodatkowo obserwowac i docelowo wzmacniac.
- Dodaj monitoring bledow, np. Sentry, przed szerszym testem z uzytkownikami.

## Backupy

Minimum dla staging:

- codzienny backup PostgreSQL u providera
- snapshot bazy przed migracjami
- backup/snapshot backend VPS, jesli uzywasz VPS
- wersjonowanie bucketow storage dla dokumentow
- osobny backup prywatnych dokumentow

Przed produkcja:

- test odtworzenia backupu
- retencja minimum 7-30 dni
- monitoring nieudanych backupow

## Troubleshooting

### Frontend nie laczy sie z API

Sprawdz:

- czy `NEXT_PUBLIC_API_URL` zawiera `/api`
- czy API jest dostepne publicznie
- czy CORS w backendzie dopuszcza domeny frontendu
- czy requesty auth ida z `credentials: include`

### Cookie logowania nie dziala

Sprawdz:

- `NODE_ENV=production`
- `AUTH_COOKIE_SAME_SITE=none` dla roznych subdomen
- HTTPS na frontendzie i API
- czy przegladarka nie blokuje third-party cookies w danym scenariuszu
- czy nie trzeba dodac obslugi `AUTH_COOKIE_DOMAIN=.podadresem24.pl`

### Backend nie startuje na produkcji

Najczestsze powody:

- brak zmiennych `DB_*`
- lokalny storage zablokowany przez `NODE_ENV=production`
- brak `FILE_STORAGE_ALLOW_LOCAL_IN_PRODUCTION=true` w kontrolowanej becie
- bledny port albo provider wymaga sluchania na `process.env.PORT`

### Baza jest pusta albo tabele nie istnieja

Sprawdz:

- czy migracje SQL zostaly uruchomione
- czy backend laczy sie z wlasciwa baza staging
- czy `TYPEORM_SYNCHRONIZE` nie jest wylaczone lokalnie, gdy oczekujesz automatycznego tworzenia tabel w dev

### Uploady nie dzialaja

Sprawdz:

- `FILE_STORAGE_DRIVER`
- `FILE_STORAGE_LOCAL_PUBLIC_ROOT`
- `FILE_STORAGE_LOCAL_PRIVATE_ROOT`
- `FILE_STORAGE_PUBLIC_BASE_URL`
- czy backend ma zapis do katalogow uploadu
- czy nie uzywasz efemerycznego filesystemu providera, ktory kasuje pliki po redeployu

## Rekomendowane kolejne kroki techniczne

1. Dodac obsluge `DATABASE_URL` w TypeORM config.
2. Dodac jawny skrypt migracji, np. `pnpm --filter api db:migrate`.
3. Dodac adapter S3/R2/Supabase Storage.
4. Dodac `AUTH_COOKIE_DOMAIN` dla stabilnej pracy na subdomenach.
5. Dodac healthcheck endpoint, np. `GET /api/health`.
6. Dodac Sentry albo inne error monitoring.
