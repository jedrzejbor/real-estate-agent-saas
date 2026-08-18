# PodAdresem — platforma dla agentów nieruchomości

Platforma SaaS dla agentów nieruchomości do zarządzania ofertami, klientami i spotkaniami.

## Tech Stack

- **Monorepo**: Turborepo + pnpm
- **Frontend**: Next.js 16 (App Router) + shadcn/ui + Tailwind CSS 4
- **Backend**: NestJS 11 + TypeORM
- **Database**: PostgreSQL 16
- **Infrastructure**: Docker Compose

## Struktura projektu

```
├── apps/
│   ├── web/          # Next.js frontend (port 3000)
│   └── api/          # NestJS backend (port 4000)
├── packages/
│   ├── typescript-config/   # Shared TypeScript configs
│   └── eslint-config/       # Shared ESLint configs
├── docker-compose.yml
├── Dockerfile.web
├── Dockerfile.api
└── turbo.json
```

## Quick Start

### Lokalnie (bez Dockera)

```bash
# Instalacja zależności
pnpm install

# Uruchomienie PostgreSQL (np. Docker)
docker run -d --name real-estate-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=real_estate_saas \
  -p 5432:5432 \
  postgres:16-alpine

# Uruchomienie dev serwerów
pnpm dev
```

### Docker Compose

```bash
docker compose up --build
```

Dostępne pod:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000/api

## Komendy

| Komenda | Opis |
|---------|------|
| `pnpm dev` | Uruchom wszystkie serwisy dev |
| `pnpm build` | Build wszystkich pakietów |
| `pnpm lint` | Lint wszystkich pakietów |
| `pnpm turbo build --filter=web` | Build tylko frontendu |
| `pnpm turbo dev --filter=api` | Dev tylko backendu |

## Deployment

Instrukcja wdrozenia testowego/stagingowego dla domeny `podadresem24.pl` jest w [DEPLOYMENT.md](./DEPLOYMENT.md).

Docelowy uklad:

- `podadresem24.pl` - publiczny portal / landing / katalog ofert
- `www.podadresem24.pl` - redirect lub alias publicznego portalu
- `app.podadresem24.pl` - panel agenta
- `api.podadresem24.pl` - backend API

CI/CD:

- pull requesty: `.github/workflows/pr-checks.yml`
- staging deploy po merge do `main`: `.github/workflows/deploy.yml`
