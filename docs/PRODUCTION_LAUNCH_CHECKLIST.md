# Checklist produkcyjnego launchu — rynek polski

> Data: 3 czerwca 2026  
> Cel: Kompletna lista wszystkiego co trzeba przygotować przed publicznym uruchomieniem aplikacji na rynku polskim.

---

## Priorytety ogólne

- 🔴 **BLOCKER** — bez tego nie można launchować
- 🟠 **WAŻNE** — powinno być gotowe przed launch, ryzykowne bez tego
- 🟡 **ZALECANE** — warto mieć, ale nie blokuje startu
- 🟢 **OPCJONALNE** — nice to have, można zrobić po launch

---

## 1. Infrastruktura i hosting

### Serwer i domeny

> **Decyzja (3.06.2026):** VPS Linux na **home.pl**, min. 4 GB RAM / 2 vCPU / 40 GB SSD, system Ubuntu 22.04 LTS.

- [ ] 🔴 Wykupić VPS na home.pl (min. 4 GB RAM, Ubuntu 22.04 LTS)
- [ ] 🔴 Wykupić domenę produkcyjną na home.pl (np. `estateflow.pl`) lub przenieść z innego rejestratora
- [ ] 🔴 Skonfigurować DNS w panelu home.pl: A record → IP serwera, MX → skrzynki email
- [ ] 🔴 Certyfikat SSL/TLS — Certbot + Let's Encrypt (bezpłatny), odnawiany automatycznie
- [ ] 🔴 Nginx jako reverse proxy (port 80/443 → kontenery Docker na portach 3000/4000)
- [ ] 🟠 Cloudflare przed domeną — darmowy CDN, DDoS protection, cache statycznych plików
- [ ] 🟡 Subdomena `api.estateflow.pl` oddzielona od frontendu w konfiguracji Nginx
- [ ] 🟡 Subdomena `mailpit` → zablokować w prod (usunąć kontener mailpit z `docker-compose.prod.yml`)

### Docker i deployment

- [ ] 🔴 Zainstalować Docker + Docker Compose na VPS (`apt install docker.io docker-compose-plugin`)
- [ ] 🔴 Sklonować repo na VPS (`git clone` lub `git pull` przez deploy key SSH)
- [ ] 🔴 Skonfigurować `docker-compose.prod.yml` — bez kontenera `mailpit`, bez lokalnych `volumes` na upload
- [ ] 🔴 Plik `.env.production` stworzony bezpośrednio na serwerze — NIE commitować do gita
- [ ] 🔴 Zmienić `NODE_ENV=production` w kontenerach API i Web
- [ ] 🔴 Skonfigurować Nginx (`/etc/nginx/sites-available/estateflow`) z proxy do kontenerów
- [ ] 🟠 Skrypt deploy: `git pull && docker compose -f docker-compose.prod.yml up --build -d`
- [ ] 🟠 CI/CD pipeline (GitHub Actions) — automatyczny deploy na VPS po push do `main` przez SSH
- [ ] 🟠 Health check endpoint `/api/health` sprawdzony i monitorowany
- [ ] 🟡 Automatyczny restart kontenerów po restarcie VPS (`restart: unless-stopped` w compose)

### Baza danych

> **Decyzja:** PostgreSQL w kontenerze Docker na tym samym VPS (wystarczy na start). Dane persystowane przez `docker volume`.

- [ ] 🔴 PostgreSQL jako kontener w `docker-compose.prod.yml` z named volume (`db_data`)
- [ ] 🔴 Backup bazy — cron job na VPS: `pg_dump` codziennie + wysyłka na zdalny storage lub email
  ```bash
  # przykład crona (codziennie o 3:00)
  0 3 * * * docker exec real-estate-db pg_dump -U postgres real_estate_saas | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz
  ```
- [ ] 🔴 Retencja backupów min. 7 dni (stare pliki usuwać automatycznie)
- [ ] 🔴 Uruchomić wszystkie migracje SQL na produkcji przed startem
- [ ] 🔴 Zasilić tabelę `locations` danymi PRNG (124k rekordów) — patrz `LOCATION_IMPORT.md`
- [ ] 🟠 Oddzielny użytkownik DB z ograniczonymi uprawnieniami (nie `postgres`)
- [ ] 🟡 Przenieść na managed DB (Supabase/Neon) gdy ruch wzrośnie

### Storage plików (zdjęcia ogłoszeń)

> **Decyzja:** Cloudflare R2 — brak opłat za transfer, darmowy tier do 10 GB, S3-kompatybilne API, CDN Cloudflare gratis.

- [ ] 🔴 Założyć konto Cloudflare i aktywować R2 (free tier: 10 GB storage, 1M operacji/mies.)
- [ ] 🔴 Stworzyć bucket `estateflow-uploads` w R2
- [ ] 🔴 Wygenerować R2 API token (Access Key + Secret Key)
- [ ] 🔴 Skonfigurować zmienne w `.env.production`:
  ```env
  STORAGE_DRIVER=s3
  S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
  S3_BUCKET=estateflow-uploads
  S3_REGION=auto
  S3_ACCESS_KEY=<r2-access-key>
  S3_SECRET_KEY=<r2-secret-key>
  S3_PUBLIC_URL=https://cdn.estateflow.pl
  ```
- [ ] 🔴 Podpiąć domenę `cdn.estateflow.pl` pod R2 bucket w Cloudflare
- [ ] 🟠 Automatyczne czyszczenie tymczasowych zdjęć z niepotwierdzonych submissionów (lifecycle rule w R2)

---

## 2. Email i komunikacja

- [ ] 🔴 Skonfigurować produkcyjny SMTP / transakcyjny serwis email:
  - opcja A: **Resend** (najłatwiejsze, dobra polskojęzyczna obsługa)
  - opcja B: **Brevo (Sendinblue)** — ma polskie compliance
  - opcja C: **SendGrid**, **Postmark**
- [ ] 🔴 Zweryfikować domenę w serwisie email (SPF, DKIM, DMARC)
- [ ] 🔴 Skonfigurować `EMAIL_DRIVER=smtp` zamiast log-providera
- [ ] 🔴 Przetestować wysyłkę emaili weryfikacyjnych i powiadomień o zapytaniach
- [ ] 🔴 Skonfigurować skrzynki:
  - `support@estateflow.pl` — obsługa klientów
  - `abuse@estateflow.pl` — zgłoszenia naruszeń
  - `legal@estateflow.pl` — sprawy prawne / RODO
  - `noreply@estateflow.pl` — emaile systemowe
- [ ] 🟠 Szablony emaili w HTML (aktualnie plain text)
- [ ] 🟡 Bounce handling i unsubscribe dla marketingowych emaili

---

## 3. Produkt — funkcje wymagające naprawy przed launch

### Krytyczne (patrz `SELLER_FLOW_ANALYSIS.md`)

- [ ] 🔴 **A1/A2** — Auto-claim po weryfikacji emaila dla zalogowanego klienta
- [ ] 🔴 **A3** — Auto-claim przy rejestracji z `claimToken` w URL
- [ ] 🔴 **A4/A5** — Endpoint admin approve/reject (bez UI — przez API/DB na start)
- [ ] 🔴 Moderacja ogłoszeń: jasny status "oczekuje na weryfikację" vs "w weryfikacji przez zespół"

### Ważne

- [ ] 🟠 **B1-B3** — Wyświetlenia (`viewCount`) na kartach ogłoszeń w `/seller`
- [ ] 🟠 **B4** — Liczba zapytań na karcie ogłoszenia w `/seller`
- [ ] 🟠 Strona `/seller/listings/[id]` — szczegóły ogłoszenia z pełnymi statystykami
- [ ] 🟠 Strona regulaminu, polityki prywatności — uzupełnić o finalne dane spółki i operatora
- [ ] 🟠 Favicon, OG image, tytuły stron — zbrandowane pod produkcję

### Funkcje brakujące (przydatne na launch)

- [ ] 🟠 Strona `404` i `500` z sensownym komunikatem po polsku
- [ ] 🟠 Strona `/kontakt` z formularzem lub danymi kontaktowymi
- [ ] 🟠 Strona `/o-nas` (opcjonalnie, ale wiarygodność)
- [ ] 🟡 Chat support lub widget (np. Crisp, Tawk.to — wersje free)

---

## 4. Prawne i RODO — rynek polski

### Dokumenty (już istnieje szkielet — wymagają review prawnika)

- [ ] 🔴 **Regulamin serwisu** — uzupełnić o:
  - pełne dane operatora (spółka, NIP, KRS/CEIDG, adres)
  - zasady odpowiedzialności za treści użytkowników
  - procedurę usunięcia konta i danych
  - klauzule dotyczące pośrednictwa w obrocie nieruchomościami (licencja pośrednika?)
- [ ] 🔴 **Polityka prywatności** — uzupełnić o:
  - pełne dane administratora danych osobowych
  - podstawy prawne przetwarzania (zgoda, umowa, prawnie uzasadniony interes)
  - retencja danych (okresy przechowywania dla każdej kategorii)
  - prawa podmiotów danych (dostęp, sprostowanie, usunięcie, przenoszenie)
  - cookies i analityka
  - odbiorcy danych (subprocessorzy: hosting, email, analytics)
- [ ] 🔴 **Zasady publikacji ofert** — uzupełnić o zakaz publikacji ofert przez osoby nieuprawnione (ochrona praw pośrednika)
- [ ] 🔴 **Polityka cookies / baner cookie consent** — wymagany przez RODO/UŚUDE dla polskich użytkowników
  - opcja: **CookieYes**, **Cookiebot** (wersje free dla małych serwisów)
  - lub własna implementacja z `localStorage`

### Aspekty prawne specyficzne dla nieruchomości w Polsce

- [ ] 🔴 **Ustawa o pośrednictwie** — sprawdzić czy platforma nie wymaga licencji pośrednika nieruchomości (Ustawa z 2014 o gospodarce nieruchomościami)
  - Jeśli platforma TYLKO agreguje ogłoszenia właścicieli → prawdopodobnie nie wymaga
  - Jeśli platforma pośredniczy w transakcjach → może wymagać
- [ ] 🟠 **OC pośrednika** — jeśli działa w trybie pośrednictwa, wymagane ubezpieczenie OC
- [ ] 🟠 Umowa B2B z agentami korzystającymi z platformy (ToS dla konta agenta)
- [ ] 🟡 Regulamin dla agencji nieruchomości (umowa powierzenia danych DPA)

### Techniczne wymogi RODO

- [ ] 🔴 Wszystkie dane osobowe szyfrowane w tranzycie (HTTPS — już przez SSL)
- [ ] 🔴 Hasła hashowane bcrypt — ✅ już działa
- [ ] 🔴 Mechanizm usunięcia konta i danych (`DELETE /api/account`)
- [ ] 🟠 Eksport danych użytkownika na żądanie (art. 20 RODO — przenoszalność)
- [ ] 🟠 Logi dostępu do danych osobowych (audit log)
- [ ] 🟠 Rejestr czynności przetwarzania danych (wewnętrzny dokument, nie publiczny)

---

## 5. Bezpieczeństwo

### Konfiguracja prod (krytyczne)

- [ ] 🔴 Zmienić `JWT_SECRET` na silny, losowy klucz produkcyjny (min. 64 znaki)
- [ ] 🔴 Zmienić `DATABASE_PASSWORD` na silne hasło
- [ ] 🔴 Wyłączyć `DEBUG` i szczegółowe stack trace w odpowiedziach API
- [ ] 🔴 Ustawić `CORS_ORIGIN` tylko na domenę produkcyjną
- [ ] 🔴 Wyłączyć Swagger UI (`/api/docs`) na produkcji lub zabezpieczyć IP whitelist
- [ ] 🔴 Zmienić domyślne dane admina (adam.kowal@test.com → prawdziwe konto)
- [ ] 🔴 Firewall — tylko porty 80, 443 (i 22 SSH z IP whitelist)
- [ ] 🟠 Rate limiting produkcyjny — dostosować limity (aktualnie dev-level)
- [ ] 🟠 Helmet.js / security headers (CSP, X-Frame-Options, HSTS)
- [ ] 🟠 Fail2ban lub podobne na próby brute force SSH/API
- [ ] 🟡 Penetration test lub automated security scan (OWASP ZAP)

### Sekrety i zmienne środowiskowe

- [ ] 🔴 Żadnych sekretów w kodzie / repozytorium — sprawdzić `git log` pod kątem commitów z hasłami
- [ ] 🔴 Użyć secrets managera: GitHub Secrets (CI/CD), Doppler, Vault, lub po prostu bezpieczny `.env` tylko na serwerze
- [ ] 🔴 Rotacja kluczy API przy każdym nowym środowisku

---

## 6. Monitoring i observability

- [ ] 🔴 Logi aplikacji zbierane centralnie:
  - opcja A: **Sentry** (błędy + performance) — wersja free do 5k event/mies.
  - opcja B: **Logtail / BetterStack**
  - opcja C: self-hosted **Grafana + Loki**
- [ ] 🔴 Uptime monitoring — alert gdy serwis nie odpowiada:
  - opcja: **UptimeRobot** (free, check co 5 min)
  - opcja: **BetterStack** (free tier)
- [ ] 🟠 Error tracking po stronie frontendu (Sentry SDK dla Next.js)
- [ ] 🟠 Metryki biznesowe — dashboard z:
  - liczba nowych rejestracji / dzień
  - liczba nowych ogłoszeń / dzień
  - liczba zapytań / dzień
  - konwersja wizard → submission → verified → published
- [ ] 🟠 Alert na anomalie — np. nagły spike błędów 500, zbyt wiele failed logins
- [ ] 🟡 APM (Application Performance Monitoring) — czasy odpowiedzi endpointów

---

## 7. SEO i widoczność (rynek polski)

- [ ] 🔴 `sitemap.xml` — już ma mechanizm, upewnić się że wskazuje na domenę prod
- [ ] 🔴 `robots.txt` — skonfigurowany, nie blokujący crawlerów na prod
- [ ] 🔴 Google Search Console — zarejestrować domenę i zweryfikować
- [ ] 🔴 Tytuły i metadescriptions po polsku na kluczowych stronach
- [ ] 🟠 Google Analytics lub Plausible (privacy-friendly, poleca się dla RODO)
- [ ] 🟠 Structured data (JSON-LD) dla ofert — ✅ już częściowo zrobione, sprawdzić
- [ ] 🟠 Open Graph / Twitter Cards — zdjęcia ofert w podglądzie linku
- [ ] 🟠 Core Web Vitals — Lighthouse audit przed launch
- [ ] 🟡 Bing Webmaster Tools (mniejszy udział ale warto)
- [ ] 🟡 Wpisy w katalogach nieruchomości (gratka.pl, otodom, morizon) — linki do platformy

---

## 8. Płatności (jeśli planujesz monetyzację od startu)

- [ ] 🟠 Integracja z bramką płatności:
  - **Przelewy24** (najpopularniejszy w PL, wymagany dla polskich konsumentów)
  - **PayU** (alternatywa, bardzo popularny)
  - **Stripe** (jeśli B2B/karty, obsługuje PLN)
- [ ] 🟠 Faktury VAT — wymagane dla klientów B2B w Polsce (NIP na fakturze)
  - opcja: **InFakt API**, **wFirma API**, **Fakturownia API**
  - lub własny generator PDF z numeracją
- [ ] 🟠 Regulamin płatności i polityka zwrotów
- [ ] 🟡 Subskrypcje / auto-renewal (Stripe Billing lub PayU Recurring)

---

## 9. Operacje i zespół

- [ ] 🔴 Procedura ręcznej moderacji ogłoszeń (kto, kiedy, jak — SLA 24h)
- [ ] 🔴 Procedura obsługi zgłoszeń abuse (SLA: pilne tego dnia, normalne 1 dzień roboczy)
- [ ] 🔴 Procedura obsługi żądań RODO (usunięcie danych, dostęp, sprostowanie — SLA 30 dni)
- [ ] 🟠 Gotowe odpowiedzi na najczęstsze pytania support (FAQ lub baza wiedzy)
- [ ] 🟠 Kanał wewnętrzny dla błędów/alertów (Slack, Discord lub email)
- [ ] 🟡 Status page (np. `status.estateflow.pl`) — BetterStack oferuje za darmo

---

## 10. Testy przed launch

- [ ] 🔴 Smoke test end-to-end na środowisku staging:
  - rejestracja → panel → dodanie ogłoszenia → weryfikacja email → publikacja → zapytanie od klienta
  - logowanie admin → podgląd zgłoszeń → zatwierdzenie ogłoszenia
- [ ] 🔴 Test na urządzeniach mobilnych (ogłoszenia, wizard, panel /seller)
- [ ] 🟠 Test ładowania strony na wolnym łączu (3G throttling w devtools)
- [ ] 🟠 Test wszystkich emaili (weryfikacja, zapytanie, powiadomienia)
- [ ] 🟠 Test formularza zgłaszania nadużyć
- [ ] 🟡 Testy A/B pierwszych stron landing

---

## 11. Rollout — rekomendowana kolejność

```
Krok 1 — Infrastruktura (tydzień 1-2)
  ✦ Serwer, domena, SSL, baza prod, storage obiektowy, email SMTP

Krok 2 — Naprawa produktu (tydzień 2-3)
  ✦ Sprint A z SELLER_FLOW_ANALYSIS.md (auto-claim, approve/reject)
  ✦ Regulamin i polityka prywatności z danymi operatora
  ✦ Baner cookie consent

Krok 3 — Bezpieczeństwo prod (tydzień 3)
  ✦ JWT_SECRET, hasła, CORS, wyłączenie Swagger na prod
  ✦ Sentry + UptimeRobot

Krok 4 — Beta zamknięta (tydzień 4)
  ✦ 10-20 zaproszonych użytkowników
  ✦ Zbieranie feedbacku, poprawki krytyczne

Krok 5 — Soft launch publiczny
  ✦ Google Search Console, sitemap
  ✦ Ogłoszenie w mediach branżowych

Krok 6 — Monetyzacja (po launch)
  ✦ Przelewy24 / PayU, faktury VAT
```

---

## 12. Zmienne środowiskowe do ustawienia na produkcji

> Plik `.env.production` tworzony **bezpośrednio na VPS** (`/opt/estateflow/.env.production`), nigdy nie commitowany do gita.

```env
# App
NODE_ENV=production
FRONTEND_URL=https://estateflow.pl
API_URL=https://api.estateflow.pl

# Database (PostgreSQL w kontenerze na tym samym VPS)
DATABASE_HOST=db
DATABASE_PORT=5432
DATABASE_NAME=real_estate_saas
DATABASE_USER=app_user
DATABASE_PASSWORD=<silne-haslo-min-32-znaki>

# Auth
JWT_SECRET=<min-64-znaki-losowy-string-wygenerowany-openssl-rand-hex-32>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email (Resend — darmowy tier 3k emaili/mies.)
EMAIL_DRIVER=smtp
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=<resend-api-key>
EMAIL_FROM=noreply@estateflow.pl

# Storage — Cloudflare R2
STORAGE_DRIVER=s3
S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
S3_BUCKET=estateflow-uploads
S3_REGION=auto
S3_ACCESS_KEY=<r2-access-key>
S3_SECRET_KEY=<r2-secret-key>
S3_PUBLIC_URL=https://cdn.estateflow.pl

# CORS
CORS_ORIGIN=https://estateflow.pl

# Monitoring (Sentry — free tier)
SENTRY_DSN=<dsn>
```

## 13. Konfiguracja Nginx na VPS (przykład)

```nginx
# /etc/nginx/sites-available/estateflow

server {
    listen 80;
    server_name estateflow.pl www.estateflow.pl;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name estateflow.pl www.estateflow.pl;

    ssl_certificate /etc/letsencrypt/live/estateflow.pl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/estateflow.pl/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl;
    server_name api.estateflow.pl;

    ssl_certificate /etc/letsencrypt/live/api.estateflow.pl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.estateflow.pl/privkey.pem;

    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 14. Szybki start na VPS — kolejność komend

```bash
# 1. Instalacja Docker
apt update && apt install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx

# 2. Klon repo
mkdir -p /opt/estateflow && cd /opt/estateflow
git clone https://github.com/jedrzejbor/real-estate-agent-saas.git .

# 3. Stwórz .env.production (uzupełnij wartości)
cp .env.example .env.production
nano .env.production

# 4. Uruchom kontenery
docker compose -f docker-compose.prod.yml up -d

# 5. Uruchom migracje
docker exec real-estate-api pnpm --filter api migration:run

# 6. Import lokacji
docker exec real-estate-api pnpm --filter api import:locations:prng --source=prng

# 7. SSL
certbot --nginx -d estateflow.pl -d www.estateflow.pl -d api.estateflow.pl

# 8. Nginx
nginx -t && systemctl reload nginx
```
