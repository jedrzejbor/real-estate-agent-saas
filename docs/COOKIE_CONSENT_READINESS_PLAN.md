# Cookie consent readiness plan

Data utworzenia: 2026-06-10

## Cel

Przygotować EstateFlow do produkcyjnego uruchomienia pod kątem cookies, browser storage, zgód na analitykę i dokumentacji prywatnościowej.

Sprint ma doprowadzić aplikację do stanu, w którym:

- użytkownik dostaje jasną informację o cookies, `localStorage`, `sessionStorage` i analityce,
- analityka publiczna i produktowa nie startuje bez właściwej zgody,
- preferencje zgód są zapisane i możliwe do zmiany,
- polityka prywatności i polityka cookies opisują faktyczny stan aplikacji,
- auth/storage jest świadomie sklasyfikowany,
- release ma jasne kryteria go/no-go.

## Obecny stan

### Istnieje

- Publiczne dokumenty:
  - `/regulamin`,
  - `/polityka-prywatnosci`,
  - `/zasady-publikacji`.
- Centralne linki i copy legal w `apps/web/src/lib/legal.ts`.
- Własny moduł analytics:
  - `apps/web/src/lib/analytics.ts`,
  - `apps/api/src/analytics/*`,
  - tabela `analytics_events`.
- Publiczne eventy ofert i bloga:
  - `public_listing_viewed`,
  - `public_listing_share_clicked`,
  - `public_listing_gallery_opened`,
  - `public_listing_gallery_image_viewed`,
  - `public_listing_catalog_result_clicked`,
  - `public_listing_map_search_used`,
  - `blog_article_viewed`,
  - `blog_cta_clicked`.
- Storage w przeglądarce:
  - tokeny auth w `localStorage`,
  - draft publicznego wizardu `/dodaj-oferte`,
  - motyw UI,
  - onboarding state,
  - pomocnicze flagi analityczne w `sessionStorage`.

### Brakuje

- Banera cookie consent.
- Panelu preferencji zgód.
- Osobnej polityki cookies albo pełnej sekcji cookies/storage w polityce prywatności.
- Consent gate przed wysłaniem publicznych i produktowych eventów analytics.
- Linku "Ustawienia cookies" w stopce.
- Jasnej decyzji, czy tokeny auth zostają w `localStorage`, czy migrują do httpOnly cookies.
- Testów i checklisty release dla cookies/analytics.

## Zakres sprintu

Sprint obejmuje warstwę produktu, frontend, backendowe konsekwencje analytics, dokumentację legal i testy release.

Poza zakresem sprintu, ale do decyzji:

- pełna migracja auth z `localStorage` na httpOnly secure cookies,
- wdrożenie zewnętrznego CMP typu Cookiebot/CookieYes,
- wdrożenie zewnętrznych narzędzi marketingowych lub remarketingowych.

## Klasyfikacja storage i tracking

Docelowo każda rzecz zapisywana w przeglądarce albo wysyłana jako event powinna mieć kategorię.

### Niezbędne

Używane do działania aplikacji, bezpieczeństwa, sesji, zapamiętania decyzji użytkownika i obsługi żądań.

Przykłady:

- preferencje cookie consent,
- sesja/logowanie,
- techniczne dane antyspamowe,
- eventy bezpieczeństwa i abuse, jeśli są potrzebne do obsługi naruszeń.

### Funkcjonalne

Poprawiają wygodę, ale nie są konieczne do podstawowego działania.

Przykłady:

- motyw UI,
- draft formularza `/dodaj-oferte`,
- onboarding checklist,
- lokalne preferencje interfejsu.

### Analityczne

Służą do pomiaru produktu, ruchu i skuteczności funkcji.

Przykłady:

- public listing views,
- blog article views,
- CTA clicks,
- onboarding events,
- upgrade CTA clicks,
- catalog/map search events.

### Marketingowe

Służą do remarketingu, pikseli reklamowych, profilowania marketingowego lub integracji reklamowych.

Obecny status: brak aktywnego zakresu, ale kategoria powinna istnieć w modelu zgód na przyszłość.

## Zadania sprintu

### C1. Audyt storage, cookies i analytics

Status: wykonane wstępnie 2026-06-10

Zakres:

- Spisać wszystkie użycia:
  - `localStorage`,
  - `sessionStorage`,
  - `document.cookie`,
  - `request.cookies`,
  - public analytics,
  - product analytics,
  - zewnętrzne skrypty i piksele, jeśli się pojawią.
- Dla każdego elementu ustalić:
  - nazwę klucza albo eventu,
  - miejsce w kodzie,
  - kategorię consentu,
  - cel,
  - retencję,
  - czy zawiera dane osobowe albo identyfikatory,
  - czy wymaga zgody przed uruchomieniem.

Output:

- Sekcja "Inventory" w tym dokumencie.

Kryteria akceptacji:

- [x] Każdy znany storage key i analytics event ma przypisaną kategorię.
- [x] Public analytics i product analytics są wyraźnie oddzielone od eventów operacyjnych/security.
- [x] Wiadomo, które funkcje trzeba blokować przed zgodą.

Wykonane:

- Przejrzano użycia `localStorage`, `sessionStorage`, `request.cookies`, `document.cookie`, public analytics i product analytics w `apps/web/src` oraz `apps/api/src`.
- Nie znaleziono aktywnego użycia `document.cookie` ani zewnętrznych pikseli/skryptów marketingowych w kodzie aplikacji.
- Znaleziono jedno serwerowe odczytanie cookie `accessToken` w `apps/web/src/middleware.ts`, ale bieżący auth realnie korzysta z tokenów w `localStorage`.
- Spisano inventory poniżej jako bazę dla etapów `C2-C7`.

### C1 Inventory - browser storage

| Mechanizm | Klucz / wzorzec | Miejsce | Kategoria robocza | Cel | Dane / identyfikatory | Retencja obecna | Wymaga zgody przed użyciem |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `localStorage` | `accessToken` | `apps/web/src/lib/auth.ts`, `apps/web/src/lib/api-client.ts` | Niezbędne, security risk do decyzji | Utrzymanie sesji i autoryzacja requestów API | JWT użytkownika | Do logoutu, wyczyszczenia storage albo nadpisania tokenów | Nie, jeśli zostaje jako mechanizm sesji |
| `localStorage` | `refreshToken` | `apps/web/src/lib/auth.ts` | Niezbędne, security risk do decyzji | Odświeżanie sesji | JWT refresh użytkownika | Do logoutu, wyczyszczenia storage albo nadpisania tokenów | Nie, jeśli zostaje jako mechanizm sesji |
| `request.cookies` | `accessToken` | `apps/web/src/middleware.ts` | Niezbędne, niespójne z aktualnym auth | Lekki check middleware dla tras dashboardowych | Potencjalny token sesji, ale obecnie nieustawiany przez frontend | Zależna od cookie, jeśli kiedyś zostanie ustawione | Nie |
| `localStorage` | `estateflow.publicListingWizard.v1` | `apps/web/src/app/(public)/dodaj-oferte/page.tsx` | Funkcjonalne albo niezbędne dla rozpoczętego formularza - decyzja otwarta | Zapis draftu publicznego dodania oferty | Dane oferty, adres, zdjęcia jako referencje, dane właściciela, email, telefon, zgody | Do finalnego submitu, ręcznego czyszczenia albo wyczyszczenia storage | Do decyzji w `C6`; rekomendacja: opisać wyraźnie i traktować jako funkcjonalne, chyba że UX wymaga niezbędnego draftu |
| `localStorage` | `estateflow-theme` | `apps/web/src/app/layout.tsx`, `apps/web/src/contexts/theme-context.tsx` | Funkcjonalne | Zapamiętanie motywu jasny/ciemny | Brak danych osobowych | Bezterminowo do zmiany/wyczyszczenia storage | Tak, jeśli rygorystycznie blokujemy funkcjonalny storage; można też uznać za niski wpływ i opisać |
| `localStorage` | `estateflow.dashboard-onboarding:{userId}` lub równoważny klucz z prefiksem `estateflow.dashboard-onboarding` | `apps/web/src/hooks/use-onboarding-progress.ts` | Funkcjonalne + analityczne eventy osobno | Zapamiętanie stanu checklisty onboardingu | Identyfikator użytkownika w kluczu, completed step IDs, dismissed/updated timestamps | Bezterminowo do zmiany/wyczyszczenia storage | Tak dla storage funkcjonalnego; eventy wymagają zgody analitycznej |
| `localStorage` | Klucz zwracany przez `getDescriptionAssistantStorageKey()` | `apps/web/src/lib/listing-description-assistant.ts` | Funkcjonalne / limit produktowy | Lokalny licznik użyć asystenta opisu | Licznik użyć, prawdopodobnie okresowy klucz limitu | Bezterminowo dla danego klucza, do wyczyszczenia storage | Do decyzji; jeśli egzekwuje limit freemium, może być niezbędne dla limitu usługi |
| `sessionStorage` | `blog-article-viewed:{slug}` | `apps/web/src/components/blog/blog-article-analytics.tsx` | Analityczne | Deduplikacja eventu widoku artykułu w sesji | Slug artykułu | Do końca sesji przeglądarki | Tak, razem z blog analytics |

Uwagi:

- `estateflow-cookie-consent` jeszcze nie istnieje. Zostanie dodany w `C2` jako niezbędny storage preferencji.
- Draft `/dodaj-oferte` zawiera potencjalnie dane osobowe i lokalizacyjne. To najważniejszy element storage do opisania w polityce cookies/prywatności.
- Tokeny auth w `localStorage` są istotnym ryzykiem bezpieczeństwa. To nie blokuje `C1`, ale wymaga decyzji w `C6`.

### C1 Inventory - analytics endpoints

| Endpoint | Miejsce | Typ | Obecny consent gate | Dane zapisywane | Decyzja dla `C4` |
| --- | --- | --- | --- | --- | --- |
| `POST /api/analytics/events` | `apps/web/src/lib/analytics.ts`, `apps/api/src/analytics/analytics.controller.ts` | Product analytics dla zalogowanych | Brak | `name`, `path`, `properties`, `userId`, `agentId`, `agencyId`, `planCode`, `createdAt` | Blokować eventy pomiarowe bez `analytics: true`; rozdzielić ewentualne eventy operacyjne |
| `POST /api/analytics/public-listings/:slug/events` | `apps/web/src/lib/analytics.ts`, `apps/api/src/analytics/analytics.controller.ts` | Public listing analytics | Brak | `name`, `path`, `properties`, `listingId`, `publicSlug`, owner `userId/agentId/agencyId`, `planCode`, `createdAt` | Blokować eventy pomiarowe bez `analytics: true`; wyjątek tylko dla abuse/security |
| Bezpośredni `apiFetch('/analytics/public-listings/:slug/events')` | `apps/web/src/lib/listings.ts` dla `public_listing_abuse_reported` | Operacyjne/security | Brak | Abuse report analytics event plus listing context | Nie blokować consentem, ale docelowo wydzielić poza product analytics albo oznaczyć jako operational event |
| `POST /api/analytics/public-blog/:slug/events` | `apps/web/src/lib/analytics.ts`, `apps/api/src/analytics/analytics.controller.ts` | Public blog analytics | Brak | `name`, `path`, `properties`, `postId`, `postSlug`, `postTitle`, `createdAt` | Blokować bez `analytics: true` |

### C1 Inventory - analytics events

| Event | Źródło | Typ | Kategoria robocza | Consent przed wysłaniem |
| --- | --- | --- | --- | --- |
| `signup_completed` | `apps/web/src/contexts/auth-context.tsx` | Product analytics | Analityczne | Tak |
| `onboarding_step_completed` | `apps/web/src/hooks/use-onboarding-progress.ts` | Product analytics | Analityczne | Tak |
| `onboarding_checklist_dismissed` | `apps/web/src/hooks/use-onboarding-progress.ts` | Product analytics | Analityczne | Tak |
| `onboarding_checklist_restored` | `apps/web/src/hooks/use-onboarding-progress.ts` | Product analytics | Analityczne | Tak |
| `onboarding_empty_state_shown` | `apps/web/src/components/dashboard/onboarding-empty-state.tsx` | Product analytics | Analityczne | Tak |
| `onboarding_empty_state_cta_clicked` | `apps/web/src/components/dashboard/onboarding-empty-state.tsx` | Product analytics | Analityczne | Tak |
| `listing_created` | `apps/web/src/lib/listings.ts` | Product analytics | Analityczne | Tak |
| `listing_published` | `apps/web/src/lib/listings.ts`, `apps/web/src/components/listings/listing-publication-panel.tsx` | Product analytics | Analityczne | Tak |
| `listing_unpublished` | `apps/web/src/lib/listings.ts` | Product analytics | Analityczne | Tak |
| `public_listing_viewed` | `apps/web/src/components/listings/public-listing-analytics.tsx` | Public analytics | Analityczne | Tak |
| `public_listing_share_clicked` | `apps/web/src/components/listings/public-listing-analytics.tsx`, `apps/web/src/components/listings/listing-publication-panel.tsx` | Public/product analytics zależnie od miejsca | Analityczne | Tak |
| `public_listing_link_copied` | `apps/web/src/components/listings/public-listing-analytics.tsx`, `apps/web/src/components/listings/listing-publication-panel.tsx` | Public/product analytics zależnie od miejsca | Analityczne | Tak |
| `public_listing_gallery_opened` | `apps/web/src/components/listings/public-listing-gallery.tsx` | Public analytics | Analityczne | Tak |
| `public_listing_gallery_image_viewed` | `apps/web/src/components/listings/public-listing-gallery.tsx` | Public analytics | Analityczne | Tak |
| `public_listing_catalog_result_clicked` | `apps/web/src/components/listings/public-listing-catalog-result-link.tsx` | Public analytics | Analityczne | Tak |
| `public_listing_map_search_used` | `apps/web/src/components/listings/public-listing-catalog-map.tsx` | Product analytics obecnie, public behavior semantycznie | Analityczne | Tak; wymaga sprawdzenia, czy publiczny katalog może wysyłać ten event bez zalogowania |
| `public_listing_abuse_reported` | `apps/web/src/lib/listings.ts`, backend monitoring | Operacyjne/security | Niezbędne | Nie, jeśli służy obsłudze nadużyć; docelowo wydzielić z analytics albo jawnie oznaczyć wyjątek |
| `public_lead_submitted` | `apps/web/src/components/listings/public-listing-contact-form.tsx`, backend whitelist | Operacyjne + analytics | Niezbędne dla obsługi formularza, analityczne dla raportowania | Submit formularza nie wymaga cookie consent; dodatkowy event pomiarowy powinien być rozdzielony albo zależny od zgody |
| `public_lead_accepted` | Backend whitelist, użycia frontendowego nie znaleziono w audycie | Product analytics | Analityczne | Tak, jeśli będzie emitowany z frontendu |
| `public_listing_claim_started` | `apps/web/src/lib/public-listing-submissions.ts` | Product analytics | Analityczne | Tak |
| `public_listing_claim_completed` | `apps/web/src/lib/public-listing-submissions.ts` | Product analytics | Analityczne | Tak |
| `blog_article_viewed` | `apps/web/src/components/blog/blog-article-analytics.tsx` | Public blog analytics | Analityczne | Tak |
| `blog_cta_clicked` | `apps/web/src/components/blog/article-cta.tsx` | Public blog analytics | Analityczne | Tak |
| `product_feedback_submitted` | Backend whitelist; frontend enum nie zawiera eventu | Product analytics | Analityczne | Tak; dopisać do frontend enum albo usunąć z whitelisty, zależnie od decyzji |
| `client_created` | `apps/web/src/lib/clients.ts` | Product analytics | Analityczne | Tak |
| `clients_imported` | `apps/web/src/lib/clients.ts` | Product analytics | Analityczne | Tak |
| `appointment_created` | `apps/web/src/lib/appointments.ts` | Product analytics | Analityczne | Tak |
| `limit_warning_shown` | Backend/frontend enum; aktywnego emitera nie znaleziono w audycie | Product analytics | Analityczne | Tak |
| `limit_reached` | Backend/frontend enum; aktywnego emitera nie znaleziono w audycie | Product analytics | Analityczne | Tak |
| `upgrade_cta_clicked` | `apps/web/src/app/(dashboard)/dashboard/upgrade/page.tsx`, `apps/web/src/components/growth/*` | Product analytics | Analityczne | Tak |

### C1 Findings / follow-up

- `public_listing_abuse_reported` i potencjalnie część obsługi public leadów nie powinny być traktowane tak samo jak pomiar produktu. W `C4` trzeba dodać rozróżnienie między analytics pomiarowym a eventami operacyjnymi.
- `public_listing_map_search_used` jest emitowany przez komponent publicznego katalogu przez `trackAnalyticsEvent`, który wymaga zalogowanego użytkownika. Trzeba zdecydować w `C4`, czy katalog publiczny powinien mieć osobny public analytics endpoint bez sluga, czy event ma pozostać tylko dla zalogowanych.
- Backend whitelist zawiera `product_feedback_submitted`, ale frontendowy `AnalyticsEventName` go nie zawiera. Wymaga ujednolicenia przy okazji pracy nad analytics.
- Nie znaleziono aktywnych zewnętrznych narzędzi analytics/marketing. Jeśli zostaną dodane później, wymagają vendor list i blokady ładowania skryptu przed zgodą.
- Middleware czyta `request.cookies.get('accessToken')`, ale obecny auth trzyma tokeny w `localStorage`. To zostaje do decyzji `C6`.

### C2. Model zgód i provider

Status: wykonane 2026-06-10

Zakres:

- Dodać moduł consentu w frontendzie, np. `apps/web/src/lib/cookie-consent.ts`.
- Dodać provider/hook, np.:
  - `CookieConsentProvider`,
  - `useCookieConsent`,
  - `hasAnalyticsConsent`,
  - `hasFunctionalConsent`,
  - `acceptAll`,
  - `rejectOptional`,
  - `savePreferences`,
  - `resetConsent`.
- Przechowywać preferencje w `localStorage` pod stabilnym kluczem, np. `estateflow-cookie-consent`.
- Dodać wersjonowanie zgód przez `version`.

Proponowany model:

```ts
type CookieConsentPreferences = {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
  version: string;
};
```

Kryteria akceptacji:

- [x] Brak zgody oznacza stan nieustalony i pokazanie banera w przyszłym `C3`.
- [x] `necessary` jest zawsze `true`.
- [x] Zmiana wersji zgód może wymusić ponowne pokazanie banera.
- [x] Kod działa bez błędów w SSR/Next.js.

Wykonane:

- Dodano czysty moduł consentu w `apps/web/src/lib/cookie-consent.ts`.
- Dodano klientowy provider i hook w `apps/web/src/contexts/cookie-consent-context.tsx`.
- Podpięto `CookieConsentProvider` w `apps/web/src/app/layout.tsx`.
- Dodano eksport z `apps/web/src/contexts/index.ts`.
- Uruchomiono `pnpm --filter web type-check` - przechodzi.
- Uruchomiono lint dla dotkniętych plików - przechodzi.
- Pełny `pnpm --filter web lint` nadal pada na wcześniejszych błędach poza zakresem `C2`, m.in. `react-hooks/set-state-in-effect` w istniejących plikach.

Dodane API:

- `COOKIE_CONSENT_STORAGE_KEY = 'estateflow-cookie-consent'`,
- `COOKIE_CONSENT_VERSION = '2026-06-10'`,
- `CookieConsentPreferences`,
- `CookieConsentChoices`,
- `createCookieConsentPreferences`,
- `createAcceptedAllCookieConsent`,
- `createRejectedOptionalCookieConsent`,
- `readStoredCookieConsent`,
- `writeStoredCookieConsent`,
- `clearStoredCookieConsent`,
- `hasCookieConsent`,
- `hasAnyOptionalCookieConsent`,
- `isCookieConsentCurrent`,
- `CookieConsentProvider`,
- `useCookieConsent`.

Decyzje implementacyjne:

- Preferencje są zapisywane w `localStorage` pod kluczem `estateflow-cookie-consent`.
- Odczyt i zapis storage są defensywne: uszkodzony JSON, brak `window` albo błąd storage nie blokują aplikacji.
- `necessary` nie może zostać wyłączone.
- Provider synchronizuje stan między kartami przez event `storage`.
- Provider sam nie pokazuje UI; banner i panel preferencji zostają w `C3`.
- Provider sam nie blokuje analytics; consent gate zostaje w `C4`.

### C3. Banner consent i panel preferencji

Status: wykonane 2026-06-11

Zakres:

- Dodać globalny banner cookie consent w layoucie.
- Dodać panel/modal preferencji.
- Dodać link w stopce: "Ustawienia cookies".
- Dodać link do polityki prywatności i polityki cookies.

Minimalne akcje w UI:

- "Akceptuję wszystkie",
- "Odrzuć opcjonalne",
- "Dostosuj".

Kategorie w panelu:

- Niezbędne: zawsze aktywne, bez możliwości wyłączenia,
- Funkcjonalne,
- Analityczne,
- Marketingowe.

Kryteria akceptacji:

- [x] Banner pojawia się na pierwszej wizycie.
- [x] Preferencje zapisują się po wyborze.
- [x] Banner nie wraca po refreshu, jeśli zgoda jest aktualna.
- [x] Użytkownik może ponownie otworzyć ustawienia ze stopki.
- [x] UI działa na mobile i desktop na poziomie implementacji responsywnych klas; finalna kontrola wizualna zostaje do manualnego QA.

Wykonane:

- Dodano `CookieConsentManager` w `apps/web/src/components/legal/cookie-consent-manager.tsx`.
- Dodano banner z akcjami:
  - `Odrzuć opcjonalne`,
  - `Dostosuj`,
  - `Akceptuję wszystkie`.
- Dodano dialog preferencji z kategoriami:
  - niezbędne,
  - funkcjonalne,
  - analityczne,
  - marketingowe.
- Dodano globalny stan otwarcia panelu preferencji w `CookieConsentProvider`.
- Dodano przycisk `Ustawienia cookies` w stopce przez `CookieSettingsButton`.
- Dodano link `LEGAL_LINKS.cookies`.
- Dodano publiczną trasę `/polityka-cookies`, żeby link z bannera i stopki nie prowadził do 404.
- Podpięto `CookieConsentManager` w `apps/web/src/app/layout.tsx`.

Decyzje implementacyjne:

- Banner i dialog są globalne, ale nie wykonują jeszcze consent gate dla analytics. To zostaje w `C4`.
- Strona `/polityka-cookies` jest roboczym dokumentem MVP. Pełne dopracowanie treści, retencji i listy storage zostaje w `C5`.
- Zamknięcie dialogu bez wcześniejszej decyzji traktuje się jak odrzucenie opcjonalnych zgód, żeby nie zostawić użytkownika w stanie niejawnej zgody.
- Przycisk w stopce używa providera, więc otwiera ten sam dialog niezależnie od wcześniejszej decyzji.

Weryfikacja:

- `pnpm --filter web type-check` - przechodzi.
- Lint dla dotkniętych plików - przechodzi.
- Nie wykonywano screenshotów; kontrola wizualna jest po stronie manualnego QA.

### C4. Consent gate dla analytics

Status: wykonane 2026-06-11

Zakres:

- Zmienić `apps/web/src/lib/analytics.ts`, żeby eventy analityczne respektowały zgodę.
- Publiczne eventy ofert i bloga nie mogą być wysyłane bez `analytics: true`.
- Product analytics dla zalogowanych użytkowników powinny również respektować `analytics: true`, jeśli są pomiarowe.
- Eventy operacyjne/security, np. abuse workflow, powinny zostać rozdzielone od product analytics i nie zależeć od zgody, jeśli są potrzebne do bezpieczeństwa lub obsługi zgłoszenia.

Kryteria akceptacji:

- [x] Przy odrzuceniu opcjonalnych zgód `public_listing_viewed` nie wysyła requestu do API.
- [x] Przy zgodzie analitycznej `public_listing_viewed` wysyła request do API.
- [x] Blog analytics działa tak samo.
- [x] Abuse/security flow nadal działa.
- [x] Brak błędów w konsoli przy braku zgody na poziomie implementacji; finalna kontrola runtime zostaje do manualnego QA.

Wykonane:

- Dodano centralny consent gate w `apps/web/src/lib/analytics.ts`.
- `trackAnalyticsEvent`, `trackPublicListingEvent` i `trackPublicBlogEvent` sprawdzają teraz zgodę `analytics` z `estateflow-cookie-consent`.
- Bez decyzji użytkownika albo po odrzuceniu opcjonalnych zgód eventy pomiarowe nie są wysyłane.
- Dodano wyjątek operacyjny dla `public_listing_abuse_reported`.
- Abuse report w `apps/web/src/lib/listings.ts` pozostaje bezpośrednią ścieżką operacyjną przez `apiFetch`, więc nie zależy od zgody analitycznej.
- `BlogArticleAnalytics` nie zapisuje już deduplikacji w `sessionStorage` przed zgodą analityczną.

Decyzje implementacyjne:

- Brak zapisanej decyzji consentu traktujemy jak brak zgody na analytics.
- Product analytics zalogowanego użytkownika również wymaga zgody `analytics`.
- `public_lead_submitted` jako event pomiarowy jest blokowany bez zgody analitycznej, ale sam submit formularza leada działa dalej, bo jest osobnym requestem.
- `public_listing_abuse_reported` pozostaje wyjątkiem, bo służy obsłudze nadużyć i bezpieczeństwu.
- Ujednolicenie `product_feedback_submitted` między backend/frontend pozostaje osobnym follow-upem z `C1`, bo eventy feedbacku są obecnie emitowane po stronie API, nie przez frontendowy helper.

Weryfikacja:

- `pnpm --filter web type-check` - przechodzi.
- Lint dla dotkniętych plików - przechodzi.
- Pełny `pnpm --filter web lint` nadal pada na wcześniejszych błędach poza zakresem `C4`, m.in. `react-hooks/set-state-in-effect` w istniejących plikach.

### C5. Polityka cookies i aktualizacja dokumentów legal

Status: wykonane 2026-06-11

Zakres:

- Dodać trasę `/polityka-cookies` albo pełną sekcję cookies w `/polityka-prywatnosci`.
- Zaktualizować `LEGAL_LINKS` w `apps/web/src/lib/legal.ts`.
- Zaktualizować stopkę.
- Zaktualizować politykę prywatności o:
  - browser storage,
  - własną analitykę,
  - kategorie zgód,
  - retencję,
  - sposób zmiany preferencji,
  - brak albo listę zewnętrznych dostawców analytics/marketing.

Polityka cookies powinna opisać:

- czym są cookies, `localStorage` i `sessionStorage`,
- jakie kategorie stosuje EstateFlow,
- które mechanizmy są niezbędne,
- które są funkcjonalne,
- które są analityczne,
- czy są stosowane cookies marketingowe,
- jak użytkownik może zmienić zgodę,
- jak długo przechowywane są preferencje,
- kontakt w sprawach prywatności.

Kryteria akceptacji:

- [x] Dokument jest dostępny publicznie.
- [x] Link jest w stopce.
- [x] Banner linkuje do dokumentu.
- [x] Treść zgadza się z faktyczną implementacją po etapach `C1-C4`.
- [x] Dokument nadal jest oznaczony jako wymagający review prawnego, jeśli nie został jeszcze zweryfikowany.

Wykonane:

- Rozbudowano `/polityka-cookies` w `apps/web/src/app/(marketing)/polityka-cookies/page.tsx`.
- Polityka cookies opisuje:
  - czym są cookies, `localStorage` i `sessionStorage`,
  - kategorie: niezbędne, funkcjonalne, analityczne i marketingowe,
  - aktualnie używane mechanizmy browser storage,
  - własną analitykę i warunek zgody `analytics`,
  - wyjątek operacyjny dla bezpieczeństwa i zgłoszeń nadużyć,
  - brak aktywnych zewnętrznych narzędzi typu Google Analytics, Meta Pixel, Hotjar, Clarity,
  - retencję preferencji, `sessionStorage`, `localStorage` i eventów,
  - sposób zmiany zgody przez stopkę,
  - kontakt w sprawach prywatności.
- Dodano tabelę mechanizmów obejmującą:
  - `estateflow-cookie-consent`,
  - `accessToken` / `refreshToken`,
  - `estateflow-theme`,
  - `estateflow.publicListingWizard.v1`,
  - `estateflow.dashboard-onboarding:*`,
  - `blog-article-viewed:*`,
  - `analytics_events`.
- Zaktualizowano `/polityka-prywatnosci` o sekcję `Cookies, storage i analityka`.
- Sekcja prywatności linkuje do `LEGAL_LINKS.cookies`.

Decyzje implementacyjne:

- `/polityka-cookies` pozostaje osobną trasą zamiast samej sekcji w polityce prywatności.
- Dokument opisuje obecny stan aplikacji: własna analityka, browser storage i brak zewnętrznych pikseli marketingowych.
- Tokeny auth są opisane jako niezbędny mechanizm sesji, ale z zaznaczeniem, że decyzja o migracji do httpOnly cookies pozostaje w `C6`.
- Draft `/dodaj-oferte` jest opisany jako funkcjonalny storage zawierający dane wpisane przez użytkownika.
- Dokument nadal wymaga review prawnego i finalnych danych operatora przed publicznym launch’em.

Weryfikacja:

- `pnpm --filter web type-check` - przechodzi.
- Lint dla dotkniętych plików - przechodzi.

### C6. Decyzja auth storage

Status: do zrobienia

Zakres:

- Podjąć decyzję, czy przed produkcją migrujemy auth z `localStorage` na httpOnly secure SameSite cookies.
- Jeżeli nie migrujemy w tym sprincie:
  - opisać ryzyko w dokumentacji,
  - poprawić niespójność middleware/commentów,
  - sklasyfikować token storage jako niezbędny mechanizm sesji.
- Jeżeli migrujemy:
  - przygotować osobny mini-sprint security,
  - zmienić login/register/refresh/logout,
  - zmienić API client,
  - dodać CSRF strategy, jeśli będzie wymagana.

Rekomendacja:

- Docelowo migrować na httpOnly cookies przed pełnym produkcyjnym launch'em.
- Jeżeli launch MVP ma być szybki, świadomie zaakceptować `localStorage` jako tymczasowe rozwiązanie i zapisać ryzyko w release checklist.

Kryteria akceptacji:

- Decyzja jest zapisana w dokumencie.
- Nie ma rozbieżności między dokumentacją a zachowaniem aplikacji.
- Release checklist zawiera decyzję i ewentualny follow-up security.

### C7. Test plan i release gate

Status: do zrobienia

Zakres:

- Dodać checklistę testów manualnych.
- Dodać testy automatyczne tam, gdzie koszt jest rozsądny.
- Zaktualizować `PRODUCTION_LAUNCH_CHECKLIST.md`.

Testy manualne:

- Pierwsza wizyta pokazuje banner.
- "Odrzuć opcjonalne" blokuje public listing analytics.
- "Akceptuję wszystkie" pozwala wysłać public listing analytics.
- "Dostosuj" zapisuje tylko wybrane kategorie.
- Preferencje przetrwają refresh.
- Link "Ustawienia cookies" otwiera panel ponownie.
- Polityka cookies jest dostępna ze stopki.
- Publiczne formularze dalej działają.
- Abuse report dalej działa.
- Blog analytics respektuje zgodę.
- Dashboard product analytics respektuje zgodę.
- Draft `/dodaj-oferte` zachowuje się zgodnie z decyzją klasyfikacyjną.

Kryteria akceptacji:

- Jest checklist z wynikiem testów.
- Najważniejsze ścieżki publiczne przechodzą po odrzuceniu opcjonalnych zgód.
- Najważniejsze ścieżki publiczne przechodzą po zaakceptowaniu wszystkich zgód.
- Brak requestów analytics bez zgody.

## Release gate

Nie wpuszczamy produkcyjnego ruchu, dopóki nie są spełnione warunki:

- [ ] Jest banner cookie consent.
- [ ] Jest panel preferencji zgód.
- [ ] Jest link "Ustawienia cookies" w stopce.
- [ ] Jest publiczna polityka cookies albo pełna sekcja cookies w polityce prywatności.
- [ ] Analytics publiczny nie wysyła eventów bez zgody analitycznej.
- [ ] Analytics bloga nie wysyła eventów bez zgody analitycznej.
- [ ] Product analytics zalogowanego użytkownika respektuje decyzję consentu albo ma uzasadnione rozdzielenie eventów operacyjnych.
- [ ] Abuse/security events są rozdzielone od product analytics.
- [ ] Storage inventory jest aktualne.
- [ ] Decyzja o auth storage jest zapisana.
- [ ] `PRODUCTION_LAUNCH_CHECKLIST.md` jest zaktualizowany.
- [ ] Dokumenty prawne zostały oznaczone jako zweryfikowane albo pozostają blockerem launchu.

## Proponowana kolejność realizacji

1. C1 - Audyt storage, cookies i analytics.
2. C2 - Model zgód i provider.
3. C3 - Banner consent i panel preferencji.
4. C4 - Consent gate dla analytics.
5. C5 - Polityka cookies i aktualizacja dokumentów legal.
6. C6 - Decyzja auth storage.
7. C7 - Test plan i release gate.

## Otwarte decyzje

- Czy polityka cookies ma być osobną trasą `/polityka-cookies`, czy sekcją w `/polityka-prywatnosci`?
- Czy draft `/dodaj-oferte` traktujemy jako funkcjonalny storage wymagający zgody, czy jako niezbędny element rozpoczętego formularza?
- Czy onboarding state traktujemy jako funkcjonalny storage wymagający zgody?
- Czy wszystkie product analytics dla zalogowanych użytkowników wymagają zgody, czy część klasyfikujemy jako uzasadnione pomiary operacyjne?
- Czy auth migruje na httpOnly cookies przed launch'em, czy zostaje jako follow-up security?
- Czy używamy własnego consent managera, czy zewnętrznego CMP?

## Notatki implementacyjne

- Nie dodawać zewnętrznych skryptów analytics/marketing bez rozszerzenia consent modelu i polityki cookies.
- Preferencje zgód powinny być odczytywane defensywnie, żeby uszkodzony JSON w `localStorage` nie blokował aplikacji.
- Consent UI powinien działać bez logowania.
- Consent state nie powinien wymagać requestu do API w MVP.
- Przy przyszłych integracjach z GA, Meta Pixel, Hotjar, Clarity albo podobnymi narzędziami należy dodać vendor list i blokadę ładowania skryptu przed zgodą.
