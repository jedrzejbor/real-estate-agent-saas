# Rebranding aplikacji na PodAdresem - mapa użycia nazwy

Data audytu: 2026-07-07  
Nowa nazwa produktu: `PodAdresem`  
Dotychczasowa nazwa produktu: `EstateFlow`

## Cel dokumentu

Ten dokument opisuje miejsca, w których repozytorium używa obecnej nazwy aplikacji
albo identyfikatorów pochodnych od starego brandu. Ma służyć jako checklist do
zmiany nazwy aplikacji na `PodAdresem`.

Skan obejmował wystąpienia:

- `EstateFlow`
- `estateflow`
- `Real Estate Agent SaaS`
- `real-estate-agent-saas`
- `real_estate_saas`

Wynik skanu: 416 wystąpień w 110 plikach, z wyłączeniem `node_modules` i
`pnpm-lock.yaml`.

## Decyzja nazewnicza

Rekomendowana forma widoczna dla użytkownika:

- nazwa produktu: `PodAdresem`
- blog: `Blog PodAdresem`
- branding publiczny: `Powered by PodAdresem`
- panel właściciela: `Panel właściciela PodAdresem`
- reset hasła: `Reset hasła PodAdresem`

Do decyzji przed wdrożeniem:

- domena produkcyjna, np. `podadresem.pl`
- e-maile kontaktowe, np. `legal@podadresem.pl`, `abuse@podadresem.pl`,
  `support@podadresem.pl`, `kontakt@podadresem.pl`
- czy zmieniamy techniczne klucze `estateflow-*`, czy zostawiamy je jako legacy
- czy zmieniamy nazwę paczki/repo `real-estate-agent-saas`, czy tylko nazwę produktu
- czy pole API `estateflowBrandingEnabled` migrujemy na nową nazwę, czy zostawiamy
  jako stabilny kontrakt techniczny na czas przejściowy

## Priorytety migracji

| Priorytet | Zakres | Rekomendacja |
| --- | --- | --- |
| P0 | Widoczne teksty w UI, SEO, maile, metadane, stopki, logo | Zmienić na `PodAdresem` w pierwszej kolejności |
| P0 | Legal, regulamin, prywatność, cookies, zasady publikacji | Zmienić razem z finalnymi danymi operatora i e-mailami |
| P1 | Seed bloga, autorzy, CTA, raporty, QR, publiczne formularze | Zmienić po aktualizacji głównego copy |
| P1 | Dokumentacja produktowa i launch checklisty | Zmienić albo oznaczyć jako dokumenty historyczne |
| P2 | Klucze localStorage/cookie/CSS/className/test domains | Nie zmieniać automatycznie bez planu migracji |
| P2 | Nazwa repo, nazwa bazy `real_estate_saas`, nazwa pakietu | Decyzja techniczna; nie jest wymagana do rebrandingu UI |

## Najważniejsze miejsca widoczne dla użytkownika

### Globalny brand i layout

| Plik | Co zawiera | Działanie |
| --- | --- | --- |
| `apps/web/src/components/common/logo.tsx` | tekst logo `EstateFlow` oraz komentarz brandowy | zmienić tekst logo na `PodAdresem` |
| `apps/web/src/app/layout.tsx` | metadata title `EstateFlow — Platforma...` i klucz `estateflow-theme` | title zmienić, klucz storage rozważyć jako legacy |
| `apps/web/src/components/layout/footer.tsx` | copyright `© ... EstateFlow` | zmienić na `PodAdresem` |
| `apps/web/src/components/layout/navbar.tsx` | aria-label strony głównej | zmienić na `PodAdresem` |
| `apps/web/src/app/(auth)/layout.tsx` | copyright w auth layout | zmienić na `PodAdresem` |

### Marketing i publiczne strony

| Plik | Co zawiera | Działanie |
| --- | --- | --- |
| `apps/web/src/app/(marketing)/page.tsx` | główna strona marketingowa, testimonial, sekcje CTA | zmienić całość copy brandowego |
| `apps/web/src/app/(marketing)/cennik/page.tsx` | nazwa w cenniku i mailto `kontakt@estateflow.pl` | zmienić nazwę i adres e-mail po decyzji domenowej |
| `apps/web/src/components/marketing/home-pricing-section.tsx` | mailto enterprise | zmienić adres i temat wiadomości |
| `apps/web/src/app/(marketing)/feedback/page.tsx` | title, description, CTA `Wróć do EstateFlow` | zmienić na `PodAdresem` |
| `apps/web/src/components/feedback/public-product-feedback-form.tsx` | opis feedbacku | zmienić copy |

### Blog i SEO

| Plik | Co zawiera | Działanie |
| --- | --- | --- |
| `apps/web/src/app/(marketing)/blog/page.tsx` | `Blog EstateFlow`, metadata, Open Graph `siteName` | zmienić na `Blog PodAdresem` |
| `apps/web/src/app/(marketing)/blog/[slug]/page.tsx` | tytuły SEO, `siteName`, JSON-LD, autor fallback | zmienić widoczne nazwy |
| `apps/web/src/app/(marketing)/blog/kategoria/[slug]/page.tsx` | tytuły kategorii i opisy | zmienić na `Blog PodAdresem` |
| `apps/web/src/components/blog/article-cta.tsx` | CTA i mailto `legal@estateflow.pl` | zmienić copy oraz e-mail |
| `apps/web/src/components/blog/blog-post-card.tsx` | fallback autora `EstateFlow` | zmienić fallback |
| `apps/web/src/components/blog/blog-post-form.tsx` | szablon linku `[załóż konto w EstateFlow]` | zmienić szablon |
| `apps/web/src/components/blog/featured-listings-block.tsx` | copy katalogu | zmienić copy |
| `apps/api/migrations/20260604_blog_content_launch_seed.sql` | seed tytułów SEO, autora `Redakcja EstateFlow`, slug `redakcja-estateflow` | nowy seed/migracja danych albo aktualizacja dla nowych instalacji |

### Publiczne oferty, katalog, formularze

| Plik | Co zawiera | Działanie |
| --- | --- | --- |
| `apps/web/src/app/(public)/oferty/page.tsx` | metadata katalogu i `siteName` | zmienić na `PodAdresem` |
| `apps/web/src/app/(public)/oferty/[slug]/page.tsx` | metadata oferty, `Powered by EstateFlow`, `siteName` | zmienić copy; pole techniczne rozważyć osobno |
| `apps/web/src/app/(public)/formularz/oferty/[slug]/page.tsx` | metadata formularza, `Powered by EstateFlow` | zmienić copy |
| `apps/web/src/app/(public)/agenci/[id]/page.tsx` | metadata profilu agenta, `siteName`, brand w UI | zmienić copy |
| `apps/web/src/app/(public)/dodaj-oferte/page.tsx` | widoczny brand oraz `estateflow.publicListingWizard.v1` | copy zmienić, storage key zostawić albo migrować |
| `apps/web/src/app/(public)/dodaj-oferte/potwierdzono/page.tsx` | brand w potwierdzeniu | zmienić copy |
| `apps/web/src/app/(public)/dodaj-oferte/sprawdz-email/page.tsx` | brand na ekranie sprawdzania maila | zmienić copy |
| `apps/web/src/components/listings/public-listing-catalog.tsx` | fallback agencji `EstateFlow` | zmienić na `PodAdresem` albo lepszy neutralny fallback |
| `apps/web/src/components/listings/public-listing-abuse-report.tsx` | komunikat o logu operacyjnym `EstateFlow` | zmienić copy |

### Dashboard, auth, seller flow

| Plik | Co zawiera | Działanie |
| --- | --- | --- |
| `apps/web/src/app/(auth)/login/page.tsx` | `Zaloguj się do swojego konta EstateFlow` | zmienić copy |
| `apps/web/src/app/(auth)/register/page.tsx` | informacja o logowaniu do `EstateFlow` | zmienić copy |
| `apps/web/src/app/(dashboard)/dashboard/[...slug]/page.tsx` | title placeholderów `... | EstateFlow` | zmienić metadata |
| `apps/web/src/app/(dashboard)/dashboard/tutorial/page.tsx` | opis samouczka po produkcie | zmienić copy |
| `apps/web/src/app/(dashboard)/dashboard/blog/[id]/preview/page.tsx` | fallback autora i copy katalogu | zmienić copy |
| `apps/web/src/app/(dashboard)/dashboard/listings/[id]/owner-report/page.tsx` | fallback brandu, tekst w raporcie właściciela | zmienić copy/fallback |
| `apps/web/src/app/(seller)/seller/page.tsx` | aria-label i copy katalogu | zmienić copy |
| `apps/web/src/app/(seller)/seller/listings/[id]/page.tsx` | aria-label panelu właściciela | zmienić copy |
| `apps/web/src/app/(seller)/seller/listings/[id]/edit/page.tsx` | aria-label panelu właściciela | zmienić copy |

## Legal, prywatność i kontakt

Te miejsca wymagają zmiany razem z finalną domeną i danymi operatora.

| Plik | Co zawiera | Działanie |
| --- | --- | --- |
| `apps/web/src/lib/legal.ts` | `legal@estateflow.pl`, `abuse@estateflow.pl`, `support@estateflow.pl`, teksty prawne | zmienić e-maile i nazwę produktu |
| `apps/web/src/app/(marketing)/regulamin/page.tsx` | metadata i treść regulaminu | zmienić nazwę produktu; zweryfikować dane prawne |
| `apps/web/src/app/(marketing)/polityka-prywatnosci/page.tsx` | metadata i treść polityki prywatności | zmienić nazwę produktu i kontakt |
| `apps/web/src/app/(marketing)/polityka-cookies/page.tsx` | metadata, treść i lista kluczy storage | widoczne copy zmienić; klucze rozważyć osobno |
| `apps/web/src/app/(marketing)/zasady-publikacji/page.tsx` | metadata i treść zasad publikacji | zmienić copy |
| `apps/web/src/components/legal/cookie-consent-manager.tsx` | komunikat zgód cookies | zmienić copy |

## API, backend i maile systemowe

| Plik | Co zawiera | Działanie |
| --- | --- | --- |
| `apps/api/src/auth/auth.service.ts` | temat i treść maila resetu hasła `EstateFlow` | zmienić na `PodAdresem` |
| `apps/api/src/auth/auth.service.spec.ts` | oczekiwany temat resetu hasła | zaktualizować test |
| `apps/api/src/listings/listings.service.ts` | opisy SEO publicznych ofert oraz pole `estateflowBrandingEnabled` | copy zmienić; pole techniczne rozważyć osobno |
| `apps/api/src/public-listing-submissions/public-listing-submissions.service.ts` | opisy SEO i domyślne branding flagi | copy zmienić; pole techniczne rozważyć osobno |
| `apps/api/src/reports/reports.service.ts` | komunikat o centralnym blogu `EstateFlow` | zmienić na `PodAdresem` |
| `apps/api/src/users/users.service.ts` | fallback `EstateFlow Workspace` | zmienić fallback |
| `apps/api/src/app.service.ts` | healthcheck `Real Estate Agent SaaS API` | zmienić na `PodAdresem API`, jeśli chcemy spójny healthcheck |
| `apps/api/src/app.controller.spec.ts` | test healthchecka | zaktualizować po zmianie healthchecka |

## Pola, klucze i identyfikatory techniczne

Nie wszystkie wystąpienia `estateflow` są prostą nazwą do podmiany. Poniższe
elementy mogą wpływać na dane użytkowników, API, cookies, localStorage, webhooki
albo migracje bazy.

| Element | Pliki | Rekomendacja |
| --- | --- | --- |
| `estateflowBrandingEnabled` | `apps/api/src/listings/entities/listing.entity.ts`, `apps/api/src/listings/public-listing.model.ts`, `apps/web/src/lib/listings.ts`, `apps/api/migrations/20260429_freemium_public_listings_and_analytics.sql`, użycia w serwisach i komponentach | Nie zmieniać w pierwszym kroku. To kontrakt techniczny i kolumna bazy. Jeśli zmieniamy, potrzebna migracja DB, compatibility layer i aktualizacja API. |
| `estateflow.csrf-token` | `apps/api/src/auth/auth-token-cookies.ts`, `apps/web/src/lib/csrf.ts` | Można zostawić jako legacy. Zmiana wymaga planu wygaszenia starych cookies. |
| `estateflow-theme` | `apps/web/src/app/layout.tsx`, `apps/web/src/contexts/theme-context.tsx` | Zostawić albo dodać migrację localStorage ze starego klucza na nowy. |
| `estateflow-cookie-consent` | `apps/web/src/lib/cookie-consent.ts`, `apps/web/src/contexts/cookie-consent-context.tsx`, strona cookies | Zostawić albo dodać migrację zgód. Nie kasować bez decyzji prawnej. |
| `estateflow.publicListingWizard.v1` | `apps/web/src/app/(public)/dodaj-oferte/page.tsx` | Zostawić albo dodać migrację draftów publicznego formularza. |
| `estateflow.dashboard-onboarding` | `apps/web/src/hooks/use-onboarding-progress.ts` | Zostawić albo dodać migrację postępu onboardingu. |
| `estateflow:listing-description-assistant` | `apps/web/src/lib/listing-description-assistant.ts` | Klucz cache/namespace; zmienić tylko z migracją lub świadomym resetem. |
| `x-estateflow-billing-signature` | `apps/api/src/billing/billing-webhooks.controller.ts` | Nie zmieniać bez koordynacji z billingiem/webhookami. Można dodać alias `x-podadresem-billing-signature`. |
| klasy CSS `estateflow-map-*` | `apps/web/src/app/globals.css`, `apps/web/src/components/listings/public-listing-catalog-map.tsx` | Niepilne. To wewnętrzne klasy CSS; zmiana jest kosmetyczna, ale musi być atomowa w CSS i TSX. |
| nazwy plików QR `estateflow-*.png` | komponenty QR i analytics | Można zmienić na `podadresem-*.png`; niskie ryzyko. |
| domeny testowe `estateflow.test` | testy backendu i konfiguracji storage | Zmienić tylko jeśli chcemy pełną spójność testów. Funkcjonalnie nie jest pilne. |

## Konfiguracja projektu i środowiska

| Plik | Co zawiera | Rekomendacja |
| --- | --- | --- |
| `package.json` | nazwa paczki `real-estate-agent-saas` | opcjonalnie zmienić dopiero po decyzji o nazwie repo/paczki |
| `README.md` | tytuł `EstateFlow — Real Estate Agent SaaS` oraz DB example | zmienić tytuł; DB zostawić albo migrować oddzielnie |
| `docker-compose.yml` | `real_estate_saas` jako nazwa bazy | zostawić, jeśli nie migrujemy lokalnej bazy |
| `apps/api/src/app.module.ts` | domyślna wartość `DB_NAME=real_estate_saas` | zostawić albo zmienić razem z konfiguracją lokalną |
| `apps/api/src/locations/locations-import.module.ts` | domyślna wartość `DB_NAME=real_estate_saas` | jak wyżej |

## Dokumentacja do aktualizacji

Dokumenty produktowe i wdrożeniowe z nazwą `EstateFlow`:

- `docs/AGENCY_BRANDED_WEBSITE_PLAN.md`
- `docs/AGENT_ONBOARDING_TUTORIAL_PLAN.md`
- `docs/AGENT_UX_PRODUCT_IMPROVEMENT_ANALYSIS_2026-06-23.md`
- `docs/BILLING_PLANS_IMPLEMENTATION.md`
- `docs/BLOG_POST_PUBLISHING_GUIDE.md`
- `docs/BLOG_SEO_PLAN.md`
- `docs/COOKIE_CONSENT_READINESS_PLAN.md`
- `docs/FREEMIUM_GROWTH_PLAN.md`
- `docs/FREEMIUM_SPRINT_6_5_READINESS_ANALYSIS.md`
- `docs/FREEMIUM_SPRINT_7_LEGAL_PRIVACY_CLOSEOUT.md`
- `docs/FREEMIUM_SPRINT_PLAN.md`
- `docs/LISTING_FIELD_MATRIX.md`
- `docs/LOCAL_SETUP.md`
- `docs/PLANS_AND_ENTITLEMENTS_STRATEGY.md`
- `docs/PORTAL_API_INTEGRATIONS.md`
- `docs/PRODUCT_FEEDBACK_SYSTEM_PLAN.md`
- `docs/PROJECT_SPEC.md`
- `docs/PUBLIC_CATALOG_AND_PRIVATE_SELLERS_PLAN.md`
- `docs/REPORTS_MODULE_SPEC.md`
- `docs/SECURITY_MODULE_AUDIT_MAP.md`
- `docs/SECURITY_SYSTEM_ANALYSIS_2026-07-05.md`
- `docs/UX_UI_SYSTEM_ANALYSIS_2026-07-05.md`
- `docs/design/AI_GUIDE.md`
- `docs/design/COMPONENT_PATTERNS.md`
- `docs/design/DESIGN_SYSTEM.md`

Dokumenty z technicznymi identyfikatorami `estateflow`, `real_estate_saas` albo
`real-estate-agent-saas`:

- `docs/COOKIE_CONSENT_READINESS_PLAN.md`
- `docs/FREEMIUM_SPRINT_7_E2E_TEST_PLAN.md`
- `docs/FREEMIUM_SPRINT_7_RELEASE_ROLLOUT_PLAN.md`
- `docs/LOCAL_SETUP.md`
- `docs/PLAN_DOWNGRADE_LIMIT_ENFORCEMENT_SPRINT.md`
- `docs/PRODUCTION_LAUNCH_CHECKLIST.md`
- `docs/PROJECT_CRITICAL_REVIEW_2026-06-23.md`
- `docs/PUBLIC_LISTING_SUBMISSION_WIZARD.md`
- `docs/PUBLIC_MAP_DISTRICT_PRECISION_PLAN.md`

Rekomendacja: dokumenty historyczne można zostawić, jeśli opisują stan z dnia
powstania. Dokumenty operacyjne, onboardingowe, launchowe, legalne i design
system powinny zostać zaktualizowane do `PodAdresem`.

## Proponowana kolejność prac

1. Ustalić finalną domenę i e-maile.
2. Dodać centralny stały brand w kodzie, np. `APP_NAME = 'PodAdresem'`, żeby nie
   powielać nazwy w nowych miejscach.
3. Zmienić widoczne UI copy, SEO metadata, Open Graph, JSON-LD, logo, stopki,
   CTA i maile systemowe.
4. Zaktualizować legal pages i `apps/web/src/lib/legal.ts`.
5. Zaktualizować seed bloga i ewentualnie przygotować migrację istniejących
   rekordów blogowych.
6. Zdecydować, które klucze techniczne zostają jako legacy, a które dostają
   migrację: cookies, localStorage, webhook header, `estateflowBrandingEnabled`.
7. Zaktualizować testy po zmianach copy.
8. Zaktualizować dokumentację operacyjną i design system.
9. Uruchomić wyszukiwanie kontrolne:

```bash
rg -n "EstateFlow|estateflow|Real Estate Agent SaaS|real-estate-agent-saas|real_estate_saas" . --glob '!node_modules' --glob '!pnpm-lock.yaml'
```

## Plan sprintów rebrandingu

Poniższy plan zakłada, że zmiana nazwy ma zostać wdrożona bez ryzykownej,
jednorazowej podmiany wszystkich wystąpień `estateflow`. Sprinty są ułożone od
decyzji produktowych i widocznego UI do migracji technicznych oraz rollout.

### Sprint 0 - decyzje i przygotowanie

Cel: zamknąć decyzje, które blokują bezpieczne wdrożenie nazwy `PodAdresem`.

Status: rozpoczęty, pierwsza iteracja wykonana 2026-07-07.

Zakres:

- potwierdzić finalną pisownię: `PodAdresem`,
- potwierdzić domenę produkcyjną, np. `podadresem.pl`,
- potwierdzić e-maile: `kontakt@`, `legal@`, `abuse@`, `support@`,
- zdecydować, czy stare domeny/e-maile `estateflow.pl` mają działać jako aliasy,
- zdecydować, czy nazwa repo/paczki `real-estate-agent-saas` zostaje techniczna,
- zdecydować, czy `estateflowBrandingEnabled` zostaje legacy nazwą pola, czy
  będzie migrowane w osobnym sprincie,
- dodać centralne stałe brandowe, np.:
  - `APP_NAME = 'PodAdresem'`,
  - `APP_LEGAL_NAME`,
  - `APP_DOMAIN`,
  - `APP_SUPPORT_EMAIL`,
  - `APP_LEGAL_EMAIL`,
  - `APP_ABUSE_EMAIL`.

Pliki startowe:

- `apps/web/src/lib/legal.ts`
- nowy albo istniejący plik konfiguracyjny brandu w `apps/web/src/lib`
- nowy albo istniejący plik konfiguracyjny brandu w `apps/api/src`
- `README.md`
- `.env.example`, jeśli istnieje albo zostanie dodany

Kryteria akceptacji:

- [x] jest jedna zaakceptowana forma nazwy: `PodAdresem`,
- [x] jest robocza decyzja domenowa i mailowa zapisana centralnie:
  `podadresem.pl`, `kontakt@podadresem.pl`, `legal@podadresem.pl`,
  `abuse@podadresem.pl`, `support@podadresem.pl`,
- [x] wiadomo, które identyfikatory techniczne zostają legacy w pierwszym etapie:
  `estateflowBrandingEnabled`, `estateflow-*`, `x-estateflow-billing-signature`,
  `real_estate_saas` i nazwa paczki `real-estate-agent-saas`,
- [x] nowe zmiany w kodzie mogą korzystać z centralnej konfiguracji brandu.

Wykonano w pierwszej iteracji Sprintu 0:

- dodano centralne stałe brandowe dla frontendu:
  `apps/web/src/lib/brand.ts`,
- dodano centralne stałe brandowe dla API:
  `apps/api/src/common/brand.ts`,
- podpięto `apps/web/src/lib/legal.ts` do nowych stałych, żeby e-maile legal,
  abuse i support oraz wspólne teksty prawne nie miały już nazwy wpisanej na
  sztywno,
- zmieniono healthcheck API z `Real Estate Agent SaaS API` na `PodAdresem API`
  przez stałą `APP_NAME`,
- zmieniono temat i treść maila resetu hasła na `PodAdresem`,
- zaktualizowano testy dla healthchecka i resetu hasła,
- zaktualizowano `SMTP_FROM` w `.env.example` na `PodAdresem
  <noreply@podadresem.pl>`.

Świadomie odłożone poza pierwszą iterację:

- masowa podmiana widocznych tekstów UI - zakres Sprintu 1,
- aktualizacja stron legalnych i pełnego copy prawnego - zakres Sprintu 2,
- seed bloga i istniejące dane blogowe - zakres Sprintu 3,
- zmiana `estateflowBrandingEnabled` - wymaga migracji DB/API i zostaje legacy,
- zmiana cookies/localStorage `estateflow-*` - wymaga migracji preferencji
  użytkowników,
- zmiana `x-estateflow-billing-signature` - wymaga okresu kompatybilności dla
  webhooków,
- zmiana nazwy bazy `real_estate_saas` i paczki `real-estate-agent-saas` - nie
  jest wymagana do widocznego rebrandingu i może zostać techniczną nazwą projektu.

### Sprint 1 - widoczny rebranding UI i SEO

Cel: użytkownik w aplikacji i na stronach publicznych widzi już `PodAdresem`
zamiast `EstateFlow`.

Status: rozpoczęty, pierwsza iteracja wykonana 2026-07-07.

Zakres:

- logo, navbar, footer, auth layout,
- globalne metadata i title,
- strona marketingowa,
- cennik, feedback, CTA,
- publiczny katalog ofert,
- publiczna strona oferty,
- publiczny formularz kontaktowy,
- publiczny profil agenta,
- wizard dodawania oferty,
- panel sprzedającego,
- dashboardowe fallbacki i placeholdery,
- `Powered by EstateFlow` -> `Powered by PodAdresem`,
- `Blog EstateFlow` -> `Blog PodAdresem`,
- Open Graph `siteName`,
- JSON-LD `name` i publisher/organization.

Najważniejsze pliki:

- `apps/web/src/components/common/logo.tsx`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/components/layout/footer.tsx`
- `apps/web/src/components/layout/navbar.tsx`
- `apps/web/src/app/(auth)/layout.tsx`
- `apps/web/src/app/(marketing)/page.tsx`
- `apps/web/src/app/(marketing)/cennik/page.tsx`
- `apps/web/src/app/(marketing)/feedback/page.tsx`
- `apps/web/src/app/(marketing)/blog/page.tsx`
- `apps/web/src/app/(marketing)/blog/[slug]/page.tsx`
- `apps/web/src/app/(marketing)/blog/kategoria/[slug]/page.tsx`
- `apps/web/src/app/(public)/oferty/page.tsx`
- `apps/web/src/app/(public)/oferty/[slug]/page.tsx`
- `apps/web/src/app/(public)/formularz/oferty/[slug]/page.tsx`
- `apps/web/src/app/(public)/agenci/[id]/page.tsx`
- `apps/web/src/app/(public)/dodaj-oferte/page.tsx`
- `apps/web/src/app/(seller)/seller/page.tsx`
- `apps/web/src/app/(dashboard)/dashboard/[...slug]/page.tsx`

Kryteria akceptacji:

- [x] główna nawigacja i stopka pokazują `PodAdresem`,
- [x] publiczny katalog i publiczna oferta nie pokazują `EstateFlow` w zakresie
  pierwszej iteracji Sprintu 1,
- [x] metadata stron publicznych używają `PodAdresem` w zakresie katalogu,
  oferty, formularza, profilu agenta i bloga,
- [x] blog używa `Blog PodAdresem` w metadanych, nagłówku indeksu i kategoriach,
- [x] `rg -n "EstateFlow" apps/web/src` zwraca tylko miejsca świadomie odłożone
  do kolejnych sprintów.

Wykonano w pierwszej iteracji Sprintu 1:

- podpięto logo do centralnej stałej `APP_NAME`:
  `apps/web/src/components/common/logo.tsx`,
- zmieniono globalny title aplikacji w `apps/web/src/app/layout.tsx`,
- zmieniono copyright w footerze i auth layoucie:
  `apps/web/src/components/layout/footer.tsx`,
  `apps/web/src/app/(auth)/layout.tsx`,
- zmieniono aria-label strony głównej w navbarze:
  `apps/web/src/components/layout/navbar.tsx`,
- zmieniono publiczny katalog ofert:
  `apps/web/src/app/(public)/oferty/page.tsx`,
- zmieniono publiczną stronę oferty, w tym `Powered by PodAdresem`:
  `apps/web/src/app/(public)/oferty/[slug]/page.tsx`,
- zmieniono publiczny formularz oferty, w tym `Powered by PodAdresem`:
  `apps/web/src/app/(public)/formularz/oferty/[slug]/page.tsx`,
- zmieniono publiczny profil agenta:
  `apps/web/src/app/(public)/agenci/[id]/page.tsx`,
- zmieniono indeks bloga, stronę wpisu i stronę kategorii bloga:
  `apps/web/src/app/(marketing)/blog/page.tsx`,
  `apps/web/src/app/(marketing)/blog/[slug]/page.tsx`,
  `apps/web/src/app/(marketing)/blog/kategoria/[slug]/page.tsx`.

Świadomie odłożone poza pierwszą iterację:

- pełna strona marketingowa homepage - wymaga osobnego przejścia przez copy i CTA,
- cennik, feedback i komponenty CTA poza blogiem,
- wizard dodawania oferty i panel sprzedającego poza miejscami globalnymi,
- dashboardowe fallbacki i placeholdery,
- komponenty QR, nazwy plików i teksty w panelu publikacji,
- `estateflow-*` storage keys oraz `estateflowBrandingEnabled`, bo to nadal
  identyfikatory techniczne/legacy.

Wykonano w drugiej iteracji Sprintu 1:

- zmieniono pozostałe widoczne copy w auth:
  `apps/web/src/app/(auth)/login/page.tsx`,
  `apps/web/src/app/(auth)/register/page.tsx`,
- zmieniono widoczne copy homepage, cennika i feedbacku:
  `apps/web/src/app/(marketing)/page.tsx`,
  `apps/web/src/app/(marketing)/cennik/page.tsx`,
  `apps/web/src/app/(marketing)/feedback/page.tsx`,
  `apps/web/src/components/marketing/home-pricing-section.tsx`,
  `apps/web/src/components/feedback/public-product-feedback-form.tsx`,
- zmieniono wizard publicznego dodawania oferty oraz panel sprzedającego:
  `apps/web/src/app/(public)/dodaj-oferte/page.tsx`,
  `apps/web/src/app/(public)/dodaj-oferte/potwierdzono/page.tsx`,
  `apps/web/src/app/(public)/dodaj-oferte/sprawdz-email/page.tsx`,
  `apps/web/src/app/(seller)/seller/page.tsx`,
  `apps/web/src/app/(seller)/seller/listings/[id]/page.tsx`,
  `apps/web/src/app/(seller)/seller/listings/[id]/edit/page.tsx`,
- zmieniono dashboardowe fallbacki i podglądy:
  `apps/web/src/app/(dashboard)/dashboard/[...slug]/page.tsx`,
  `apps/web/src/app/(dashboard)/dashboard/tutorial/page.tsx`,
  `apps/web/src/app/(dashboard)/dashboard/blog/[id]/preview/page.tsx`,
  `apps/web/src/app/(dashboard)/dashboard/listings/[id]/owner-report/page.tsx`,
- zmieniono blogowe CTA, fallbacki autora i sugestie markdown:
  `apps/web/src/components/blog/article-cta.tsx`,
  `apps/web/src/components/blog/blog-post-card.tsx`,
  `apps/web/src/components/blog/blog-post-form.tsx`,
  `apps/web/src/components/blog/featured-listings-block.tsx`,
- zmieniono komponenty ofertowe i publikacyjne:
  `apps/web/src/components/listings/listing-publication-panel.tsx`,
  `apps/web/src/components/listings/listing-qr-asset.tsx`,
  `apps/web/src/components/listings/public-listing-abuse-report.tsx`,
  `apps/web/src/components/listings/public-listing-catalog.tsx`,
- zmieniono copy upselli i opisów planu:
  `apps/web/src/lib/growth-upsells.ts`,
  `apps/web/src/lib/plan.ts`.

Po drugiej iteracji skan `rg -n "EstateFlow|estateflow.pl" apps/web/src`
zwraca tylko `apps/web/src/lib/brand.ts: previousName`, co jest celową
referencją historyczną. Techniczne klucze `estateflow-*` pisane małą literą
pozostają w Sprincie 4.

### Sprint 2 - legal, kontakt i komunikacja systemowa

Cel: treści prawne, e-maile i komunikaty systemowe są spójne z nową nazwą.

Status: rozpoczęty, pierwsza iteracja wykonana 2026-07-07.

Zakres:

- polityka prywatności,
- regulamin,
- polityka cookies,
- zasady publikacji ofert,
- cookie consent banner,
- `LEGAL_COPY`,
- e-maile kontaktowe,
- mail resetu hasła,
- fallbacki w raportach właściciela i komunikatach API,
- CTA mailowe w blogu i cenniku.

Najważniejsze pliki:

- `apps/web/src/lib/legal.ts`
- `apps/web/src/app/(marketing)/regulamin/page.tsx`
- `apps/web/src/app/(marketing)/polityka-prywatnosci/page.tsx`
- `apps/web/src/app/(marketing)/polityka-cookies/page.tsx`
- `apps/web/src/app/(marketing)/zasady-publikacji/page.tsx`
- `apps/web/src/components/legal/cookie-consent-manager.tsx`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/auth.service.spec.ts`
- `apps/web/src/components/blog/article-cta.tsx`
- `apps/web/src/components/marketing/home-pricing-section.tsx`

Kryteria akceptacji:

- [x] strony legalne używają `PodAdresem`,
- [x] e-maile kontaktowe wskazują finalną domenę,
- [x] mail resetu hasła ma temat i treść z `PodAdresem`,
- [x] test resetu hasła przechodzi po aktualizacji oczekiwanego copy,
- [x] dokumenty prawne nie mieszają `EstateFlow` i `PodAdresem`.

Wykonano w pierwszej iteracji Sprintu 2:

- zmieniono regulamin:
  `apps/web/src/app/(marketing)/regulamin/page.tsx`,
- zmieniono politykę prywatności:
  `apps/web/src/app/(marketing)/polityka-prywatnosci/page.tsx`,
- zmieniono politykę cookies:
  `apps/web/src/app/(marketing)/polityka-cookies/page.tsx`,
- zmieniono zasady publikacji ofert:
  `apps/web/src/app/(marketing)/zasady-publikacji/page.tsx`,
- zmieniono cookie consent banner:
  `apps/web/src/components/legal/cookie-consent-manager.tsx`.

Weryfikacja po pierwszej iteracji Sprintu 2:

- `pnpm --filter web type-check` - OK,
- `pnpm --filter web lint` - OK, bez błędów; pozostały istniejące warningi
  niezwiązane z rebrandingiem,
- `pnpm --filter api test -- app.controller.spec.ts auth.service.spec.ts` - OK,
- `pnpm --filter api type-check` - OK,
- `rg -n "EstateFlow|estateflow.pl" apps/web/src` zwraca tylko
  `apps/web/src/lib/brand.ts: previousName`.

Świadomie odłożone poza pierwszą iterację Sprintu 2:

- finalna weryfikacja prawna treści i danych operatora wymaga decyzji
  biznesowo-prawnej,
- techniczne nazwy storage w polityce cookies, np. `estateflow-theme` i
  `estateflow-cookie-consent`, zostają do Sprintu 4 jako legacy/migracje.

### Sprint 3 - backend, seed danych i publiczne payloady

Cel: backend generuje nowe widoczne teksty, a dane startowe nie tworzą nowych
treści ze starą nazwą.

Status: rozpoczęty, pierwsza iteracja wykonana 2026-07-07.

Zakres:

- opisy SEO generowane w API,
- seed bloga i autor `Redakcja PodAdresem`,
- fallback `EstateFlow Workspace`,
- healthcheck API,
- komunikat raportowy o centralnym blogu,
- testy backendu z widocznym copy,
- decyzja, czy przygotować migrację istniejących rekordów bloga.

Najważniejsze pliki:

- `apps/api/src/listings/listings.service.ts`
- `apps/api/src/public-listing-submissions/public-listing-submissions.service.ts`
- `apps/api/src/reports/reports.service.ts`
- `apps/api/src/users/users.service.ts`
- `apps/api/src/app.service.ts`
- `apps/api/src/app.controller.spec.ts`
- `apps/api/migrations/20260604_blog_content_launch_seed.sql`
- `apps/api/src/public-listing-submissions/public-listing-submissions.service.spec.ts`
- `apps/api/src/listings/listing-owner-report.spec.ts`

Kryteria akceptacji:

- [x] nowe SEO descriptions z API używają `PodAdresem`,
- [x] nowe instalacje/seed nie tworzą wpisów `Redakcja EstateFlow`,
- [x] fallback workspace nie używa starej nazwy,
- [x] healthcheck jest zgodny z decyzją produktową,
- [x] testy backendu są zaktualizowane.

Wykonano w pierwszej iteracji Sprintu 3:

- zmieniono domyślny opis SEO publicznej oferty w:
  `apps/api/src/listings/listings.service.ts`,
- zmieniono domyślny opis SEO publicznego zgłoszenia oferty w:
  `apps/api/src/public-listing-submissions/public-listing-submissions.service.ts`,
- zmieniono notatkę raportu blogowego o centralnym blogu w:
  `apps/api/src/reports/reports.service.ts`,
- zmieniono fallback workspace na `PodAdresem Workspace` w:
  `apps/api/src/users/users.service.ts`,
- zaktualizowano seed bloga dla nowych instalacji i ponownych uruchomień seeda:
  `apps/api/migrations/20260604_blog_content_launch_seed.sql`,
- zaktualizowano fixture testowej agencji w:
  `apps/api/src/listings/listing-owner-report.spec.ts`.

Weryfikacja po pierwszej iteracji Sprintu 3:

- `pnpm --filter api type-check` - OK,
- `pnpm --filter api test -- app.controller.spec.ts auth.service.spec.ts public-listing-submissions.service.spec.ts listing-owner-report.spec.ts` - OK,
- skan widocznych starych tekstów backendu nie zwraca już `EstateFlow Workspace`,
  `Centralny blog EstateFlow`, `Redakcja EstateFlow` ani opisów SEO z
  `w EstateFlow`.

Świadomie odłożone poza pierwszą iterację Sprintu 3:

- `estateflowBrandingEnabled` zostaje legacy kontraktem API/DB do Sprintu 4,
- `estateflow.test` w testach storage/public submission zostaje testową domeną
  techniczną do ewentualnej decyzji w Sprincie 4,
- `x-estateflow-billing-signature`, `estateflow.csrf-token` i
  `real_estate_saas` zostają legacy/konfiguracją techniczną,
- nie przygotowano migracji istniejących rekordów bloga w bazie produkcyjnej;
  obecna zmiana aktualizuje seed i jego `ON CONFLICT DO UPDATE`.

### Sprint 4 - identyfikatory techniczne i migracje legacy

Cel: świadomie zdecydować, które stare identyfikatory zostają, a które dostają
migrację bez utraty danych użytkowników.

Status: rozpoczęty, pierwsza iteracja wykonana 2026-07-07.

Zakres decyzyjny:

- `estateflowBrandingEnabled`,
- `estateflow.csrf-token`,
- `estateflow-theme`,
- `estateflow-cookie-consent`,
- `estateflow.publicListingWizard.v1`,
- `estateflow.dashboard-onboarding`,
- `estateflow:listing-description-assistant`,
- `x-estateflow-billing-signature`,
- klasy CSS `estateflow-map-*`,
- nazwy plików QR `estateflow-*.png`,
- domeny testowe `estateflow.test`,
- nazwa bazy `real_estate_saas`.

Rekomendowana kolejność:

1. Zostawić `estateflowBrandingEnabled` jako legacy kontrakt API na czas
   rebrandingu widocznego.
2. Dla localStorage dodać migrację: jeśli istnieje stary klucz, przepisać wartość
   pod nowy klucz i nie resetować użytkownikom preferencji.
3. Dla cookies rozważyć okres przejściowy, w którym backend akceptuje stary i
   nowy token.
4. Dla billing webhooka najpierw dodać alias `x-podadresem-billing-signature`,
   a dopiero później wygasić stary nagłówek.
5. Klasy CSS i nazwy QR zmienić dopiero po widocznym rebrandingu, bo nie blokują
   odbioru produktu.

Kryteria akceptacji:

- [x] istnieje lista legacy identyfikatorów, które zostają celowo,
- [x] migracje localStorage/cookies nie resetują preferencji użytkowników,
- [x] webhook billingowy ma plan kompatybilności,
- [x] ewentualna zmiana `estateflowBrandingEnabled` ma osobną migrację DB i API,
- [x] po sprincie nie ma przypadkowych, niewyjaśnionych wystąpień `estateflow`.

Wykonano w pierwszej iteracji Sprintu 4:

- dodano centralną mapę nowych i legacy kluczy storage:
  `apps/web/src/lib/storage-keys.ts`,
- dodano migrację wartości localStorage przez helper `readMigratedStorageValue`;
  mechanizm najpierw czyta nowy klucz, a jeśli go nie ma, kopiuje wartość ze
  starego klucza pod nową nazwę,
- zmigrowano theme storage z `estateflow-theme` na `podadresem-theme` w:
  `apps/web/src/contexts/theme-context.tsx`,
  `apps/web/src/app/layout.tsx`,
- zmigrowano cookie consent storage z `estateflow-cookie-consent` na
  `podadresem-cookie-consent` w:
  `apps/web/src/lib/cookie-consent.ts`,
  `apps/web/src/contexts/cookie-consent-context.tsx`,
- zmigrowano draft publicznego formularza oferty z
  `estateflow.publicListingWizard.v1` na `podadresem.publicListingWizard.v1` w:
  `apps/web/src/app/(public)/dodaj-oferte/page.tsx`,
- zmigrowano checklistę onboardingu z `estateflow.dashboard-onboarding.*` na
  `podadresem.dashboard-onboarding.*` w:
  `apps/web/src/hooks/use-onboarding-progress.ts`,
- zmigrowano licznik asystenta opisu oferty z
  `estateflow:listing-description-assistant:*` na
  `podadresem:listing-description-assistant:*` w:
  `apps/web/src/lib/listing-description-assistant.ts`,
- zmieniono nazwy pobieranych plików QR z `estateflow-*.png` na
  `podadresem-*.png` w:
  `apps/web/src/components/listings/listing-publication-panel.tsx`,
  `apps/web/src/components/listings/public-listing-analytics.tsx`,
- dodano kompatybilny alias webhooka billingowego:
  nowy `x-podadresem-billing-signature` oraz stary
  `x-estateflow-billing-signature` są akceptowane w:
  `apps/api/src/billing/billing-webhooks.controller.ts`,
- dodano test obsługi nowego nagłówka w:
  `apps/api/src/billing/billing-webhooks.controller.spec.ts`,
- zaktualizowano politykę cookies o nowe klucze i informację o legacy migracji:
  `apps/web/src/app/(marketing)/polityka-cookies/page.tsx`.

Weryfikacja po pierwszej iteracji Sprintu 4:

- `pnpm --filter web type-check` - OK,
- `pnpm --filter web lint` - OK, bez błędów; pozostały istniejące warningi
  niezwiązane z rebrandingiem,
- `pnpm --filter api type-check` - OK,
- `pnpm --filter api lint` - OK,
- `pnpm --filter api test -- billing-webhooks.controller.spec.ts` - OK,
- skan `estateflow-theme|estateflow-cookie-consent|estateflow.publicListingWizard|estateflow.dashboard-onboarding|estateflow:listing-description-assistant|x-estateflow-billing-signature|estateflow-qr`
  zwraca już tylko jawne legacy constants, inline migrację motywu oraz stary
  nagłówek billingowy obsługiwany kompatybilnie.

Świadomie odłożone poza pierwszą iterację Sprintu 4:

- `estateflowBrandingEnabled` zostaje bez zmian; wymaga osobnej migracji DB/API
  albo decyzji o pozostawieniu jako trwały legacy kontrakt,
- klasy CSS `estateflow-map-*` zostają bez zmian w tej iteracji, bo wymagają
  atomowej zmiany selektorów CSS i markerów mapy,
- `estateflow.test` w testach pozostaje techniczną domeną testową,
- `estateflow.csrf-token` i `x-estateflow-billing-signature` pozostają
  kompatybilnie obsługiwane w okresie przejściowym,
- `real_estate_saas` pozostaje nazwą techniczną bazy do osobnej decyzji.

Wykonano w drugiej iteracji Sprintu 4:

- zmieniono klasy mapy z `estateflow-map-*` na `podadresem-map-*` atomowo w:
  `apps/web/src/app/globals.css`,
  `apps/web/src/components/listings/public-listing-catalog-map.tsx`,
- zmieniono CSRF cookie z `estateflow.csrf-token` na
  `podadresem.csrf-token`, zachowując akceptację starego cookie podczas
  migracji w:
  `apps/api/src/auth/auth-token-cookies.ts`,
  `apps/api/src/auth/guards/csrf.guard.ts`,
  `apps/web/src/lib/csrf.ts`,
- dodano czyszczenie legacy CSRF cookie przy czyszczeniu auth cookies,
- dodano testy guardu CSRF dla nowego cookie, legacy cookie i błędnego tokena:
  `apps/api/src/auth/guards/csrf.guard.spec.ts`,
- zaktualizowano politykę cookies o nowy cookie `podadresem.csrf-token` oraz
  informację, że `estateflow.csrf-token` jest akceptowany przejściowo.

Decyzje po drugiej iteracji Sprintu 4:

- `estateflowBrandingEnabled` zostaje trwałym legacy kontraktem API/DB na ten
  etap. Nie zmieniamy nazwy pola bez osobnej migracji bazy, kompatybilnego
  DTO/API i planu rolloutowego, ponieważ pole jest publicznym kontraktem między
  API i frontendem oraz istnieje jako kolumna w migracji.
- `x-estateflow-billing-signature` zostaje obsługiwany jako legacy alias obok
  `x-podadresem-billing-signature`.
- `estateflow.test` zostaje techniczną domeną testową w specach; nie wpływa na
  użytkownika ani SEO.
- `real_estate_saas` zostaje techniczną nazwą bazy lokalnej/konfiguracyjnej.

Weryfikacja po drugiej iteracji Sprintu 4:

- `pnpm --filter api test -- csrf.guard.spec.ts billing-webhooks.controller.spec.ts` - OK,
- `pnpm --filter api type-check` - OK,
- `pnpm --filter web type-check` - OK,
- `pnpm --filter api lint` - OK,
- `pnpm --filter web lint` - OK, z istniejącymi wcześniej ostrzeżeniami
  niezwiązanymi ze zmianą brandu.

### Sprint 5 - dokumentacja, design system i materiały operacyjne

Cel: dokumenty, checklisty i instrukcje dla zespołu opisują już `PodAdresem`.

Zakres:

- dokumentacja produktowa,
- design system,
- instrukcje lokalne,
- launch checklist,
- dokumenty legal/privacy readiness,
- przewodnik publikacji bloga,
- dokumenty historyczne oznaczone jako historyczne albo zostawione bez zmian z
  jasną decyzją.

Najważniejsze pliki:

- `README.md`
- `docs/LOCAL_SETUP.md`
- `docs/PRODUCTION_LAUNCH_CHECKLIST.md`
- `docs/PROJECT_SPEC.md`
- `docs/BLOG_POST_PUBLISHING_GUIDE.md`
- `docs/BLOG_SEO_PLAN.md`
- `docs/COOKIE_CONSENT_READINESS_PLAN.md`
- `docs/design/DESIGN_SYSTEM.md`
- `docs/design/COMPONENT_PATTERNS.md`
- `docs/design/AI_GUIDE.md`
- `docs/UX_UI_SYSTEM_ANALYSIS_2026-07-05.md`

Kryteria akceptacji:

- [x] operacyjne dokumenty używają `PodAdresem`,
- [x] design system opisuje nowy brand,
- [x] dokumenty historyczne są świadomie zaktualizowane albo pozostawione z
  opisanym legacy kontekstem technicznym,
- [x] instrukcje lokalne nie sugerują użytkownikowi starej nazwy produktu.

Status po pierwszej iteracji Sprintu 5: w trakcie. Zmieniono dokumenty, które są
najbardziej narażone na bieżące użycie przez zespół, wdrożenie i dalsze prace
produktowe. Historyczne plany i analizy z nazwą `EstateFlow` pozostają do
drugiej iteracji Sprintu 5, gdzie trzeba zdecydować, czy aktualizujemy je
merytorycznie, czy oznaczamy jako archiwalne.

Wykonano w pierwszej iteracji Sprintu 5:

- zaktualizowano nazwę projektu w `README.md` na
  `PodAdresem — platforma dla agentów nieruchomości`,
- zaktualizowano dokumenty design systemu:
  `docs/design/DESIGN_SYSTEM.md`,
  `docs/design/COMPONENT_PATTERNS.md`,
  `docs/design/AI_GUIDE.md`,
- zaktualizowano dokumenty produktowe i redakcyjne:
  `docs/PROJECT_SPEC.md`,
  `docs/BLOG_POST_PUBLISHING_GUIDE.md`,
  `docs/BLOG_SEO_PLAN.md`,
- zaktualizowano dokument privacy/cookies readiness:
  `docs/COOKIE_CONSENT_READINESS_PLAN.md`,
- zaktualizowano instrukcję lokalną `docs/LOCAL_SETUP.md`, w tym nazwę
  serwera pgAdmin na `PodAdresem Local`,
- zaktualizowano produkcyjną checklistę launchu
  `docs/PRODUCTION_LAUNCH_CHECKLIST.md`, w tym przykładowe domeny, e-maile,
  bucket R2, ścieżkę Nginx i ścieżkę deployu na wariant `podadresem`.

Świadomie zostawiono w pierwszej iteracji Sprintu 5:

- `real_estate_saas` jako techniczną nazwę bazy danych w przykładach
  lokalnych i produkcyjnych,
- `real-estate-agent-saas` jako nazwę repozytorium/ścieżki developerskiej,
- historyczne dokumenty planistyczne i analityczne, które wymagają osobnej
  decyzji: aktualizacja treści vs oznaczenie jako archiwum.

Weryfikacja po pierwszej iteracji Sprintu 5:

- `rg -n "EstateFlow|estateflow\\.pl|api\\.estateflow\\.pl|cdn\\.estateflow\\.pl|status\\.estateflow\\.pl|support@estateflow\\.pl|abuse@estateflow\\.pl|legal@estateflow\\.pl|noreply@estateflow\\.pl|Real Estate Agent SaaS" README.md docs/design docs/BLOG_POST_PUBLISHING_GUIDE.md docs/PROJECT_SPEC.md docs/LOCAL_SETUP.md docs/PRODUCTION_LAUNCH_CHECKLIST.md docs/BLOG_SEO_PLAN.md docs/COOKIE_CONSENT_READINESS_PLAN.md`
  - OK, brak wyników,
- `rg -n "estateflow|real-estate-agent-saas|real_estate_saas" README.md docs/LOCAL_SETUP.md docs/PRODUCTION_LAUNCH_CHECKLIST.md`
  zwraca tylko techniczne identyfikatory bazy, repo i kontenera.

Status po drugiej iteracji Sprintu 5: zakończony w zakresie dokumentacji.

Wykonano w drugiej iteracji Sprintu 5:

- zaktualizowano pozostałe dokumenty planistyczne i analityczne w `docs/*.md`,
  żeby samodzielna nazwa produktu `EstateFlow` została zastąpiona przez
  `PodAdresem`,
- zaktualizowano stare przykłady domen i e-maili `estateflow.pl` na wariant
  `podadresem.pl`,
- nie zmieniano technicznych identyfikatorów API/DB/legacy, m.in.
  `estateflowBrandingEnabled`, `showEstateFlowBranding`,
  `agencyWebsiteRemoveEstateFlowBranding`, `real_estate_saas`,
  `real-estate-agent-saas`, `estateflow.test`,
- zaktualizowano `docs/COOKIE_CONSENT_READINESS_PLAN.md` po Sprint 4, tak aby
  główne klucze storage/cookie wskazywały `podadresem-*`, a stare
  `estateflow-*` były opisane jako legacy/migrowane,
- zaktualizowano `docs/PLAN_DOWNGRADE_LIMIT_ENFORCEMENT_SPRINT.md`, żeby
  nowy nagłówek webhooka `x-podadresem-billing-signature` był główny, a
  `x-estateflow-billing-signature` opisany jako alias legacy,
- zmieniono neutralnie opis testu CSRF w
  `apps/api/src/auth/guards/csrf.guard.spec.ts`, żeby nie generował
  niepotrzebnego wyniku w skanie widocznej starej nazwy.

Weryfikacja po drugiej iteracji Sprintu 5:

- `rg -n "\bEstateFlow\b|estateflow\.pl|support@estateflow\.pl|abuse@estateflow\.pl|legal@estateflow\.pl|noreply@estateflow\.pl|Blog EstateFlow|Powered by EstateFlow|Real Estate Agent SaaS" . --glob '!node_modules' --glob '!pnpm-lock.yaml' --glob '!docs/BRAND_RENAME_PODADRESEM_AUDIT_2026-07-07.md'`
  zwraca tylko:
  `apps/api/src/common/brand.ts: previousName` i
  `apps/web/src/lib/brand.ts: previousName`,
- `rg -n "estateflowBrandingEnabled|showEstateFlowBranding|RemoveEstateFlowBranding|estateflow-|estateflow:|estateflow\.test|x-estateflow|real-estate-agent-saas|real_estate_saas" . --glob '!node_modules' --glob '!pnpm-lock.yaml' --glob '!docs/BRAND_RENAME_PODADRESEM_AUDIT_2026-07-07.md'`
  zwraca wyłącznie świadome legacy/techniczne identyfikatory,
- `git diff --check` - OK.

### Sprint 6 - QA, rollout i cleanup po wdrożeniu

Cel: wypuścić zmianę bez regresji i mieć jasny obraz pozostałości starej nazwy.

Zakres:

- pełny skan repo po sprintach,
- testy jednostkowe i lint,
- ręczny smoke test stron publicznych,
- ręczny smoke test auth i dashboardu,
- sprawdzenie metadanych SEO/Open Graph,
- sprawdzenie stron legalnych,
- sprawdzenie maili systemowych,
- sprawdzenie, czy stare domeny/e-maile mają aliasy albo redirecty,
- lista świadomych legacy wystąpień.

Komendy kontrolne:

```bash
rg -n "EstateFlow|estateflow|Real Estate Agent SaaS|real-estate-agent-saas|real_estate_saas" . --glob '!node_modules' --glob '!pnpm-lock.yaml'
pnpm lint
pnpm test
```

Kryteria akceptacji:

- [x] publiczne strony nie pokazują starej nazwy w skanie kodu i dokumentacji,
- [x] dashboard nie pokazuje starej nazwy w skanie kodu i dokumentacji,
- [ ] legal/contact są spójne z finalną domeną,
- [x] testy i lint przechodzą w pierwszej iteracji Sprintu 6,
- [x] pozostałe wystąpienia starej nazwy są opisane jako legacy albo historia,
- [ ] zespół ma decyzję, czy i kiedy usuwać legacy identyfikatory.

Status po pierwszej iteracji Sprintu 6: rozpoczęty.

Wykonano w pierwszej iteracji Sprintu 6:

- uruchomiono pełny skan widocznej starej nazwy produktu i starych domen poza
  tym dokumentem audytu,
- potwierdzono, że jedyne wyniki `EstateFlow` poza audytem to celowe
  `previousName` w centralnych konfiguracjach brandu:
  `apps/api/src/common/brand.ts` i `apps/web/src/lib/brand.ts`,
- uruchomiono skan technicznych legacy identyfikatorów i potwierdzono, że
  wyniki dotyczą kontraktów/migracji: `estateflowBrandingEnabled`,
  `estateflow.test`, `x-estateflow-billing-signature`, legacy storage keys,
  `real_estate_saas` i `real-estate-agent-saas`,
- uruchomiono test CSRF po zmianie opisu testu,
- uruchomiono type-check i lint dla API oraz web.

Weryfikacja po pierwszej iteracji Sprintu 6:

- `pnpm --filter api test -- csrf.guard.spec.ts` - OK,
- `pnpm --filter api type-check` - OK,
- `pnpm --filter web type-check` - OK,
- `pnpm --filter api lint` - OK,
- `pnpm --filter web lint` - OK, z 11 istniejącymi ostrzeżeniami
  niezwiązanymi z rebrandingiem,
- `git diff --check` - OK.

## Podział ryzyka

| Ryzyko | Gdzie występuje | Jak ograniczyć |
| --- | --- | --- |
| Utrata zgód cookies albo preferencji | localStorage/cookies legacy `estateflow-*` | migracja kluczy zamiast kasowania |
| Zerwanie API publicznych ofert | `estateflowBrandingEnabled` | zostawić pole legacy na czas przejściowy |
| Niedziałające webhooki billingowe | `x-estateflow-billing-signature` | dodać alias nowego nagłówka przed wygaszeniem starego |
| Niespójne legal/contact | `legal.ts`, strony prawne, mailto | najpierw potwierdzić domenę i e-maile |
| Stare SEO w danych bloga | seed SQL i istniejące rekordy DB | przygotować migrację danych albo ręczne update wpisów |
| Mieszanie brandów w UI | rozproszone stringi w komponentach | centralny `APP_NAME` i skan `rg` po każdym sprincie |

## Szybka checklista akceptacyjna

- [x] Logo pokazuje `PodAdresem`.
- [x] Title i metadata strony głównej pokazują `PodAdresem`.
- [x] Publiczny katalog i publiczna oferta pokazują `PodAdresem`.
- [x] `Powered by EstateFlow` zostało zmienione na `Powered by PodAdresem`.
- [x] Blog używa `Blog PodAdresem`.
- [x] Maile resetu hasła używają `PodAdresem`.
- [x] Regulamin, polityka prywatności, cookies i zasady publikacji używają nowej nazwy.
- [x] E-maile kontaktowe są zgodne z finalną domeną.
- [x] Testy snapshotów/oczekiwań tekstowych zostały zaktualizowane.
- [ ] Świadomie zdecydowano, czy zostają legacy klucze `estateflow-*`.
- [x] Po zmianach `rg` nie znajduje niechcianych widocznych wystąpień `EstateFlow`.
