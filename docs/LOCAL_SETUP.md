# EstateFlow — Instrukcja uruchomienia lokalnego

> Przewodnik krok po kroku do uruchomienia pełnego środowiska dev (frontend + backend + baza danych) na macOS.

---

## Wymagania wstępne

| Narzędzie | Wersja | Sprawdzenie |
|-----------|--------|-------------|
| **Node.js** | >= 20 | `node -v` |
| **pnpm** | 9.15.x | `pnpm -v` |
| **Docker Desktop** | najnowsza | `docker -v` |
| **pgAdmin 4** | najnowsza | zainstalowany lokalnie |

> Jeśli nie masz pnpm: `npm install -g pnpm@9`

---

## Opcja A: Uruchomienie z Dockerem (zalecane)

Wszystkie serwisy (PostgreSQL + API + Web) w kontenerach.

### 1. Sklonuj repozytorium i zainstaluj zależności

```bash
cd ~/Desktop/real-estate-agent-saas
pnpm install
```

### 2. Uruchom wszystko jedną komendą

```bash
docker compose up --build
```

### 3. Gotowe! Serwisy dostępne pod:

| Serwis | URL |
|--------|-----|
| **Frontend (Next.js)** | http://localhost:3000 |
| **Backend API (NestJS)** | http://localhost:4000/api |
| **PostgreSQL** | `localhost:5432` |

### 4. Zatrzymanie

```bash
docker compose down          # zatrzymaj kontenery
docker compose down -v       # zatrzymaj + usuń dane bazy (reset)
```

---

## Opcja B: Uruchomienie lokalne (bez kontenerów dla API/Web)

Baza danych w Dockerze, a frontend i backend uruchamiane natywnie — **szybszy hot-reload**.

### 1. Uruchom PostgreSQL w Dockerze

```bash
docker run -d --name real-estate-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=real_estate_saas \
  -p 5432:5432 \
  postgres:16-alpine
```

> Sprawdź czy działa: `docker ps` — kontener `real-estate-db` powinien mieć status `Up`.

### 2. Zainstaluj zależności

```bash
cd ~/Desktop/real-estate-agent-saas
pnpm install
```

### 3. Utwórz plik `.env.local` dla backendu

```bash
cat > apps/api/.env.local << 'EOF'
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=real_estate_saas
PORT=4000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
RELEASE_FLAG_PUBLIC_LISTINGS_ENABLED=false
RELEASE_FLAG_PUBLIC_LEAD_FORMS_ENABLED=false
RELEASE_FLAG_PUBLIC_CLAIM_FLOW_ENABLED=false
RELEASE_FLAG_FREEMIUM_UPSELL_ENABLED=true
RELEASE_FLAG_PREMIUM_REPORTS_ENABLED=true
EOF
```

### 4. Utwórz plik `.env.local` dla frontendu

```bash
cat > apps/web/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:4000/api
EOF
```

### 5. Uruchom oba serwisy jednocześnie (Turborepo)

```bash
pnpm dev
```

To odpali równocześnie:
- **web** → Next.js dev server na **http://localhost:3000**
- **api** → NestJS dev server na **http://localhost:4000**

### 5a. Release flags na środowisku lokalnym

Techniczne feature flags są sterowane po stronie API przez zmienne środowiskowe:

| Zmienna | Domyślna wartość | Rola |
|--------|------------------|------|
| `RELEASE_FLAG_PUBLIC_LISTINGS_ENABLED` | `false` | rollout publicznych stron ofert |
| `RELEASE_FLAG_PUBLIC_LEAD_FORMS_ENABLED` | `false` | rollout formularzy leadowych |
| `RELEASE_FLAG_PUBLIC_CLAIM_FLOW_ENABLED` | `false` | rollout claim flow dla publicznych ofert |
| `RELEASE_FLAG_FREEMIUM_UPSELL_ENABLED` | `true` | pokazywanie CTA upsell / premium entry pointów |
| `RELEASE_FLAG_PREMIUM_REPORTS_ENABLED` | `true` | udostępnianie premium raportów / ich placeholderów |

Zmiana flag wymaga restartu procesu API.

> Alternatywnie, możesz uruchomić je osobno w dwóch terminalach:
> ```bash
> # Terminal 1 — Backend
> pnpm turbo dev --filter=api
>
> # Terminal 2 — Frontend
> pnpm turbo dev --filter=web
> ```

---

## Podłączenie pgAdmin 4 do bazy danych

### 1. Otwórz pgAdmin 4

### 2. Dodaj nowy serwer

Kliknij prawym przyciskiem na **Servers** → **Register** → **Server...**

### 3. Zakładka „General"

| Pole | Wartość |
|------|---------|
| **Name** | `EstateFlow Local` |

### 4. Zakładka „Connection"

| Pole | Wartość |
|------|---------|
| **Host name/address** | `localhost` |
| **Port** | `5432` |
| **Maintenance database** | `real_estate_saas` |
| **Username** | `postgres` |
| **Password** | `postgres` |
| **Save password?** | ✅ Tak |

### 5. Kliknij **Save**

Powinieneś zobaczyć:
- **Servers** → **EstateFlow Local** → **Databases** → **real_estate_saas**

> **Uwaga:** TypeORM z opcją `synchronize: true` (w trybie dev) automatycznie tworzy tabele na podstawie entity. Na razie baza będzie pusta — tabele pojawią się gdy zostaną zaimplementowane entity (User, Listing itd.).

---

## Weryfikacja że wszystko działa

### Backend (API)

```bash
curl http://localhost:4000/api
```

Powinno zwrócić odpowiedź z `AppController` (domyślnie "Hello World!").

### Frontend

Otwórz **http://localhost:3000** w przeglądarce — powinna załadować się strona Next.js.

### Baza danych

W pgAdmin 4 → **EstateFlow Local** → **Databases** → **real_estate_saas** → kliknij prawym → **Query Tool** → wpisz:

```sql
SELECT version();
```

Powinno zwrócić wersję PostgreSQL 16.x.

---

## Porty i dane dostępowe — podsumowanie

| Serwis | Host | Port | Uwagi |
|--------|------|------|-------|
| **Frontend** | localhost | 3000 | Next.js 16 + Turbopack |
| **Backend API** | localhost | 4000 | NestJS 11, prefix `/api` |
| **PostgreSQL** | localhost | 5432 | DB: `real_estate_saas` |
| **pgAdmin 4** | localhost | — | Aplikacja desktopowa |

| Zmienna | Wartość |
|---------|---------|
| `DB_USERNAME` | `postgres` |
| `DB_PASSWORD` | `postgres` |
| `DB_NAME` | `real_estate_saas` |

---

## Rozwiązywanie problemów

### Port 5432 jest zajęty

```bash
# Sprawdź co zajmuje port
lsof -i :5432

# Jeśli to stary kontener Dockera
docker stop real-estate-db && docker rm real-estate-db
```

### Port 3000 lub 4000 jest zajęty

```bash
lsof -i :3000
lsof -i :4000
kill -9 <PID>
```

### Nie mogę połączyć się z bazą w pgAdmin

- Upewnij się że kontener PostgreSQL działa: `docker ps`
- Sprawdź logi: `docker logs real-estate-db`
- Jeśli używasz Docker Compose, host to `localhost` (nie `db`)

### pnpm install nie działa

```bash
# Wyczyść cache i spróbuj ponownie
pnpm store prune
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

### TypeORM nie łączy się z bazą

Sprawdź czy plik `apps/api/.env.local` istnieje i zawiera poprawne dane. Porównaj z wartościami w `docker-compose.yml`.

---

## Przydatne komendy

| Komenda | Opis |
|---------|------|
| `pnpm dev` | Uruchom wszystkie serwisy (frontend + backend) |
| `pnpm build` | Build produkcyjny |
| `pnpm lint` | Linting we wszystkich pakietach |
| `pnpm turbo dev --filter=api` | Tylko backend |
| `pnpm turbo dev --filter=web` | Tylko frontend |
| `docker compose up --build` | Pełne środowisko w Dockerze |
| `docker compose down -v` | Reset środowiska (z danymi) |
| `docker compose logs -f api` | Logi backendu (Docker) |
| `docker compose logs -f db` | Logi bazy danych (Docker) |
