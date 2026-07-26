# Docker local commands

Praktyczna lista komend do lokalnego odpalania projektu w Dockerze oraz
recznego wykonywania migracji SQL.

## Szybki start standardowy

Uruchom z katalogu glownego repo:

```bash
cd "/Users/jedrek/Desktop/PROJEKT WARTY MILIONY/real-estate-agent-saas"
docker compose up -d --build
```

Adresy lokalne:

- Web: http://localhost:3000
- API: http://localhost:4000
- Mailpit: http://localhost:8025
- Postgres: localhost:5433

Sprawdzenie statusu:

```bash
docker ps --filter name=real-estate --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

Logi:

```bash
docker logs --tail 120 real-estate-api
docker logs --tail 120 real-estate-web
docker logs --tail 120 real-estate-db
```

Zatrzymanie projektu:

```bash
docker compose down
```

Zatrzymanie projektu razem z usunieciem wolumenu bazy danych:

```bash
docker compose down -v
```

Uzywaj `down -v` tylko wtedy, gdy swiadomie chcesz wyczyscic lokalna baze.

## Gdy port 5432 jest zajety

Projekt mapuje lokalny port Postgresa na `5433`, zeby nie konfliktowac z
Postgresem dzialajacym lokalnie na hoscie. API w Dockerze nadal laczy sie z
baza przez wewnetrzny adres `db:5432`.

Jesli w starszej konfiguracji `docker compose up -d db` zwraca blad podobny do:

```text
bind: address already in use
```

to znaczy, ze port `5432` na hoscie jest juz zajety. Najpierw upewnij sie, ze
masz w `docker-compose.yml` mapowanie `5433:5432`, a potem odtworz kontener:

```bash
docker rm -f real-estate-db
docker compose up -d db
```

Jesli nadal chcesz uruchomic baze bez wystawiania zadnego portu na hosta, uzyj
wariantu awaryjnego z aliasem `db` w sieci Dockera:

```bash
cd "/Users/jedrek/Desktop/PROJEKT WARTY MILIONY/real-estate-agent-saas"

docker compose down
docker network inspect real-estate-agent-saas_default >/dev/null 2>&1 || docker network create real-estate-agent-saas_default
docker volume inspect real-estate-agent-saas_postgres_data >/dev/null 2>&1 || docker volume create real-estate-agent-saas_postgres_data

docker rm -f real-estate-db

docker run -d \
  --name real-estate-db \
  --network real-estate-agent-saas_default \
  --network-alias db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=real_estate_saas \
  -v real-estate-agent-saas_postgres_data:/var/lib/postgresql/data \
  postgres:16-alpine

docker exec real-estate-db pg_isready -U postgres
docker compose up -d mailpit
docker compose up -d --build --no-deps api web
```

Uwagi:

- w tym trybie API laczy sie z baza po nazwie `db` w sieci Dockera,
- baza nie jest dostepna z hosta przez `localhost:5433`,
- API w Dockerze dziala normalnie, bo uzywa wewnetrznego adresu `db:5432`.

## Reczne wykonanie migracji SQL

Migracje sa w:

```bash
apps/api/migrations
```

Najpierw upewnij sie, ze Postgres dziala:

```bash
docker exec real-estate-db pg_isready -U postgres
```

Wykonanie jednej migracji:

```bash
docker cp apps/api/migrations/NAZWA_MIGRACJI.sql real-estate-db:/tmp/NAZWA_MIGRACJI.sql
docker exec real-estate-db psql -U postgres -d real_estate_saas -v ON_ERROR_STOP=1 -f /tmp/NAZWA_MIGRACJI.sql
```

Przyklad dla migracji marketplace agentow:

```bash
docker cp apps/api/migrations/20260722_agent_listing_takeover_foundation.sql real-estate-db:/tmp/20260722_agent_listing_takeover_foundation.sql
docker exec real-estate-db psql -U postgres -d real_estate_saas -v ON_ERROR_STOP=1 -f /tmp/20260722_agent_listing_takeover_foundation.sql

docker cp apps/api/migrations/20260723_agent_assignment_listing_copy_relations.sql real-estate-db:/tmp/20260723_agent_assignment_listing_copy_relations.sql
docker exec real-estate-db psql -U postgres -d real_estate_saas -v ON_ERROR_STOP=1 -f /tmp/20260723_agent_assignment_listing_copy_relations.sql
```

Sprawdzenie, czy tabele marketplace istnieja:

```bash
docker exec real-estate-db psql -U postgres -d real_estate_saas -c "select to_regclass('public.listing_agent_proposals') as proposals, to_regclass('public.listing_agent_assignments') as assignments;"
```

## Przydatne komendy diagnostyczne

Lista migracji:

```bash
ls apps/api/migrations
```

Sprawdzenie, kto zajmuje port `5432`:

```bash
lsof -nP -iTCP:5432 -sTCP:LISTEN
```

Restart samego API:

```bash
docker compose restart api
```

Restart samego weba:

```bash
docker compose restart web
```

Wejscie do psql w kontenerze:

```bash
docker exec -it real-estate-db psql -U postgres -d real_estate_saas
```

Smoke test API z kontenera:

```bash
docker exec real-estate-api wget -qO- http://localhost:4000/api/plans
```

Smoke test weba z kontenera:

```bash
docker exec real-estate-web wget -S --spider http://localhost:3000
```
