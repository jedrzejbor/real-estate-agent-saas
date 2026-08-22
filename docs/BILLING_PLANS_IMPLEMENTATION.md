# Wdrożenie planów i billingowego — specyfikacja techniczna

> Data: 5 czerwca 2026  
> Status: Iteracja 6 zakończona — publiczny cennik i upgrade flow korzystają z katalogu planów
> Kontekst: Aktualnie plany są hardcodowane w `switch/case` w `AgencyPlanService`. Brak custom planów, brak cen, brak checkout flow.

---

## 1. Matryca planów

### 1.1 Limity zasobów

| Zasób | Free | Starter | Professional | Enterprise | Custom |
|-------|-----:|--------:|-------------:|-----------:|--------|
| Aktywne oferty | **5** | **25** | **200** | ∞ | per agencja |
| Klienci | **25** | **250** | **2 500** | ∞ | per agencja |
| Spotkania / mies. | **20** | **150** | **1 000** | ∞ | per agencja |
| Użytkownicy w workspace | **1** | **1** | **5** | ∞ | per agencja |
| Zdjęcia na ofertę | **15** | **30** | **50** | ∞ | per agencja |

> `∞` = `null` w bazie = brak limitu  
> `Custom` = wartości pobierane z `agency.planOverrides`, nie z hardcoded switch

### 1.2 Funkcje (feature flags)

| Funkcja | Free | Starter | Professional | Enterprise | Custom |
|---------|:----:|:-------:|:------------:|:----------:|--------|
| Dashboard i CRM | ✅ | ✅ | ✅ | ✅ | konfigurowalny |
| Publiczne oferty | ✅ | ✅ | ✅ | ✅ | konfigurowalny |
| Formularze leadowe | ✅ | ✅ | ✅ | ✅ | konfigurowalny |
| Raport overview | ✅ | ✅ | ✅ | ✅ | konfigurowalny |
| Raport oferty (basic) | ✅ | ✅ | ✅ | ✅ | konfigurowalny |
| Raport klienci (basic) | ✅ | ✅ | ✅ | ✅ | konfigurowalny |
| Raport spotkania (basic) | ❌ | ✅ | ✅ | ✅ | konfigurowalny |
| Custom branding | ❌ | ❌ | ✅ | ✅ | konfigurowalny |
| Multi-user workspace | ❌ | ❌ | ✅ | ✅ | konfigurowalny |
| Własna domena (brandowa strona) | ❌ | ❌ | ❌ | ✅ | konfigurowalny |
| API access | ❌ | ❌ | ❌ | ✅ | konfigurowalny |
| Dedykowany opiekun | ❌ | ❌ | ❌ | ✅ | konfigurowalny |

### 1.3 Cennik (PLN, rozliczenie miesięczne)

| Plan | Cena mies. | Cena rocznie (rabat) | Stripe Price ID |
|------|----------:|---------------------:|-----------------|
| Free | **0 zł** | 0 zł | — |
| Starter | **99 zł** | 990 zł (–16%) | `price_starter_monthly` / `price_starter_yearly` |
| Professional | **249 zł** | 2 490 zł (–16%) | `price_professional_monthly` / `price_professional_yearly` |
| Enterprise | **na zapytanie** | na zapytanie | — (manual) |
| Custom | **indywidualny** | indywidualny | — (manual) |

> Ceny i Stripe Price ID są przechowywane w tabeli `plan_catalog`. Zmienne środowiskowe służą tylko do sekretów providerów płatności, np. `STRIPE_SECRET_KEY`, nie do definicji planów.

---

## 2. Architektura — stan aktualny vs docelowy

### Stan aktualny ❌

```
Agency.plan = "free" | "starter" | "professional" | "enterprise"
                ↓
AgencyPlanService.getLimits(plan) → switch/case hardcoded
AgencyPlanService.getFeatures(plan) → switch/case hardcoded
```

**Problemy:**
- zmiana limitu wymaga deploy'u kodu
- brak custom planu per agencja
- brak cen w systemie
- brak billing pól (`billingCustomerId`, `currentPeriodEnd` itp.)

### Stan docelowy ✅

```
Agency.plan = "free" | "starter" | "professional" | "enterprise" | "custom"
Agency.planOverrides = { limits: {...}, features: {...} }  ← JSONB, nullable
Agency.billingCustomerId = "cus_xxx"                       ← Stripe customer
Agency.billingSubscriptionId = "sub_xxx"                   ← Stripe subscription
Agency.currentPeriodEnd = Date                             ← kiedy wygasa
Agency.trialEndsAt = Date                                  ← kiedy kończy trial
                ↓
AgencyPlanService.getEntitlements(agency):
  1. pobierz bazowe limity/features z PLAN_CATALOG[agency.plan]
  2. jeśli agency.planOverrides → merge (override ma priorytet)
  3. zwróć wynikowe entitlements
```

---

## 3. Wymagane zmiany w bazie danych

### 3.1 Migracja — nowe pola na tabeli `agencies`

```sql
-- Migracja: 20260605_agency_billing_and_custom_plan.sql

BEGIN;

-- Plan custom i overrides
ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS plan_overrides jsonb DEFAULT NULL;

-- Billing fields (Stripe / PayU)
ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS billing_customer_id varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS billing_subscription_id varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS billing_interval varchar(20) DEFAULT NULL,  -- 'monthly' | 'yearly'
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS plan_changed_at timestamptz DEFAULT NULL;

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_agencies_billing_customer ON agencies(billing_customer_id);
CREATE INDEX IF NOT EXISTS idx_agencies_billing_subscription ON agencies(billing_subscription_id);

COMMIT;
```

### 3.2 Nowa tabela `plan_catalog` (źródło prawdy dla standardowych planów)

```sql
-- Wymagane: plany standardowe muszą być edytowalne przez panel admina bez deploy'u.

CREATE TABLE IF NOT EXISTS plan_catalog (
  code varchar(50) PRIMARY KEY,           -- 'free', 'starter', 'professional', 'enterprise'
  label varchar(100) NOT NULL,
  description text,
  price_monthly_pln int DEFAULT 0,        -- cena w groszach (99 zł = 9900)
  price_yearly_pln int DEFAULT 0,
  stripe_price_id_monthly varchar(255),
  stripe_price_id_yearly varchar(255),
  limits jsonb NOT NULL DEFAULT '{}',     -- { activeListings: 5, clients: 25, ... }
  features jsonb NOT NULL DEFAULT '{}',   -- { customBranding: false, multiUser: false, ... }
  is_public boolean DEFAULT true,         -- czy pokazywać na stronie cennik
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed danych
INSERT INTO plan_catalog (code, label, price_monthly_pln, price_yearly_pln, limits, features, sort_order) VALUES
('free', 'Free', 0, 0,
  '{"activeListings":5,"clients":25,"monthlyAppointments":20,"users":1,"imagesPerListing":15}',
  '{"reportsOverview":true,"reportsListingsBasic":true,"reportsClientsBasic":true,"reportsAppointmentsBasic":false,"publicListings":true,"publicLeadForms":true,"customBranding":false,"multiUser":false,"customDomain":false,"apiAccess":false,"dedicatedSupport":false}',
  0),
('starter', 'Starter', 9900, 99000,
  '{"activeListings":25,"clients":250,"monthlyAppointments":150,"users":1,"imagesPerListing":30}',
  '{"reportsOverview":true,"reportsListingsBasic":true,"reportsClientsBasic":true,"reportsAppointmentsBasic":true,"publicListings":true,"publicLeadForms":true,"customBranding":false,"multiUser":false,"customDomain":false,"apiAccess":false,"dedicatedSupport":false}',
  1),
('professional', 'Professional', 24900, 249000,
  '{"activeListings":200,"clients":2500,"monthlyAppointments":1000,"users":5,"imagesPerListing":50}',
  '{"reportsOverview":true,"reportsListingsBasic":true,"reportsClientsBasic":true,"reportsAppointmentsBasic":true,"publicListings":true,"publicLeadForms":true,"customBranding":true,"multiUser":true,"customDomain":false,"apiAccess":false,"dedicatedSupport":false}',
  2),
('enterprise', 'Enterprise', 0, 0,
  '{"activeListings":null,"clients":null,"monthlyAppointments":null,"users":null,"imagesPerListing":null}',
  '{"reportsOverview":true,"reportsListingsBasic":true,"reportsClientsBasic":true,"reportsAppointmentsBasic":true,"publicListings":true,"publicLeadForms":true,"customBranding":true,"multiUser":true,"customDomain":true,"apiAccess":true,"dedicatedSupport":true}',
  3)
ON CONFLICT (code) DO NOTHING;
```

---

## 4. Zmiany w kodzie backendowym

### 4.1 Aktualizacja `Agency` entity

**Plik:** `apps/api/src/users/entities/agency.entity.ts`

Dodać pola:
```typescript
@Column({ type: 'jsonb', name: 'plan_overrides', nullable: true })
planOverrides?: AgencyPlanOverrides | null;

@Column({ type: 'varchar', length: 255, name: 'billing_customer_id', nullable: true })
billingCustomerId?: string | null;

@Column({ type: 'varchar', length: 255, name: 'billing_subscription_id', nullable: true })
billingSubscriptionId?: string | null;

@Column({ type: 'varchar', length: 20, name: 'billing_interval', nullable: true })
billingInterval?: 'monthly' | 'yearly' | null;

@Column({ type: 'timestamptz', name: 'current_period_end', nullable: true })
currentPeriodEnd?: Date | null;

@Column({ type: 'timestamptz', name: 'trial_ends_at', nullable: true })
trialEndsAt?: Date | null;
```

### 4.2 Nowy interfejs `AgencyPlanOverrides`

**Plik:** `apps/api/src/users/agency-plan.service.ts`

```typescript
export interface AgencyPlanOverrides {
  limits?: Partial<AgencyPlanLimits>;
  features?: Partial<AgencyPlanFeatures>;
  label?: string;           // np. "Plan Kowalski Nieruchomości"
  priceMonthlyPln?: number; // w groszach
}
```

### 4.3 Refaktor `AgencyPlanService` — zastąpienie switch/case centralnym PLAN_CATALOG

**Plik:** `apps/api/src/users/agency-plan.service.ts`

```typescript
// Zamiast switch/case — centralny obiekt konfiguracyjny
const PLAN_CATALOG: Record<AgencyPlan, { limits: AgencyPlanLimits; features: AgencyPlanFeatures; label: string }> = {
  [AgencyPlan.FREE]: {
    label: 'Free',
    limits: { activeListings: 5, clients: 25, monthlyAppointments: 20, users: 1, imagesPerListing: 15 },
    features: { reportsOverview: true, reportsListingsBasic: true, reportsClientsBasic: true, reportsAppointmentsBasic: false, publicListings: true, publicLeadForms: true, customBranding: false, multiUser: false, customDomain: false, apiAccess: false },
  },
  [AgencyPlan.STARTER]: {
    label: 'Starter',
    limits: { activeListings: 25, clients: 250, monthlyAppointments: 150, users: 1, imagesPerListing: 30 },
    features: { reportsOverview: true, reportsListingsBasic: true, reportsClientsBasic: true, reportsAppointmentsBasic: true, publicListings: true, publicLeadForms: true, customBranding: false, multiUser: false, customDomain: false, apiAccess: false },
  },
  [AgencyPlan.PROFESSIONAL]: {
    label: 'Professional',
    limits: { activeListings: 200, clients: 2_500, monthlyAppointments: 1_000, users: 5, imagesPerListing: 50 },
    features: { reportsOverview: true, reportsListingsBasic: true, reportsClientsBasic: true, reportsAppointmentsBasic: true, publicListings: true, publicLeadForms: true, customBranding: true, multiUser: true, customDomain: false, apiAccess: false },
  },
  [AgencyPlan.ENTERPRISE]: {
    label: 'Enterprise',
    limits: { activeListings: null, clients: null, monthlyAppointments: null, users: null, imagesPerListing: null },
    features: { reportsOverview: true, reportsListingsBasic: true, reportsClientsBasic: true, reportsAppointmentsBasic: true, publicListings: true, publicLeadForms: true, customBranding: true, multiUser: true, customDomain: true, apiAccess: true },
  },
  [AgencyPlan.CUSTOM]: {
    label: 'Custom',
    limits: { activeListings: 10, clients: 100, monthlyAppointments: 50, users: 2, imagesPerListing: 20 }, // bazowe, zawsze nadpisywane przez planOverrides
    features: { reportsOverview: true, reportsListingsBasic: true, reportsClientsBasic: true, reportsAppointmentsBasic: true, publicListings: true, publicLeadForms: true, customBranding: false, multiUser: false, customDomain: false, apiAccess: false },
  },
};

// Nowa logika getEntitlements z merge overrides
getEntitlements(agency?: Agency | null): AgencyEntitlements {
  const plan = this.getPlanCode(agency?.plan);
  const status = this.getSubscriptionStatus(agency?.subscription);
  const base = PLAN_CATALOG[plan];
  const overrides = agency?.planOverrides ?? {};

  return {
    plan: {
      code: plan,
      label: overrides.label ?? base.label,
      status,
    },
    limits: { ...base.limits, ...(overrides.limits ?? {}) },
    features: { ...base.features, ...(overrides.features ?? {}) },
  };
}
```

### 4.4 Dodać `CUSTOM` do enuma

**Plik:** `apps/api/src/common/enums/index.ts`

```typescript
export enum AgencyPlan {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
  CUSTOM = 'custom',   // ← dodać
}
```

### 4.5 Endpoint admina do ustawiania custom planu

**Plik:** `apps/api/src/users/users.controller.ts` (lub nowy `admin.controller.ts`)

```
PATCH /api/admin/agencies/:id/plan
Body: {
  plan: "custom" | "free" | "starter" | "professional" | "enterprise",
  planOverrides?: {
    label?: string,
    limits?: { activeListings?: number, clients?: number, ... },
    features?: { customBranding?: boolean, multiUser?: boolean, ... }
  }
}
```

---

## 5. Zmiany w kodzie frontendowym

### 5.1 Aktualizacja typu `AuthUser`

**Plik:** `apps/web/src/lib/auth.ts`

Dodać do `entitlements.features`:
```typescript
features: {
  // ... istniejące ...
  customDomain: boolean;    // ← dodać
  apiAccess: boolean;       // ← dodać
};
```

Dodać do `agency`:
```typescript
agency: {
  // ... istniejące ...
  billingInterval: 'monthly' | 'yearly' | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
} | null;
```

### 5.2 Strona `/dashboard/upgrade` — pełna z cenami

Aktualnie pokazuje tylko formularz intencji. Docelowo:

```
┌─────────────────────────────────────────────────────────────────┐
│              Wybierz plan dla swojego biura                      │
│                                                                  │
│  [Miesięcznie]  [Rocznie -16%]      ← toggle                   │
│                                                                  │
│  ┌───────────┐  ┌───────────┐  ┌─────────────┐  ┌───────────┐ │
│  │   FREE    │  │  STARTER  │  │ PROFESSIONAL│  │ ENTERPRISE│ │
│  │   0 zł    │  │  99 zł    │  │   249 zł    │  │ Kontakt   │ │
│  │ /mies.    │  │ /mies.    │  │   /mies.    │  │           │ │
│  │           │  │           │  │  ★ Polecany │  │           │ │
│  │ 5 ofert   │  │ 25 ofert  │  │ 200 ofert   │  │ Bez limitu│ │
│  │ 25 kl.    │  │ 250 kl.   │  │ 2500 kl.    │  │           │ │
│  │           │  │           │  │ custom brand│  │           │ │
│  │[Aktualny] │  │ [Wybierz] │  │  [Wybierz]  │  │[Kontakt]  │ │
│  └───────────┘  └───────────┘  └─────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Billing provider — wybór i integracja

### Rekomendacja: Przelewy24 + Stripe (dwa tryby)

| Tryb | Kiedy | Provider |
|------|-------|----------|
| B2C polscy konsumenci (BLIK, przelew) | Małe biura, agenci solo | **Przelewy24** |
| B2B karty, faktury | Większe biura, Enterprise | **Stripe** |
| MVP self-service | Starter + Professional | **Stripe** (obsługuje PLN) |

**Decyzja MVP:** Stripe jako pierwszy, bo ma gotowe komponenty (Stripe Checkout, Billing Portal), webhooks są łatwe do wdrożenia, obsługuje PLN.

### Konfiguracja Stripe

```env
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_STARTER_MONTHLY=price_xxx
STRIPE_PRICE_STARTER_YEARLY=price_xxx
STRIPE_PRICE_PROFESSIONAL_MONTHLY=price_xxx
STRIPE_PRICE_PROFESSIONAL_YEARLY=price_xxx
```

### Webhook events do obsługi

```
checkout.session.completed        → aktywuj plan, zapisz subscription_id
customer.subscription.updated     → aktualizuj plan / current_period_end
customer.subscription.deleted     → wróć na free, subscription = canceled
invoice.payment_failed            → subscription = past_due, email do klienta
invoice.payment_succeeded         → przedłuż current_period_end
```

---

## 7. Plan wdrożenia w iteracjach

Docelowo system planów ma być zarządzalny z panelu admina. Oznacza to, że `plan_catalog` jest źródłem prawdy dla standardowych planów, a `agency.plan_overrides` służy do indywidualnych warunków dla konkretnej agencji.

### Iteracja 0 — Decyzje techniczne i kontrakt danych

Cel: ustalić stabilny model danych przed implementacją panelu i billingu.

- [x] **I0.1** — Potwierdzić, że standardowe plany (`free`, `starter`, `professional`, `enterprise`) są przechowywane w tabeli `plan_catalog`
- [x] **I0.2** — Potwierdzić, że plan indywidualny działa przez `agency.plan = 'custom'` oraz `agency.plan_overrides`
- [x] **I0.3** — Ustalić stałą listę kluczy limitów: `activeListings`, `clients`, `monthlyAppointments`, `users`, `imagesPerListing`
- [x] **I0.4** — Ustalić stałą listę feature flags: `reportsOverview`, `reportsListingsBasic`, `reportsClientsBasic`, `reportsAppointmentsBasic`, `publicListings`, `publicLeadForms`, `customBranding`, `multiUser`, `customDomain`, `apiAccess`, `dedicatedSupport`
- [x] **I0.5** — Ustalić zasadę cen: zmiana ceny w `plan_catalog` dotyczy nowych checkoutów, a aktywne subskrypcje zmieniamy osobną akcją admina
- [x] **I0.6** — Ustalić, że `null` w limitach oznacza brak limitu

#### Ustalenia po Iteracji 0

1. `plan_catalog` jest obowiązkowym źródłem prawdy dla standardowych planów. Nie używamy ENV do definicji cen, limitów, funkcji ani Stripe Price ID, bo to blokowałoby edycję planów z panelu admina.
2. `Agency.plan` przechowuje wyłącznie kod bazowego planu: `free`, `starter`, `professional`, `enterprise` albo `custom`.
3. Plan indywidualny nie tworzy osobnego rekordu w `plan_catalog`. Jest liczony jako `custom` + `agency.plan_overrides`, żeby warunki klienta były izolowane per agencja.
4. `agency.plan_overrides` może nadpisywać tylko znane klucze `limits` i `features`. Backend musi odrzucać nieznane klucze, żeby nie dopuścić do literówek typu `activeListing` lub niekontrolowanych feature flags.
5. Limity są liczbą całkowitą `>= 0` albo `null`. `null` oznacza brak limitu. Wartość `0` oznacza realny limit równy zero, np. funkcjonalność zasobu całkowicie zablokowana.
6. Ceny są przechowywane w groszach jako integer, np. `9900` = 99 zł. Enterprise i Custom mogą mieć cenę `0`, jeśli są obsługiwane manualnie.
7. Zmiana ceny w `plan_catalog` nie aktualizuje automatycznie aktywnych subskrypcji Stripe. Aktywne subskrypcje zmieniamy osobną akcją billingową/adminową, żeby uniknąć przypadkowych zmian umów z klientami.
8. Publiczny cennik pobiera tylko plany z `is_public = true`. `custom` nie jest planem publicznym.
9. `AgencyPlanService` pozostaje centralnym resolverem entitlementów. Kontrolery i serwisy domenowe mają pytać o wynikowe entitlements, a nie czytać `plan_catalog` bezpośrednio.
10. Fallback statyczny w kodzie może istnieć tylko jako zabezpieczenie testowe/awaryjne. Nie może być miejscem codziennej konfiguracji oferty.

### Iteracja 1 — Fundament entitlementów i baza danych

Cel: usunąć hardcoded `switch/case` jako główne źródło prawdy i przygotować backend pod konfigurację z bazy.

- [x] **I1.1** — Dodać `CUSTOM = 'custom'` do `AgencyPlan` w `apps/api/src/common/enums/index.ts`
- [x] **I1.2** — Stworzyć migrację `20260605_agency_billing_and_custom_plan.sql` z polami `plan_overrides`, `billing_customer_id`, `billing_subscription_id`, `billing_interval`, `current_period_end`, `trial_ends_at`, `plan_changed_at`
- [x] **I1.3** — Stworzyć tabelę `plan_catalog` z polami: `code`, `label`, `description`, `price_monthly_pln`, `price_yearly_pln`, `stripe_price_id_monthly`, `stripe_price_id_yearly`, `limits`, `features`, `is_public`, `sort_order`, `created_at`, `updated_at`
- [x] **I1.4** — Dodać seed danych dla Free, Starter, Professional i Enterprise
- [x] **I1.5** — Zaktualizować `Agency` entity o `planOverrides` i pola billingowe
- [x] **I1.6** — Zaktualizować `AgencyPlanLimits`, `AgencyPlanFeatures` i dodać `AgencyPlanOverrides`
- [x] **I1.7** — Przebudować `AgencyPlanService`, żeby liczył entitlements przez `plan_catalog + agency.plan_overrides`
- [x] **I1.8** — Dodać fallback awaryjny na statyczny katalog planów, jeśli `plan_catalog` nie jest dostępny podczas startu lub testów
- [x] **I1.9** — Dodać testy dla planu standardowego, Enterprise bez limitów i Custom z override limitów/funkcji

#### Wykonane w Iteracji 1

1. Dodano `AgencyPlan.CUSTOM`, pola billingowe i `planOverrides` w encji `Agency`.
2. Dodano migrację `apps/api/migrations/20260605_agency_billing_and_custom_plan.sql`, która tworzy pola billingowe, `plan_catalog`, constrainty bezpieczeństwa i seed planów standardowych.
3. Dodano encję `PlanCatalog` w `apps/api/src/plans/entities/plan-catalog.entity.ts`.
4. Wyciągnięto typy planów do `apps/api/src/users/agency-plan.types.ts`, żeby unikać cyklicznych importów między encją `Agency` i `AgencyPlanService`.
5. Przebudowano `AgencyPlanService` tak, żeby przy starcie ładował `plan_catalog` do cache, a synchroniczne `getEntitlements()` nadal było kompatybilne z obecnymi modułami.
6. Dodano fallback `DEFAULT_PLAN_CATALOG`, używany tylko awaryjnie i w testach.
7. Dodano defensywną normalizację JSONB: nieznane klucze są ignorowane, limity muszą być integer `>= 0` albo `null`, a feature flags muszą być boolean.
8. Dodano testy jednostkowe `apps/api/src/users/agency-plan.service.spec.ts` dla fallbacku, planu z katalogu, Enterprise bez limitów, Custom overrides i niepoprawnych wartości JSONB.

#### Weryfikacja Iteracji 1

- [x] `pnpm --filter api type-check`
- [x] `pnpm --filter api test -- agency-plan.service.spec.ts`
- [x] `pnpm --filter api test`

### Iteracja 2 — Admin API dla globalnych planów

Cel: admin może edytować ceny, limity, funkcje i widoczność standardowych planów bez deployu.

- [x] **I2.1** — Dodać moduł/kontroler admina dla planów, np. `apps/api/src/admin/admin-plans.controller.ts`
- [x] **I2.2** — Dodać `GET /api/admin/plans` — lista planów z sortowaniem
- [x] **I2.3** — Dodać `GET /api/admin/plans/:code` — szczegóły planu
- [x] **I2.4** — Dodać `PATCH /api/admin/plans/:code` — edycja ceny, limitów, funkcji, Stripe Price ID, widoczności i kolejności
- [x] **I2.5** — Dodać walidację DTO: cena w groszach, `null` jako brak limitu, komplet wymaganych feature keys
- [x] **I2.6** — Zablokować usuwanie wymaganych planów systemowych (`free`, `starter`, `professional`, `enterprise`)
- [x] **I2.7** — Dodać zasadę: Free musi mieć cenę `0`, a płatny plan publiczny powinien mieć Stripe Price ID przed checkoutem
- [x] **I2.8** — Dodać testy API dla edycji planu i walidacji niepoprawnych limitów/funkcji

#### Wykonane w Iteracji 2

1. Dodano `AdminModule` i podłączono go do `AppModule`.
2. Dodano `AdminPlansController` z endpointami:
   - `GET /api/admin/plans`
   - `GET /api/admin/plans/:code`
   - `PATCH /api/admin/plans/:code`
3. Endpointy są chronione przez `@Roles(UserRole.ADMIN)`.
4. Dodano `AdminPlansService`, który edytuje wyłącznie systemowe plany: `free`, `starter`, `professional`, `enterprise`.
5. Po aktualizacji planu serwis wywołuje `AgencyPlanService.refreshCatalog()`, więc cache entitlementów odświeża się bez restartu API.
6. Dodano `UpdatePlanDto` z jawną walidacją dozwolonych pól `limits` i `features`. Nieznane klucze są odrzucane przez globalny `ValidationPipe`.
7. Dodano regułę, że `free` musi mieć cenę `0` i nie może mieć Stripe Price ID.
8. Dla publicznych płatnych planów bez Stripe Price ID odpowiedź admin API zwraca `billingReady: false` i `billingWarnings`. Twarda blokada checkoutu zostanie dodana w Iteracji 7, gdy checkout będzie już istnieć.
9. Nie dodano endpointu usuwania planów, więc systemowe plany nie mogą zostać usunięte przez admin API.

#### Weryfikacja Iteracji 2

- [x] `pnpm --filter api type-check`
- [x] `pnpm --filter api test -- admin-plans.service.spec.ts update-plan.dto.spec.ts`
- [x] `pnpm --filter api test`

### Iteracja 3 — Admin API dla planów indywidualnych per agencja

Cel: admin może przypisać agencji plan standardowy albo zdefiniować indywidualny plan.

- [x] **I3.1** — Dodać `GET /api/admin/agencies/:id/plan` — aktualny plan, override, efektywne entitlements i usage
- [x] **I3.2** — Dodać `PATCH /api/admin/agencies/:id/plan` — zmiana planu agencji
- [x] **I3.3** — Dodać obsługę `planOverrides.label`, `priceMonthlyPln`, `priceYearlyPln`, `limits`, `features`
- [x] **I3.4** — Dodać `POST /api/admin/agencies/:id/plan/reset-overrides` — powrót do standardowej konfiguracji planu
- [x] **I3.5** — Przy zmianie limitów zwracać ostrzeżenie, jeśli aktualne zużycie przekracza nowy limit
- [x] **I3.6** — Aktualizować `plan_changed_at` przy każdej zmianie planu
- [x] **I3.7** — Dodać testy przypisania planu standardowego, custom planu i resetu override

#### Wykonane w Iteracji 3

1. Dodano `AdminAgencyPlansController` z endpointami:
   - `GET /api/admin/agencies/:id/plan`
   - `PATCH /api/admin/agencies/:id/plan`
   - `POST /api/admin/agencies/:id/plan/reset-overrides`
2. Endpointy są chronione przez `@Roles(UserRole.ADMIN)` i przyjmują `id` agencji przez `ParseUUIDPipe`.
3. Dodano `AdminAgencyPlansService`, który pobiera agencję, jej agentów, usage, wynikowe entitlements i ostrzeżenia limitów.
4. Dodano `UpdateAgencyPlanDto` z jawną walidacją `planOverrides`: dozwolone są tylko znane klucze limitów i feature flags.
5. Dla planów standardowych override’y są czyszczone. Próba ustawienia `planOverrides` na planie innym niż `custom` jest odrzucana.
6. Dla planu `custom` obsługiwane są `label`, `priceMonthlyPln`, `priceYearlyPln`, `limits` i `features`.
7. Przy każdej zmianie planu albo resecie override’ów aktualizowane jest `planChangedAt`.
8. Odpowiedź admin API zawiera `limitWarnings`, jeśli aktualne użycie przekracza nowy limit. Ostrzeżenie nie blokuje zapisu.
9. Agencje bez agentów zwracają usage równe zero bez budowania zapytań z pustym `IN`.

#### Weryfikacja Iteracji 3

- [x] `pnpm --filter api type-check`
- [x] `pnpm --filter api test -- admin-agency-plans.service.spec.ts update-agency-plan.dto.spec.ts`
- [x] `pnpm --filter api test`

### Iteracja 4 — Egzekwowanie limitów i funkcji w aplikacji

Cel: wszystkie moduły korzystają z jednego źródła entitlementów.

- [x] **I4.1** — Sprawdzić tworzenie/publikację ofert względem `limits.activeListings`
- [x] **I4.2** — Sprawdzić tworzenie klientów względem `limits.clients`
- [x] **I4.3** — Sprawdzić tworzenie spotkań względem `limits.monthlyAppointments`
- [x] **I4.4** — Sprawdzić dodawanie użytkowników workspace względem `limits.users`
- [x] **I4.5** — Sprawdzić dodawanie zdjęć do oferty względem `limits.imagesPerListing`
- [x] **I4.6** — Sprawdzić dostęp do funkcji premium przez `features.*`, np. custom branding, multi-user, custom domain, API access
- [x] **I4.7** — Ujednolicić błędy `PlanLimitReachedException` i `FeatureAccessDeniedException`, żeby zwracały limit, usage i wymagany feature
- [x] **I4.8** — Dodać testy regresji dla limitów i feature gates

#### Wykonane w Iteracji 4

1. Zweryfikowano istniejące egzekwowanie `limits.activeListings` przy tworzeniu ofert oraz przejmowaniu publicznych zgłoszeń.
2. Zweryfikowano `limits.clients` przy tworzeniu klienta oraz imporcie klientów CSV.
3. Zweryfikowano `limits.monthlyAppointments` przy tworzeniu spotkań.
4. Zweryfikowano `limits.imagesPerListing` przy dodawaniu zdjęć do oferty.
5. Zweryfikowano aktualny stan `limits.users`: nie ma jeszcze endpointu zapraszania/dodawania użytkowników workspace, więc nie ma miejsca, w którym można realnie egzekwować ten limit. Payload limitów został przygotowany na resource `users`.
6. Zweryfikowano feature gates:
   - `publicListings` blokuje publikację ofert,
   - `customBranding` wymusza branding EstateFlow, jeśli plan nie pozwala go zdjąć,
   - `reportsAppointmentsBasic` blokuje raport spotkań,
   - `customDomain`, `apiAccess`, `dedicatedSupport` nie mają jeszcze endpointów domenowych do zablokowania.
7. Ujednolicono `PlanLimitReachedException`: payload zawiera `limit`, `usage`, `currentUsage`, `attemptedUsage`, `resource`, `planCode`, `upgradeRequired`.
8. Ujednolicono `FeatureAccessDeniedException`: payload zawiera `feature`, `requiredFeature`, `planCode`, `upgradeRequired`.
9. Uzupełniono wszystkie istniejące miejsca rzucania `PlanLimitReachedException` o poprawne `attemptedUsage`, w tym batch import klientów i upload wielu zdjęć.
10. Dodano testy regresji payloadów dla `PlanLimitReachedException` i `FeatureAccessDeniedException`.

#### Weryfikacja Iteracji 4

- [x] `pnpm --filter api type-check`
- [x] `pnpm --filter api test -- plan-limit-reached.exception.spec.ts feature-access-denied.exception.spec.ts`
- [x] `pnpm --filter api test`

### Iteracja 5 — Panel admina do zarządzania planami

Cel: admin może konfigurować plany bez dotykania bazy i bez deployu.

- [x] **I5.1** — Dodać widok listy planów w panelu admina
- [x] **I5.2** — Dodać formularz edycji planu standardowego: nazwa, opis, ceny, Stripe Price ID, widoczność, kolejność
- [x] **I5.3** — Dodać edytor limitów: inputy numeryczne + opcja "bez limitu" (`null`)
- [x] **I5.4** — Dodać edytor funkcji: toggles dla wszystkich feature flags
- [x] **I5.5** — Dodać podgląd karty planu tak, jak będzie wyglądała w cenniku
- [x] **I5.6** — Dodać widok agencji z aktualnym planem, statusem subskrypcji i usage
- [x] **I5.7** — Dodać konfigurator planu indywidualnego dla agencji
- [x] **I5.8** — Dodać podgląd efektywnych entitlementów po merge `plan_catalog + plan_overrides`

#### Wykonane w Iteracji 5

1. Dodano panel `/dashboard/admin/plans` dostępny z dashboardowego sidebara dla roli `admin`.
2. Dodano frontendowy klient `apps/web/src/lib/billing-plans.ts` dla admin API planów i planów agencji.
3. Dodano listę globalnych planów z informacją o cenie i gotowości billingowej.
4. Dodano formularz edycji planu globalnego: nazwa, opis, ceny, Stripe Price ID, widoczność publiczna i kolejność.
5. Dodano edytor limitów z obsługą `null` jako "bez limitu".
6. Dodano edytor feature flags dla wszystkich znanych funkcji.
7. Dodano listę agencji z wyszukiwaniem i aktualnym planem.
8. Dodano konfigurator planu agencji: wybór planu standardowego albo `custom`, custom label, cena i override limitów/funkcji.
9. Dodano podgląd usage i ostrzeżeń limitów dla wybranej agencji.
10. Dodano backendowy endpoint pomocniczy `GET /api/admin/agencies`, żeby panel nie wymagał ręcznego wpisywania UUID agencji.
11. Naprawiono build web przez owinięcie publicznych komponentów feedbacku w `Suspense`, bo Next 16 wymaga boundary dla `useSearchParams()`.

#### Weryfikacja Iteracji 5

- [x] `pnpm --filter api type-check`
- [x] `pnpm --filter api test -- admin-agency-plans.service.spec.ts`
- [x] `pnpm --filter api test`
- [x] `pnpm --filter web type-check`
- [x] `pnpm --filter web build` (wymaga dostępu sieciowego do Google Fonts używanych przez `next/font`)

### Iteracja 6 — Publiczny cennik i upgrade flow

Cel: frontend użytkownika korzysta z planów z bazy, a nie z hardcoded danych.

- [x] **I6.1** — Dodać publiczny endpoint `GET /api/plans` zwracający tylko `is_public = true`
- [x] **I6.2** — Przepisać `/dashboard/upgrade`, żeby pobierał plany z API
- [x] **I6.3** — Dodać publiczną stronę `/cennik`
- [x] **I6.4** — Dodać toggle miesięcznie/rocznie
- [x] **I6.5** — Oznaczyć aktualny plan użytkownika
- [x] **I6.6** — Ukrywać Custom z publicznego cennika
- [x] **I6.7** — Enterprise pokazywać jako "Kontakt" zamiast checkoutu
- [x] **I6.8** — Zaktualizować `AuthUser` na froncie o nowe pola features i billing info

#### Wykonane w Iteracji 6

1. Dodano `PlansModule`, `PlansController` i `PlansService` w API.
2. Dodano publiczny endpoint `GET /api/plans`, oznaczony `@Public()`, który zwraca tylko rekordy `plan_catalog.is_public = true`.
3. Publiczna odpowiedź planów nie wystawia `stripePriceIdMonthly`, `stripePriceIdYearly`, `isPublic`, `createdAt` ani `updatedAt`; Stripe Price ID pozostają tylko po stronie admin API.
4. Dodano test `apps/api/src/plans/plans.service.spec.ts`, który sprawdza filtrowanie publicznego katalogu i brak provider-specific billing identifiers w odpowiedzi.
5. Rozszerzono `AuthService.serializeUser()` o pola `agency.billingInterval`, `agency.currentPeriodEnd` i `agency.trialEndsAt`.
6. Rozszerzono frontendowy `AuthUser` o billing fields oraz feature flags: `customDomain`, `apiAccess`, `dedicatedSupport`.
7. Dodano `fetchPublicPlans()` w `apps/web/src/lib/billing-plans.ts` z `skipAuth: true`.
8. Dodano wspólne helpery prezentacji publicznych planów w `apps/web/src/lib/public-pricing.ts`.
9. Przepisano `/dashboard/upgrade`, żeby:
   - pobierał ceny, limity i funkcje z `GET /api/plans`,
   - obsługiwał przełącznik miesięcznie/rocznie,
   - oznaczał aktualny plan użytkownika,
   - ukrywał `custom`,
   - pokazywał Enterprise jako kontakt,
   - nadal zapisywał intencję upgrade w analityce.
10. Dodano publiczną stronę `/cennik` w marketingowym layoucie, pobierającą plany z API bez autoryzacji.
11. Dla Enterprise w publicznym cenniku ustawiono akcję kontaktową zamiast checkoutu, bo checkout Stripe jest dopiero w Iteracji 7.
12. Po weryfikacji panelu admina dodano defensywne dosiewanie brakujących planów systemowych do `plan_catalog`. Jeśli baza została utworzona przez `synchronize` albo migracja seedująca nie została uruchomiona, API tworzy brakujące rekordy `free`, `starter`, `professional`, `enterprise` bez nadpisywania istniejących edycji admina.
13. Ustandaryzowano sekcję cennika na stronie głównej: zamiast lokalnej hardcodowanej tablicy planów używa teraz `GET /api/plans`, tych samych helperów prezentacji co `/cennik` i pokazuje nazwy, ceny, limity oraz funkcje zadeklarowane w katalogu planów.
14. Dodano wybór pakietu przy rejestracji konta agenta. Formularz pobiera publiczne plany z `GET /api/plans`, obsługuje preselect z linków typu `/register?plan=professional`, a backend zapisuje wybrany plan jako konfigurację startową agencji. Płatności Stripe pozostają do wdrożenia w Iteracji 7.

#### Weryfikacja Iteracji 6

- [x] `pnpm --filter api type-check`
- [x] `pnpm --filter api test -- plans.service.spec.ts`
- [x] `pnpm --filter api test`
- [x] `pnpm --filter api test -- agency-plan.service.spec.ts admin-plans.service.spec.ts`
- [x] `pnpm --filter web type-check`
- [x] `pnpm --filter web build` (wymaga dostępu sieciowego do Google Fonts używanych przez `next/font`)
- [x] `git diff --check`

### Iteracja 7 — Stripe checkout i billing portal

Cel: podłączyć automatyczne płatności dla planów self-service.

- [ ] **I7.1** — Zainstalować Stripe SDK w API: `pnpm --filter api add stripe`
- [ ] **I7.2** — Dodać konfigurację ENV: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, URL sukcesu i anulowania
- [ ] **I7.3** — Dodać `POST /api/billing/checkout` — tworzy Stripe Checkout Session na podstawie `plan_catalog.stripe_price_id_*`
- [ ] **I7.4** — Dodać `POST /api/billing/webhook` — obsługa webhooków z signature verification
- [ ] **I7.5** — Dodać `POST /api/billing/portal` — Stripe Billing Portal
- [ ] **I7.6** — Dodać `/dashboard/upgrade/success` i `/dashboard/upgrade/cancel`
- [ ] **I7.7** — Po `checkout.session.completed` zapisać `Agency.plan`, `billingCustomerId`, `billingSubscriptionId`, `billingInterval`, `currentPeriodEnd`
- [ ] **I7.8** — Po `customer.subscription.updated` aktualizować plan, status i `currentPeriodEnd`
- [ ] **I7.9** — Po `customer.subscription.deleted` wracać na `plan = 'free'` i `subscription = 'canceled'`
- [ ] **I7.10** — Po `invoice.payment_failed` ustawiać `subscription = 'past_due'` i wysyłać powiadomienie

### Iteracja 8 — Faktury VAT, audyt i produkcyjne zabezpieczenia

Cel: przygotować system do realnej obsługi klientów i zmian administracyjnych.

- [ ] **I8.1** — Zbierać dane firmowe/NIP w checkout lub profilu rozliczeniowym
- [ ] **I8.2** — Zdecydować: Stripe Tax, Fakturownia, InFakt albo ręczna obsługa faktur na MVP
- [ ] **I8.3** — Dodać email z fakturą lub linkiem do faktury po płatności
- [ ] **I8.4** — Dodać tabelę `plan_change_audit`
- [ ] **I8.5** — Logować każdą zmianę globalnego planu i planu agencji: kto, kiedy, before, after, reason
- [ ] **I8.6** — Dodać monitoring błędów webhooków
- [ ] **I8.7** — Dodać alert dla nieobsłużonych eventów Stripe
- [ ] **I8.8** — Dodać checklistę testów produkcyjnych dla upgrade, downgrade, anulowania i past due

---

## 8. Jak definiować custom plan dla konkretnego biura

Po wdrożeniu iteracji 1-3 admin może przez panel, API albo awaryjnie bezpośrednio przez bazę przypisać agencji plan indywidualny.

```sql
-- Przykład: custom plan dla "Kowalski Nieruchomości"
UPDATE agencies
SET 
  plan = 'custom',
  plan_overrides = '{
    "label": "Plan Premium Kowalski",
    "priceMonthlyPln": 19900,
    "priceYearlyPln": 199000,
    "limits": {
      "activeListings": 50,
      "clients": 500,
      "monthlyAppointments": 300,
      "users": 3,
      "imagesPerListing": 40
    },
    "features": {
      "customBranding": true,
      "multiUser": true,
      "customDomain": false,
      "apiAccess": false
    }
  }'::jsonb
WHERE name = 'Kowalski Nieruchomości';
```

Lub przez endpoint admina:
```http
PATCH /api/admin/agencies/UUID/plan
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "plan": "custom",
  "planOverrides": {
    "label": "Plan Premium Kowalski",
    "priceMonthlyPln": 19900,
    "priceYearlyPln": 199000,
    "limits": {
      "activeListings": 50,
      "clients": 500,
      "monthlyAppointments": 300,
      "users": 3,
      "imagesPerListing": 40
    },
    "features": {
      "customBranding": true,
      "multiUser": true,
      "customDomain": false,
      "apiAccess": false
    }
  }
}
```

---

## 9. Kolejność wdrożenia vs. launch

### Krytyczne przed launch

- [x] **Must have** — Iteracja 0: decyzje techniczne i kontrakt danych
- [x] **Must have** — Iteracja 1: `plan_catalog`, `plan_overrides`, entitlements z bazy
- [x] **Must have** — Iteracja 3: ręczne przypisanie agencji do planu standardowego lub custom
- [x] **Must have** — Iteracja 4: egzekwowanie limitów i funkcji

Bez tego można mieć cennik, ale system nie będzie realnie kontrolował dostępu, limitów i indywidualnych warunków klientów.

### Ważne na launch

- [x] **Should have** — Iteracja 2: admin API dla globalnych planów
- [x] **Should have** — Iteracja 5: podstawowy panel admina dla planów i agencji
- [x] **Should have** — Iteracja 6: publiczny cennik i `/dashboard/upgrade`

To umożliwia sprzedaż i obsługę klientów bez deployu przy każdej zmianie oferty.

### Po launch / gdy pojawią się płatni klienci

- [ ] **Can follow** — Iteracja 7: Stripe checkout i billing portal
- [ ] **Can follow** — Iteracja 8: faktury VAT, audyt i produkcyjne zabezpieczenia

Stripe powinien być warstwą płatności nad modelem planów, nie źródłem prawdy o limitach i funkcjach.

---

## 10. Pliki do modyfikacji — podsumowanie

| Plik | Zmiana |
|------|--------|
| `apps/api/src/common/enums/index.ts` | Dodać `CUSTOM = 'custom'` do `AgencyPlan` |
| `apps/api/src/users/agency-plan.service.ts` | Pobierać bazę planu z `plan_catalog`, dodać merge `agency.planOverrides` |
| `apps/api/src/users/entities/agency.entity.ts` | Dodać `planOverrides`, billing fields |
| `apps/api/migrations/20260605_agency_billing_and_custom_plan.sql` | Nowa migracja |
| `apps/api/src/plans/entities/plan-catalog.entity.ts` | Nowa encja `PlanCatalog` |
| `apps/api/src/plans/plans.service.ts` | Publiczny odczyt planów |
| `apps/api/src/admin/admin-plans.controller.ts` | Admin API do edycji globalnych planów |
| `apps/api/src/admin/admin-agency-plans.controller.ts` | Admin API do przypisywania planów agencjom |
| `apps/api/src/admin/dto/*` | DTO i walidacja edycji planów oraz custom override |
| `apps/api/src/admin/entities/plan-change-audit.entity.ts` | Audyt zmian planów |
| `apps/web/src/lib/auth.ts` | Zaktualizować `AuthUser` |
| `apps/web/src/app/(admin)/admin/plans/*` | Panel admina do zarządzania globalnymi planami |
| `apps/web/src/app/(admin)/admin/agencies/*` | Panel admina do przypisywania planów agencjom |
| `apps/web/src/app/(dashboard)/dashboard/upgrade/page.tsx` | Przepisać na pełny cennik |
| `apps/web/src/app/(marketing)/cennik/page.tsx` | Nowa strona publiczna |
