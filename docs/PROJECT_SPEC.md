# EstateFlow — Specyfikacja Projektu

> Dokument żywy — aktualizowany przy każdym kroku rozwoju aplikacji.
> Ostatnia aktualizacja: 2026-04-18 (Krok 5)

---

## Spis treści

- [Krok 1: Założenia i planowanie](#krok-1-założenia-i-planowanie)
  - [1.1 Wizja produktu](#11-wizja-produktu)
  - [1.2 Grupa docelowa](#12-grupa-docelowa)
  - [1.3 Problemy do rozwiązania](#13-problemy-do-rozwiązania)
  - [1.4 Kluczowe założenia biznesowe](#14-kluczowe-założenia-biznesowe)
  - [1.5 Założenia techniczne](#15-założenia-techniczne)
  - [1.6 Model danych (wstępny)](#16-model-danych-wstępny)
  - [1.7 Architektura systemu](#17-architektura-systemu)
  - [1.8 Moduły funkcjonalne (zakres MVP)](#18-moduły-funkcjonalne-zakres-mvp)
  - [1.9 Role i uprawnienia](#19-role-i-uprawnienia)
  - [1.10 Roadmapa kroków](#110-roadmapa-kroków)
  - [1.11 Aktualny stan projektu](#111-aktualny-stan-projektu)

---

## Krok 1: Założenia i planowanie

### 1.1 Wizja produktu

**EstateFlow** to platforma SaaS (Software as a Service) zaprojektowana specjalnie dla **agentów nieruchomości** i **biur nieruchomości** w Polsce. Umożliwia zarządzanie całym cyklem pracy agenta — od pozyskania oferty, przez obsługę klienta, aż po zamknięcie transakcji.

**Jedno narzędzie zamiast pięciu** — EstateFlow zastępuje:
- Arkusze kalkulacyjne (Excel/Google Sheets) do śledzenia ofert
- Notatniki / CRM-y (do zarządzania kontaktami z klientami)
- Kalendarze (do planowania spotkań i wizyt)
- Osobne strony internetowe (do prezentacji ofert)
- Ręczne raportowanie (do śledzenia wyników sprzedaży)

### 1.2 Grupa docelowa

| Segment | Opis | Potrzeby |
|---------|------|----------|
| **Agent indywidualny** | Samodzielny pośrednik, 10–50 ofert | Prosta obsługa, niski koszt, szybka konfiguracja |
| **Małe biuro** (2–10 agentów) | Szef + kilku agentów, 50–200 ofert | Współdzielenie danych, podgląd wyników zespołu |
| **Średnie biuro** (10–50 agentów) | Struktura z managerami, 200–1000 ofert | Zaawansowane raporty, role, automatyzacje |

**Rynek**: Polska (język PL, waluta PLN, formaty adresowe, prawo lokalne).

**Przyszłe rozszerzenie**: inne kraje UE (lokalizacja i18n).

### 1.3 Problemy do rozwiązania

| # | Problem | Jak EstateFlow rozwiązuje |
|---|---------|--------------------------|
| 1 | Rozproszone dane ofert (Excel, papier, różne portale) | Centralna baza ofert z jednym źródłem prawdy |
| 2 | Brak historii kontaktu z klientem | CRM z timeline: kto dzwonił, kiedy, o czym rozmowa |
| 3 | Zapominanie o spotkaniach i follow-upach | Kalendarz + automatyczne przypomnienia |
| 4 | Brak wglądu w wyniki sprzedaży | Dashboard z KPI: konwersje, przychody, aktywność |
| 5 | Ręczne tworzenie materiałów ofertowych | Automatyczne generowanie kart ofertowych (PDF) |
| 6 | Trudność w dopasowaniu oferty do klienta | System matchowania: preferencje klienta → pasujące oferty |
| 7 | Brak profesjonalnej prezentacji online | Publiczna strona agenta / biura z ofertami |

### 1.4 Kluczowe założenia biznesowe

#### Model cenowy (SaaS subscription)

| Plan | Cena (PLN/mies.) | Limit ofert | Limit agentów | Funkcje |
|------|------------------|-------------|---------------|---------|
| **Starter** | 49 | 25 | 1 | Oferty, Klienci, Kalendarz |
| **Professional** | 149 | 200 | 5 | + Raporty, Automatyzacje, PDF export |
| **Enterprise** | 399 | ∞ | ∞ | + API, White-label, Custom domain |

> **Uwaga**: Ceny orientacyjne, do ustalenia po badaniu rynku.

#### Kluczowe metryki sukcesu (KPI)

- **MRR** (Monthly Recurring Revenue) — miesięczny przychód
- **Churn rate** — % rezygnacji miesięcznie (cel: < 5%)
- **Activation rate** — % nowych użytkowników, którzy dodali pierwszą ofertę w 7 dni
- **DAU/MAU** — ratio aktywnych użytkowników (cel: > 30%)

#### Założenia prawne

- Zgodność z **RODO/GDPR** — dane osobowe klientów
- **Polityka prywatności i regulamin** — wymagane dla SaaS
- **Eksport danych** — użytkownik musi mieć możliwość pobrania swoich danych
- **Usunięcie konta** — prawo do bycia zapomnianym

### 1.5 Założenia techniczne

#### Tech Stack (zatwierdzony)

| Warstwa | Technologia | Wersja | Uzasadnienie |
|---------|-------------|--------|--------------|
| **Monorepo** | Turborepo + pnpm | — | Zarządzanie wieloma pakietami, shared configs |
| **Frontend** | Next.js (App Router) | 16.2.x | SSR/SSG, routing, API routes, Server Components |
| **UI Components** | shadcn/ui (base-nova) | 4.x | Customizowalne, Tailwind-native, accessibility |
| **Styling** | Tailwind CSS | 4.x | Utility-first, design tokens, JIT |
| **Backend** | NestJS | 11.x | Modularność, dependency injection, TypeScript |
| **ORM** | TypeORM | 0.3.x | Relacje, migracje, query builder |
| **Database** | PostgreSQL | 16.x | JSONB, full-text search, niezawodność |
| **Infra** | Docker Compose | — | Lokalne środowisko dev, łatwy deploy |
| **Package Manager** | pnpm | — | Szybki, workspace-native |

#### Design System

- **Koncept B: Light Luxury Warm** — zatwierdzony
- Pełna specyfikacja: `docs/design/DESIGN_SYSTEM.md`
- Wzorce komponentów: `docs/design/COMPONENT_PATTERNS.md`
- Guide dla AI: `docs/design/AI_GUIDE.md`

#### Konwencje

| Aspekt | Konwencja |
|--------|-----------|
| **Kod** (zmienne, funkcje, klasy) | camelCase / PascalCase — angielski |
| **Baza danych** (tabele, kolumny) | snake_case — angielski |
| **UI teksty** (labele, komunikaty) | Polski |
| **Git commits** | Conventional Commits — angielski (`feat:`, `fix:`, `docs:`) |
| **Dokumentacja** | Polski |
| **Nazwy plików** | kebab-case lub PascalCase (komponenty) |
| **API endpointy** | RESTful, kebab-case, angielski (`/api/listings`, `/api/clients`) |

#### Bezpieczeństwo

| Aspekt | Rozwiązanie |
|--------|-------------|
| **Autentykacja** | JWT (access + refresh token), httpOnly cookies |
| **Autoryzacja** | RBAC (role-based access control) via NestJS Guards |
| **Hasła** | bcrypt (min 12 rounds) |
| **CORS** | Ograniczone do domeny frontendu |
| **Rate limiting** | Throttler NestJS (100 req/min per IP) |
| **Walidacja input** | class-validator (backend), zod (frontend) |
| **SQL Injection** | TypeORM — parametryzowane zapytania |
| **XSS** | React automatyczny escaping + CSP headers |
| **CSRF** | SameSite cookies + CSRF token |

### 1.6 Model danych (wstępny)

```
┌─────────────────────────────────────────────────────────────────┐
│                           UŻYTKOWNICY                          │
│                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   User       │────▶│  Agent       │────▶│  Agency      │    │
│  │              │     │ (profil)     │     │ (biuro)      │    │
│  │ id           │     │ id           │     │ id           │    │
│  │ email        │     │ user_id (FK) │     │ name         │    │
│  │ password_hash│     │ agency_id(FK)│     │ address      │    │
│  │ role         │     │ phone        │     │ logo_url     │    │
│  │ is_active    │     │ license_no   │     │ subscription │    │
│  │ created_at   │     │ bio          │     │ plan         │    │
│  │ updated_at   │     │ avatar_url   │     │ owner_id(FK) │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                          NIERUCHOMOŚCI                          │
│                                                                 │
│  ┌──────────────────┐     ┌──────────────┐                      │
│  │   Listing        │────▶│  ListingImage│                      │
│  │                  │     │              │                      │
│  │ id               │     │ id           │                      │
│  │ agent_id (FK)    │     │ listing_id   │                      │
│  │ title            │     │ url          │                      │
│  │ description      │     │ order        │                      │
│  │ type (enum)      │     │ is_primary   │                      │
│  │ status (enum)    │     └──────────────┘                      │
│  │ price            │                                           │
│  │ currency         │     ┌──────────────┐                      │
│  │ area_m2          │────▶│  Address     │                      │
│  │ rooms            │     │              │                      │
│  │ bathrooms        │     │ id           │                      │
│  │ floor            │     │ listing_id   │                      │
│  │ total_floors     │     │ street       │                      │
│  │ year_built       │     │ city         │                      │
│  │ is_premium       │     │ postal_code  │                      │
│  │ published_at     │     │ district     │                      │
│  │ created_at       │     │ lat          │                      │
│  │ updated_at       │     │ lng          │                      │
│  └──────────────────┘     └──────────────┘                      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                             CRM                                 │
│                                                                 │
│  ┌──────────────────┐     ┌──────────────────┐                  │
│  │   Client         │────▶│  ClientNote      │                  │
│  │                  │     │                  │                  │
│  │ id               │     │ id               │                  │
│  │ agent_id (FK)    │     │ client_id (FK)   │                  │
│  │ first_name       │     │ agent_id (FK)    │                  │
│  │ last_name        │     │ content          │                  │
│  │ email            │     │ created_at       │                  │
│  │ phone            │     └──────────────────┘                  │
│  │ source (enum)    │                                           │
│  │ status (enum)    │     ┌──────────────────┐                  │
│  │ budget_min       │────▶│ ClientPreference │                  │
│  │ budget_max       │     │                  │                  │
│  │ notes            │     │ id               │                  │
│  │ created_at       │     │ client_id (FK)   │                  │
│  │ updated_at       │     │ property_type    │                  │
│  └──────────────────┘     │ min_area         │                  │
│                           │ max_price        │                  │
│                           │ preferred_city   │                  │
│                           │ min_rooms        │                  │
│                           └──────────────────┘                  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                          SPOTKANIA                              │
│                                                                 │
│  ┌──────────────────┐                                           │
│  │   Appointment    │                                           │
│  │                  │                                           │
│  │ id               │                                           │
│  │ agent_id (FK)    │                                           │
│  │ client_id (FK)   │                                           │
│  │ listing_id (FK)  │  ← opcjonalne                            │
│  │ title            │                                           │
│  │ type (enum)      │  ← oglądanie / negocjacje / podpisanie   │
│  │ status (enum)    │  ← zaplanowane / zakończone / anulowane  │
│  │ start_time       │                                           │
│  │ end_time         │                                           │
│  │ location         │                                           │
│  │ notes            │                                           │
│  │ created_at       │                                           │
│  └──────────────────┘                                           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                          AKTYWNOŚĆ                              │
│                                                                 │
│  ┌──────────────────┐                                           │
│  │   ActivityLog    │                                           │
│  │                  │                                           │
│  │ id               │                                           │
│  │ agent_id (FK)    │                                           │
│  │ entity_type      │  ← listing / client / appointment        │
│  │ entity_id        │                                           │
│  │ action (enum)    │  ← created / updated / deleted / viewed  │
│  │ metadata (JSONB) │  ← szczegóły zmiany                     │
│  │ created_at       │                                           │
│  └──────────────────┘                                           │
└─────────────────────────────────────────────────────────────────┘
```

#### Enumy

```typescript
// Typ nieruchomości
enum PropertyType {
  APARTMENT = 'apartment',     // Mieszkanie
  HOUSE = 'house',             // Dom
  LAND = 'land',               // Działka
  COMMERCIAL = 'commercial',   // Lokal użytkowy
  OFFICE = 'office',           // Biuro
  GARAGE = 'garage',           // Garaż
}

// Status oferty
enum ListingStatus {
  DRAFT = 'draft',             // Szkic
  ACTIVE = 'active',           // Aktywna
  RESERVED = 'reserved',       // Zarezerwowana
  SOLD = 'sold',               // Sprzedana
  RENTED = 'rented',           // Wynajęta
  WITHDRAWN = 'withdrawn',     // Wycofana
  ARCHIVED = 'archived',       // Zarchiwizowana
}

// Typ transakcji
enum TransactionType {
  SALE = 'sale',               // Sprzedaż
  RENT = 'rent',               // Wynajem
}

// Źródło klienta
enum ClientSource {
  WEBSITE = 'website',         // Strona www
  REFERRAL = 'referral',       // Polecenie
  PORTAL = 'portal',           // Portal (otodom, olx)
  PHONE = 'phone',             // Telefon
  WALK_IN = 'walk_in',         // Osobista wizyta
  SOCIAL_MEDIA = 'social',     // Media społecznościowe
  OTHER = 'other',
}

// Status klienta
enum ClientStatus {
  NEW = 'new',                 // Nowy lead
  CONTACTED = 'contacted',     // Skontaktowany
  QUALIFIED = 'qualified',     // Zakwalifikowany
  ACTIVE = 'active',           // Aktywnie szukający
  NEGOTIATING = 'negotiating', // W trakcie negocjacji
  CLOSED_WON = 'closed_won',  // Transakcja zamknięta
  CLOSED_LOST = 'closed_lost', // Stracony
  INACTIVE = 'inactive',       // Nieaktywny
}

// Typ spotkania
enum AppointmentType {
  VIEWING = 'viewing',             // Oglądanie nieruchomości
  NEGOTIATION = 'negotiation',     // Negocjacje
  SIGNING = 'signing',             // Podpisanie umowy
  CONSULTATION = 'consultation',   // Konsultacja
  OTHER = 'other',
}

// Status spotkania
enum AppointmentStatus {
  SCHEDULED = 'scheduled',  // Zaplanowane
  COMPLETED = 'completed',  // Zakończone
  CANCELLED = 'cancelled',  // Anulowane
  NO_SHOW = 'no_show',      // Niestawienie się
}

// Rola użytkownika
enum UserRole {
  OWNER = 'owner',           // Właściciel biura
  ADMIN = 'admin',           // Administrator
  AGENT = 'agent',           // Agent
  VIEWER = 'viewer',         // Tylko podgląd
}
```

### 1.7 Architektura systemu

```
                    ┌──────────────────────────────────────────┐
                    │              KLIENT (Browser)             │
                    │                                          │
                    │  Next.js 16 (SSR/CSR)                    │
                    │  ├── (marketing) — publiczna strona     │
                    │  ├── (auth) — logowanie, rejestracja    │
                    │  └── (dashboard) — panel agenta         │
                    └────────────────┬─────────────────────────┘
                                     │
                              HTTPS / REST API
                                     │
                    ┌────────────────▼─────────────────────────┐
                    │           API Gateway (NestJS)            │
                    │                                          │
                    │  ├── AuthModule      (JWT, Guards)       │
                    │  ├── UsersModule     (CRUD, Profile)     │
                    │  ├── ListingsModule  (CRUD, Search)      │
                    │  ├── ClientsModule   (CRM, Notes)        │
                    │  ├── AppointmentsModule (Calendar)       │
                    │  ├── ReportsModule   (Analytics)         │
                    │  ├── UploadsModule   (Image upload)      │
                    │  └── ActivityModule  (Audit log)         │
                    └────────────────┬─────────────────────────┘
                                     │
                              TypeORM
                                     │
                    ┌────────────────▼─────────────────────────┐
                    │          PostgreSQL 16                    │
                    │                                          │
                    │  Główna baza danych                      │
                    │  ├── users, agents, agencies             │
                    │  ├── listings, listing_images, addresses │
                    │  ├── clients, client_notes, preferences  │
                    │  ├── appointments                         │
                    │  └── activity_logs                        │
                    └──────────────────────────────────────────┘
```

#### Przyszłe rozszerzenia (poza MVP)

```
┌─────────────────────────────────────────────────────────┐
│  Redis          — cache, sessions, real-time pub/sub    │
│  S3 / MinIO     — storage zdjęć nieruchomości          │
│  Bull / BullMQ  — kolejki: email, PDF, import          │
│  Resend / SES   — transakcyjne emaile                  │
│  Stripe         — płatności subskrypcji                 │
│  Socket.io      — real-time notifications               │
│  Puppeteer      — generowanie PDF kart ofertowych      │
└─────────────────────────────────────────────────────────┘
```

### 1.8 Moduły funkcjonalne (zakres MVP)

#### MVP — Faza 1 (core)

| # | Moduł | Opis | Priorytet |
|---|-------|------|-----------|
| 1 | **Auth** | Rejestracja, login, logout, reset hasła, JWT | 🔴 Krytyczny |
| 2 | **Oferty (Listings)** | CRUD ofert, statusy, zdjęcia, wyszukiwanie, filtrowanie | 🔴 Krytyczny |
| 3 | **Klienci (CRM)** | CRUD klientów, notatki, preferencje, historia kontaktu | 🔴 Krytyczny |
| 4 | **Kalendarz** | Spotkania, podgląd dzień/tydzień/miesiąc, przypomnienia | 🟡 Ważny |
| 5 | **Dashboard** | Statystyki (oferty, klienci, spotkania, przychód), wykresy | 🟡 Ważny |
| 6 | **Profil agenta** | Edycja danych, avatar, ustawienia | 🟡 Ważny |

#### MVP — Faza 2 (growth)

| # | Moduł | Opis | Priorytet |
|---|-------|------|-----------|
| 7 | **Landing Page** | Strona marketingowa z CTA, features, pricing | 🟡 Ważny |
| 8 | **Raporty** | Wykresy sprzedaży, konwersji, aktywności | 🟢 Nice-to-have |
| 9 | **Matchmaking** | Auto-dopasowanie oferta ↔ preferencje klienta | 🟢 Nice-to-have |
| 10 | **Export PDF** | Generowanie kart ofertowych do druku/email | 🟢 Nice-to-have |

#### Post-MVP

| # | Moduł | Opis |
|---|-------|------|
| 11 | **Multi-agent** | Zarządzanie biurem, role, uprawnienia |
| 12 | **Public listings** | Strona publiczna agenta / biura z ofertami |
| 13 | **Notifications** | Real-time (WebSocket), email, push |
| 14 | **Import/Export** | Import z portali (Otodom), export CSV |
| 15 | **Stripe Billing** | Subskrypcje, faktury, trial |
| 16 | **Integracje** | Google Calendar, Otodom API, mapy |
| 17 | **AI Asystent** | Sugestie cen, opisy AI, predykcje sprzedaży |

### 1.9 Role i uprawnienia

| Akcja | Owner | Admin | Agent | Viewer |
|-------|:-----:|:-----:|:-----:|:------:|
| Zarządzanie biurem | ✅ | ❌ | ❌ | ❌ |
| Zarządzanie użytkownikami | ✅ | ✅ | ❌ | ❌ |
| Tworzenie ofert | ✅ | ✅ | ✅ (swoje) | ❌ |
| Edycja ofert | ✅ | ✅ | ✅ (swoje) | ❌ |
| Usuwanie ofert | ✅ | ✅ | ✅ (swoje) | ❌ |
| Podgląd ofert | ✅ | ✅ | ✅ (swoje) | ✅ |
| Zarządzanie klientami | ✅ | ✅ | ✅ (swoje) | ❌ |
| Kalendarz | ✅ | ✅ | ✅ (swoje) | ✅ |
| Raporty globalne | ✅ | ✅ | ❌ | ❌ |
| Raporty własne | ✅ | ✅ | ✅ | ✅ |
| Subskrypcja / billing | ✅ | ❌ | ❌ | ❌ |
| Ustawienia profilu | ✅ | ✅ | ✅ | ✅ |

> **Uwaga MVP**: W pierwszej wersji implementujemy tylko rolę **Agent** (single-user). Multi-agent (Owner, Admin, Viewer) w fazie post-MVP.

### 1.10 Roadmapa kroków

Każdy krok będzie aktualizował ten dokument o nową sekcję.

| Krok | Nazwa | Status | Opis |
|------|-------|--------|------|
| **1** | Założenia i planowanie | ✅ Gotowy | Ten dokument — wizja, model danych, architektura |
| **2** | Auth module (backend) | ✅ Gotowy | Rejestracja, login, JWT, Guard, User entity |
| **3** | Auth module (frontend) | ✅ Gotowy | Strony login/register, context, protected routes, dashboard layout |
| **4** | Listings module (backend) | ✅ Gotowy | CRUD API, entity, walidacja, filtrowanie, paginacja |
| **5** | Listings module (frontend) | ✅ Gotowy | Lista ofert, szczegóły, formularz dodawania/edycji, filtry, paginacja |
| **6** | Clients module (backend) | ⬜ Zaplanowany | CRUD API, notatki, preferencje |
| **7** | Clients module (frontend) | ⬜ Zaplanowany | Lista, profil klienta, CRM view |
| **8** | Calendar module | ⬜ Zaplanowany | Spotkania CRUD, widok kalendarza |
| **9** | Dashboard | ⬜ Zaplanowany | Stat cards, wykresy, ostatnia aktywność |
| **10** | Landing Page | ⬜ Zaplanowany | Strona marketingowa, pricing |
| **11** | Deploy & CI/CD | ⬜ Zaplanowany | Docker production, CI pipeline |

### 1.11 Aktualny stan projektu

#### Co jest gotowe ✅

| Element | Szczegóły |
|---------|-----------|
| **Monorepo** | Turborepo + pnpm skonfigurowane |
| **Frontend scaffold** | Next.js 16 z App Router, Tailwind CSS 4 |
| **Backend scaffold** | NestJS 11 z TypeORM, podłączenie do PostgreSQL |
| **shadcn/ui** | Zainstalowane (base-nova), komponenty: Button, Card, Badge, Input |
| **Docker Compose** | PostgreSQL + API + Web — gotowe |
| **Shared configs** | TypeScript config, ESLint config (packages/) |
| **Design System** | Koncept B „Light Luxury Warm" — pełna dokumentacja |
| **Formatter** | Prettier + ESLint skonfigurowane |

| **Zmiana fontów** | Outfit + Inter skonfigurowane w layout.tsx | Krok 1 (LP) |
| **Design System CSS** | Zmienne CSS w globals.css z design system | Krok 1 (LP) |
| **Landing Page** | Hero, Features, Testimonials, Pricing, CTA, Footer | Krok 1 (LP) |
| **Auth module (backend)** | User/Agent/Agency entities, JWT auth, Guards, RBAC | Krok 2 |
| **Auth module (frontend)** | Login/Register pages, AuthContext, dashboard layout, middleware | Krok 3 |
| **Listings module (backend)** | Listing/ListingImage/Address entities, CRUD API, filtrowanie, paginacja | Krok 4 |
| **Listings module (frontend)** | Lista ofert, szczegóły, formularz, filtry, paginacja, status management | Krok 5 |

#### Co wymaga zrobienia ⬜

| Element | Priorytet | Krok |
|---------|-----------|------|
| Klienci module | 🟡 | 6-7 |
| Kalendarz module | 🟡 | 8 |
| Dashboard statystyki | 🟡 | 9 |

---

## Krok 2: Auth module (backend)

> Data: 2026-04-18

### Utworzone pliki

| Plik | Opis |
|------|------|
| `apps/api/src/common/enums/index.ts` | Enumy: UserRole, PropertyType, ListingStatus, TransactionType, ClientSource, ClientStatus, AppointmentType, AppointmentStatus |
| `apps/api/src/users/entities/user.entity.ts` | User entity — UUID PK, email (unique), passwordHash (@Exclude), role, isActive, timestamps |
| `apps/api/src/users/entities/agent.entity.ts` | Agent entity — profil agenta, OneToOne→User, ManyToOne→Agency |
| `apps/api/src/users/entities/agency.entity.ts` | Agency entity — biuro nieruchomości, plan subskrypcji |
| `apps/api/src/users/users.module.ts` | UsersModule z TypeOrmModule.forFeature |
| `apps/api/src/users/users.service.ts` | findByEmail, findById, create (z agent profile), deactivate |
| `apps/api/src/auth/dto/register.dto.ts` | RegisterDto — walidacja email, hasło (min 8, upper, lower, digit) |
| `apps/api/src/auth/dto/login.dto.ts` | LoginDto — email + password |
| `apps/api/src/auth/interfaces/jwt-payload.interface.ts` | JwtPayload { sub, email, role } |
| `apps/api/src/auth/strategies/jwt.strategy.ts` | PassportStrategy — Bearer token, walidacja user active |
| `apps/api/src/auth/guards/jwt-auth.guard.ts` | Global JWT guard z obsługą @Public() |
| `apps/api/src/auth/guards/roles.guard.ts` | RBAC guard z @Roles() decorator |
| `apps/api/src/auth/decorators/public.decorator.ts` | @Public() — oznacza route jako publiczny |
| `apps/api/src/auth/decorators/roles.decorator.ts` | @Roles(...roles) — wymaga konkretnych ról |
| `apps/api/src/auth/decorators/current-user.decorator.ts` | @CurrentUser() — wyciąga usera z request |
| `apps/api/src/auth/auth.service.ts` | Logika: bcrypt hash (12 rounds), JWT access+refresh token |
| `apps/api/src/auth/auth.controller.ts` | POST /auth/register, POST /auth/login, GET /auth/me |
| `apps/api/src/auth/auth.module.ts` | Wire: JwtModule, PassportModule, UsersModule |

### Zmodyfikowane pliki

| Plik | Zmiana |
|------|--------|
| `apps/api/src/app.module.ts` | Import AuthModule, UsersModule, ThrottlerModule; APP_GUARD: JwtAuthGuard, RolesGuard, ThrottlerGuard |
| `apps/api/src/app.controller.ts` | Dodano @Public() do health endpoint |
| `apps/api/tsconfig.json` | strictPropertyInitialization: false (dla TypeORM entities) |
| `docker-compose.yml` | Dodano JWT_SECRET, JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN do env API |

### Endpointy API

| Metoda | Ścieżka | Auth | Opis |
|--------|---------|------|------|
| GET | `/api` | ❌ Public | Health check |
| POST | `/api/auth/register` | ❌ Public | Rejestracja użytkownika |
| POST | `/api/auth/login` | ❌ Public | Logowanie, zwraca JWT |
| GET | `/api/auth/me` | ✅ JWT | Profil zalogowanego użytkownika |

### Przetestowane ✅

- Rejestracja nowego użytkownika → zwraca user + accessToken + refreshToken
- Login → zwraca user + nowe tokeny
- GET /auth/me z Bearer token → zwraca profil
- Health endpoint działa bez tokenu
- Rate limiting (ThrottlerModule) aktywny

---

> **Następny krok**: Krok 6 — Implementacja modułu Clients (backend): CRUD API, notatki, preferencje.

---

## Krok 5: Listings module (frontend)

> Data: 2026-04-18

### Architektura

- **Typy & API**: Pełne TypeScript types mirrorujące backend entities, Zod schema do walidacji formularzy, API client functions (fetchListings, fetchListing, createListing, updateListing, deleteListing)
- **Hooks**: `useListings` (paginacja, filtry, abort controller), `useListingForm` (Zod validation, nested objects z FormData)
- **Komponenty**: ListingCard, ListingFiltersBar, ListingPagination, ListingStatusBadge, ListingForm (create/edit mode)
- **Formatowanie**: `formatPrice()` (Intl.NumberFormat PLN), `formatArea()` (m²), polskie etykiety dla enumów
- **Status management**: Szczegóły oferty z przyciskami zmiany statusu (draft→active, active→reserved/sold/rented/withdrawn, itd.)

### Utworzone pliki

| Plik | Opis |
|------|------|
| `apps/web/src/lib/listings.ts` | Typy, enumy, Zod schemas, API functions, helpers (formatPrice, formatArea, cleanPayload) |
| `apps/web/src/hooks/use-listings.ts` | Hook do pobierania listy ofert z paginacją, filtrami, abort controller |
| `apps/web/src/hooks/use-listing-form.ts` | Hook formularza z Zod validation, obsługa nested objects (address.*) |
| `apps/web/src/components/listings/listing-status-badge.tsx` | Badge ze statusem oferty (kolorowany wg statusu) |
| `apps/web/src/components/listings/listing-card.tsx` | Karta oferty: typ, status, tytuł, lokalizacja, parametry, cena, data |
| `apps/web/src/components/listings/listing-filters.tsx` | Pasek filtrów: search, propertyType, transactionType, status, reset |
| `apps/web/src/components/listings/listing-pagination.tsx` | Paginacja z numerami stron i ellipsis |
| `apps/web/src/components/listings/listing-form.tsx` | Formularz tworzenia/edycji: sekcje (info, cena/parametry, adres), walidacja |
| `apps/web/src/components/listings/index.ts` | Barrel export |
| `apps/web/src/app/(dashboard)/dashboard/listings/page.tsx` | Lista ofert: grid, filtry, paginacja, empty state |
| `apps/web/src/app/(dashboard)/dashboard/listings/new/page.tsx` | Strona dodawania nowej oferty |
| `apps/web/src/app/(dashboard)/dashboard/listings/[id]/page.tsx` | Szczegóły oferty: cena, parametry, opis, status management, lokalizacja, metadata |
| `apps/web/src/app/(dashboard)/dashboard/listings/[id]/edit/page.tsx` | Edycja oferty z pre-filled formularzem |

### Zmodyfikowane pliki

| Plik | Zmiana |
|------|--------|
| `apps/web/src/app/(dashboard)/dashboard/[...slug]/page.tsx` | Usunięto `listings` z ROUTE_LABELS (ma własne strony) |

### Strony

| Ścieżka | Typ | Opis |
|---------|-----|------|
| `/dashboard/listings` | Protected | Lista ofert z filtrami i paginacją |
| `/dashboard/listings/new` | Protected | Formularz dodawania nowej oferty |
| `/dashboard/listings/:id` | Protected | Szczegóły oferty + zarządzanie statusem |
| `/dashboard/listings/:id/edit` | Protected | Edycja istniejącej oferty |

### Funkcjonalności

- **Lista ofert**: Grid 3-kolumnowy, filtry (search, propertyType, transactionType, status), paginacja z numerami stron
- **Karta oferty**: Typ + transakcja, status badge, tytuł, lokalizacja, parametry (powierzchnia, pokoje, łazienki), cena PLN, data utworzenia
- **Szczegóły oferty**: Cena + cena/m², parametry, opis, zarządzanie statusem (context-aware actions), metadata (daty), lokalizacja
- **Formularz**: 3 sekcje (info, cena/parametry, adres), Zod validation, tryb create/edit z defaultValues
- **Status transitions**: draft→active, active→reserved/sold/rented/withdrawn, reserved→active/sold/rented, withdrawn→active/archived
- **Empty states**: Osobne dla "brak ofert" i "brak wyników" (z filtrami)
- **Loading states**: Spinner przy ładowaniu danych
- **Error handling**: Globalne errory w formularzu, error states na listach

### Przetestowane ✅

- Build kompiluje się bez błędów
- Routing: /dashboard/listings, /new, /[id], /[id]/edit — wszystkie zarejestrowane
- Catch-all [...slug] nie koliduje z listings routes

---

## Krok 4: Listings module (backend)

> Data: 2026-04-18

### Architektura

- **Entities**: `Listing`, `ListingImage`, `Address` — pełny model danych nieruchomości
- **Ownership**: Agent-scoped — każdy agent widzi i edytuje tylko swoje oferty
- **Filtrowanie**: propertyType, status, transactionType, city, price range, area range, rooms, search (title/description)
- **Paginacja**: page/limit z meta (total, totalPages)
- **Sortowanie**: price, createdAt, areaM2 (ASC/DESC)
- **Soft delete**: Aktywne oferty → archiwizowane, drafty → hard delete
- **Auto publishedAt**: Ustawiany automatycznie przy pierwszej aktywacji

### Utworzone pliki

| Plik | Opis |
|------|------|
| `apps/api/src/listings/entities/listing.entity.ts` | Listing entity — UUID PK, title, description, propertyType, status, transactionType, price, currency, areaM2, rooms, bathrooms, floor, totalFloors, yearBuilt, isPremium, publishedAt, timestamps |
| `apps/api/src/listings/entities/listing-image.entity.ts` | ListingImage entity — url, order, isPrimary, altText, ManyToOne→Listing |
| `apps/api/src/listings/entities/address.entity.ts` | Address entity — street, city, postalCode, district, voivodeship, lat, lng, OneToOne→Listing |
| `apps/api/src/listings/dto/create-listing.dto.ts` | CreateListingDto + CreateAddressDto z pełną walidacją class-validator |
| `apps/api/src/listings/dto/update-listing.dto.ts` | UpdateListingDto + UpdateAddressDto — wszystkie pola opcjonalne |
| `apps/api/src/listings/dto/listing-query.dto.ts` | ListingQueryDto — filtry, paginacja (page/limit), sortowanie (sortBy/sortOrder) |
| `apps/api/src/listings/listings.service.ts` | CRUD: create, findAll (z QueryBuilder, filtry, paginacja), findOne, update, remove (soft/hard), resolveAgent, assertOwnership |
| `apps/api/src/listings/listings.controller.ts` | REST: POST, GET (list), GET :id, PATCH :id, DELETE :id |
| `apps/api/src/listings/listings.module.ts` | TypeOrmModule.forFeature([Listing, ListingImage, Address, Agent]) |

### Zmodyfikowane pliki

| Plik | Zmiana |
|------|--------|
| `apps/api/src/app.module.ts` | Import ListingsModule |

### Endpointy API

| Metoda | Ścieżka | Auth | Opis |
|--------|---------|------|------|
| POST | `/api/listings` | ✅ JWT | Utwórz nową ofertę (status: draft) |
| GET | `/api/listings` | ✅ JWT | Lista ofert agenta (paginacja, filtry, sortowanie) |
| GET | `/api/listings/:id` | ✅ JWT | Szczegóły oferty |
| PATCH | `/api/listings/:id` | ✅ JWT | Aktualizacja oferty (+ auto publishedAt przy aktywacji) |
| DELETE | `/api/listings/:id` | ✅ JWT | Archiwizuj (active) lub usuń (draft) |

### Filtry (query params)

| Parametr | Typ | Opis |
|----------|-----|------|
| `propertyType` | enum | apartment, house, land, commercial, office, garage |
| `status` | enum | draft, active, reserved, sold, rented, withdrawn, archived |
| `transactionType` | enum | sale, rent |
| `city` | string | Wyszukiwanie po mieście (LIKE, case-insensitive) |
| `priceMin` / `priceMax` | number | Zakres cenowy |
| `areaMin` / `areaMax` | number | Zakres powierzchni |
| `roomsMin` | number | Minimalna liczba pokoi |
| `search` | string | Wyszukiwanie w tytule i opisie |
| `page` | number | Numer strony (default: 1) |
| `limit` | number | Wyników na stronę (default: 20, max: 100) |
| `sortBy` | string | Kolumna sortowania: price, createdAt, areaM2 |
| `sortOrder` | string | ASC lub DESC (default: DESC) |

### Przetestowane ✅

- POST /api/listings → tworzy ofertę z adresem (status: draft)
- GET /api/listings → paginacja + filtrowanie po mieście
- PATCH /api/listings/:id → zmiana statusu na active, auto publishedAt
- DELETE /api/listings/:id → 204 (archiwizacja aktywnej oferty)
- Ownership guard — agent widzi tylko swoje oferty
- Walidacja DTO — class-validator na wszystkich polach

---

## Krok 3: Auth module (frontend)

> Data: 2026-04-18

### Architektura

- **Route Groups**: `(marketing)`, `(auth)`, `(dashboard)` — separacja layoutów
- **AuthProvider**: React Context z login/register/logout, token management w localStorage
- **Zod Schemas**: Frontend walidacja identyczna z backend DTOs
- **API Client**: Reusable `apiFetch()` wrapper z auto-attach JWT Bearer token

### Utworzone pliki

| Plik | Opis |
|------|------|
| `apps/web/src/lib/api-client.ts` | Fetch wrapper: auto JWT, JSON serialize, ApiError class |
| `apps/web/src/lib/auth.ts` | Auth types, Zod schemas (login/register), token helpers |
| `apps/web/src/hooks/use-auth-form.ts` | Lightweight form hook z Zod validation |
| `apps/web/src/contexts/auth-context.tsx` | AuthProvider + useAuth hook: login, register, logout, fetchUser |
| `apps/web/src/components/auth/auth-form-field.tsx` | Reusable labelled input z error display |
| `apps/web/src/components/dashboard/sidebar.tsx` | Sidebar z nav items, logo, logout button |
| `apps/web/src/components/dashboard/topbar.tsx` | Topbar z user avatar, initials, notifications placeholder |
| `apps/web/src/app/(marketing)/layout.tsx` | Marketing layout: Navbar + Footer wrapper |
| `apps/web/src/app/(auth)/layout.tsx` | Auth layout: centered card, logo, gradient bg |
| `apps/web/src/app/(auth)/login/page.tsx` | Strona logowania z walidacją Zod |
| `apps/web/src/app/(auth)/register/page.tsx` | Strona rejestracji: imię, nazwisko, email, hasło |
| `apps/web/src/app/(dashboard)/layout.tsx` | Dashboard shell: sidebar + topbar + loading state |
| `apps/web/src/app/(dashboard)/dashboard/page.tsx` | Dashboard home: greeting, stat cards, placeholders |
| `apps/web/src/middleware.ts` | Next.js middleware: public/protected route handling |

### Zmodyfikowane pliki

| Plik | Zmiana |
|------|--------|
| `apps/web/src/app/layout.tsx` | Dodano `<AuthProvider>` wrapper |
| `apps/web/src/app/(marketing)/page.tsx` | Przeniesiono z `/page.tsx`, usunięto Navbar/Footer (teraz w layout) |
| `apps/web/package.json` | Dodano zod |

### Strony

| Ścieżka | Typ | Opis |
|---------|-----|------|
| `/` | Public | Landing page (marketing) |
| `/login` | Public | Formularz logowania |
| `/register` | Public | Formularz rejestracji |
| `/dashboard` | Protected | Panel agenta z stat cards |

### Przetestowane ✅

- Build kompiluje się bez błędów
- Route groups poprawnie rozdzielają layouty
- Landing page działa z Navbar/Footer z marketing layout
- Login/Register renderują się z walidacją Zod
- Dashboard z sidebar + topbar + stat cards

---

*Dokument zarządzany przez zespół EstateFlow. Każda zmiana powinna być oznaczona datą i numerem kroku.*
