# Zadania implementacyjne płatności PodAdresem

Status: PAY-001–PAY-004 wykonane; pozostałe zadania są planowane. Obowiązuje [plan architektury](../tpay-integration-plan.md) i [katalog testów manualnych](MANUAL_TESTS.md). Wykonuj tylko wskazany `PAY-XXX`, bez automatycznego przechodzenia do kolejnego. Po zmianie zachowania aktualizuj odpowiedni MT-XXX oraz `docs/MANUAL_RELEASE_TESTS.md` zgodnie z `AGENTS.md`. Testy manualne opisuje się po każdym takim zadaniu; wykonuje się wskazane dla taska oraz krótką regresję po większej iteracji. Pola `Files` są planowaną lokalizacją; jeśli repo wymaga innej, odnotuj ją w review. `—` oznacza brak zmiany. Przed każdym taskiem sprawdź zależności z wcześniejszych faz.

## Phase 0 — Preparation

- [x] **PAY-001 — Potwierdź stan lokalnego Stripe**

### Task PAY-001 — Potwierdź stan lokalnego Stripe

#### Goal

Potwierdź stan lokalnego Stripe.

#### Files

CREATED: —. MODIFIED: docs/payments/IMPLEMENTATION_TASKS.md. DELETED: —.

#### Implementation

Sprawdź konfigurację i lokalną bazę tylko do odczytu; zapisz brak środowiska i danych produkcyjnych oraz plan kopii/resetu danych testowych.

#### Automated tests

Brak; zadanie audytowe.

#### Manual test

Otwórz lokalny panel i sprawdź, czy nie ma realnych klientów ani płatności; zapisz wynik i datę.

#### Expected result

Jest pisemne potwierdzenie zakresu danych.

#### Acceptance criteria

Wynik audytu i decyzja o lokalnych rekordach są zapisane.

#### Do not do yet

Nie usuwaj danych ani kodu.

#### Wynik audytu — 4 października 2026 r.

- **Zakres środowiska:** właściciel projektu potwierdził brak produkcji, realnych klientów i płatności Stripe. Kontenery `real-estate-web`, `real-estate-api` i `real-estate-db` działają lokalnie; web i API odpowiedziały HTTP 200. Nie korzystano z konta ani danych produkcyjnych Stripe.
- **Konfiguracja:** `apps/api/.env.local` istnieje i ma ustawiony `STRIPE_SECRET_KEY`; nie zapisano ani nie wyświetlono jego wartości. Lokalne `STRIPE_LISTING_WEBHOOK_SECRET` i `STRIPE_AGENCY_PLAN_WEBHOOK_SECRET` nie mają ustawionej wartości. Sekcja Stripe w `.env.example` zawiera przykładową konfigurację. Kod nadal rejestruje dwa adaptery i dwa webhooki Stripe — ich usuwanie należy do PAY-012–PAY-014.
- **Baza lokalna:** odczyt wyłącznie agregatów z `real_estate_saas` w transakcji `READ ONLY`: `listing_orders` 0, `listing_payment_attempts` 0, `listing_payment_events` 0, `agency_plan_quotes` 0. Tabela `agencies` ma 9 rekordów, ale 0 z `billing_customer_id` i 0 z `billing_subscription_id`. `plan_catalog` ma 4 rekordy i 0 z ustawionym Stripe Price ID. Tabela `agency_plan_checkout_attempts` nie występuje w tej lokalnej bazie. Nie ma tu historii Stripe do migracji.
- **Kontrola manualna:** lokalny panel odpowiada HTTP 200. Nie wykonano zalogowanego przeglądu ekranów administracyjnych; brak płatności i identyfikatorów billingowych sprawdzono bezpośrednio w lokalnej bazie, a brak realnych klientów potwierdził właściciel. To ograniczenie nie zmienia decyzji o migracji lokalnej.
- **Plan dla danych testowych:** przed PAY-014 developer decyduje, czy potrzebuje kopii 9 lokalnych agencji i pozostałych danych dev. Jeśli tak, wykonuje lokalny backup bazy poza repo i sprawdza możliwość jego odtworzenia. Następnie usuwa/odtwarza wyłącznie rekordy testowe Stripe oraz stosuje migrację developerską pól Stripe. Nie budować backfillu ani okresu współistnienia Stripe i Tpay. PAY-001 nie wykonał backupu, resetu ani migracji.
- **Decyzja:** PAY-001 zakończony. Do PAY-002 można przejść po osobnym poleceniu. Gdyby przed PAY-014 pojawiły się realne płatności, zatrzymać usuwanie danych i ponownie ocenić plan.

- [x] **PAY-002 — Załóż i sprawdź konto Tpay Sandbox**

### Task PAY-002 — Załóż i sprawdź konto Tpay Sandbox

#### Goal

Załóż i sprawdź konto Tpay Sandbox.

#### Files

CREATED: —. MODIFIED: docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Utwórz oddzielne konto sandbox i zanotuj identyfikator akceptanta oraz dostęp do panelu; żadnych sekretów w repo.

#### Automated tests

Brak; konfiguracja zewnętrzna.

#### Manual test

Zaloguj się do panel.sandbox.tpay.com i otwórz Integracja → API.

#### Expected result

Panel i miejsce utworzenia klucza są dostępne.

#### Acceptance criteria

Konto testowe działa; MT-001 ma aktualne kroki.

#### Do not do yet

Nie twórz klienta API.

#### Wynik — 10 października 2026 r.

- Właściciel potwierdził dostęp do panelu Sandbox i sekcji Integracja → API; klucz Open API został utworzony poza repozytorium.
- `TPAY_CLIENT_ID`, `TPAY_CLIENT_SECRET` i `TPAY_MERCHANT_ID` są uzupełnione lokalnie w ignorowanym przez Git `apps/api/.env.local`; sprawdzono wyłącznie obecność wartości i adres API Sandbox, bez odczytu lub zapisu sekretów do dokumentacji.
- Właściciel wykonał MT-001 w Postmanie: HTTP 200, odpowiedź zawierała `access_token` i `expires_in`. [Protokół przebiegu](test-runs/2026-10-10-mt-001-sandbox.md). Wcześniejsza próba z otoczenia agenta otrzymała 403 od Cloudflare; nie jest wynikiem testu właściciela.
- PAY-002 zakończony. Klient API Tpay i transakcje nie zostały zaimplementowane ani przetestowane w aplikacji.

- [x] **PAY-003 — Zapisz wymagane aktywacje Tpay**

### Task PAY-003 — Zapisz wymagane aktywacje Tpay

#### Goal

Zapisz wymagane aktywacje Tpay.

#### Files

CREATED: —. MODIFIED: docs/tpay-integration-plan.md. DELETED: —.

#### Implementation

Zanotuj status BLIK, kart, tokenizacji, MIT, PAYID model A, refundów i portfeli oraz kontakt do Tpay.

#### Automated tests

Brak; lista kontrolna.

#### Manual test

Sprawdź metody w panelu; poproś Tpay o potwierdzenie funkcji niedostępnych w panelu.

#### Expected result

Lista zawiera potwierdzone i oczekujące funkcje.

#### Acceptance criteria

Wiadomo, co blokuje POC karty, BLIK i walletów.

#### Do not do yet

Nie zakładaj, że sandbox oznacza aktywację produkcyjną.

#### Wynik — 11 października 2026 r.

- Status BLIK, karty, tokenizacji, MIT, PAYID model A, zwrotów i portfeli oraz blokady POC zapisano w [rejestrze PAY-003](../tpay-integration-plan.md).
- Właściciel potwierdził włączenie widocznych kanałów w panelu Sandbox. Tokenizacja, MIT, PAYID model A i zwroty pozostają niepotwierdzone dla konta; Sandbox nie dowodzi aktywacji produkcyjnej.
- **Odstępstwo zaakceptowane przez właściciela:** zapytanie do Tpay o funkcje niewidoczne w panelu jest przygotowane, ale nie zostało wysłane. Można rozpocząć neutralny PAY-004. Odpowiednie POC recurring (PAY-033/040 i następne) pozostają zablokowane do potwierdzenia warunków; zapytanie należy wysłać przed nimi.
- Brak testów automatycznych i zmian zachowania aplikacji w PAY-003.

## Phase 1 — Neutral payment domain

- [x] **PAY-004 — Zdefiniuj statusy i przejścia płatności**

### Task PAY-004 — Zdefiniuj statusy i przejścia płatności

#### Goal

Zdefiniuj statusy i przejścia płatności.

#### Files

CREATED: apps/api/src/payments/domain/payment.types.ts. MODIFIED: apps/api/src/payments/payments.module.ts. DELETED: —.

#### Implementation

Dodaj lokalne ID, grosze, statusy including unknown i monotoniczne przejścia; żadnych Tpay DTO.

#### Automated tests

Unit: dozwolone/niedozwolone przejścia i kwoty.

#### Manual test

Uruchom aplikację i sprawdź, że widoki ogłoszeń nadal się otwierają.

#### Expected result

Brak zmiany zachowania użytkownika; unit tests są zielone.

#### Acceptance criteria

Typy są neutralne i testy przejść przechodzą.

#### Do not do yet

Nie twórz żądań Tpay.

#### Wynik — 11 października 2026 r.

- Dodano neutralne `PaymentId` (lokalny UUID), kwotę jako dodatnią bezpieczną liczbę całkowitą groszy, walutę PLN i statusy z `unknown` oraz monotoniczną tabelą przejść. Powtórzony status jest idempotentnym no-op.
- `apps/api/src/payments/payments.module.ts` nie istniał przed PAY-004, dlatego utworzono pusty moduł bez importu do aplikacji. Nie dodano encji, migracji, adaptera ani żądań Tpay.
- Test jednostkowy `payment.types.spec.ts`: 36/36 PASS. Ręczna kontrola uruchomionej aplikacji: `/oferty`, `/dodaj-oferte` i `/api/listings/public/catalog` zwróciły HTTP 200.
- Zachowanie użytkownika nie zmieniło się; `docs/MANUAL_RELEASE_TESTS.md` nie wymaga aktualizacji.

- [ ] **PAY-005 — Dodaj neutralną encję Payment**

### Task PAY-005 — Dodaj neutralną encję Payment

#### Goal

Dodaj neutralną encję Payment.

#### Files

CREATED: apps/api/src/payments/infrastructure/typeorm/payment.entity.ts; migracja. MODIFIED: apps/api/src/payments/payments.module.ts. DELETED: —.

#### Implementation

Utwórz paymentId, kind, amountMinor, status, provider, identyfikatory korelacji i unikat provider transaction.

#### Automated tests

Migration/integration: zapis, unique i rollback na lokalnej DB.

#### Manual test

Uruchom migrację w testowej bazie i sprawdź, że aplikacja startuje.

#### Expected result

Tabela istnieje; stare ekrany działają.

#### Acceptance criteria

Migracja i testy DB przechodzą.

#### Do not do yet

Nie przenoś prób Stripe do nowej tabeli.

- [ ] **PAY-006 — Dodaj lokalną Subscription**

### Task PAY-006 — Dodaj lokalną Subscription

#### Goal

Dodaj lokalną Subscription.

#### Files

CREATED: apps/api/src/payments/infrastructure/typeorm/subscription.entity.ts; migracja. MODIFIED: apps/api/src/users/agency-plan.service.ts. DELETED: —.

#### Implementation

Zapisz agencję, stałą cenę, miesiąc, okres, status, grace i cancelAtPeriodEnd; rozdziel billing od entitlement.

#### Automated tests

Migration/unit: unikat aktywnej subskrypcji i status past_due + aktywne PRO w grace.

#### Manual test

Otwórz panel planu bez kupowania; sprawdź, że uprawnienia dotychczasowych kont nie znikły.

#### Expected result

Serwis planu nadal decyduje o dostępie.

#### Acceptance criteria

Model nie nadaje PRO automatycznie po samym statusie.

#### Do not do yet

Nie implementuj checkoutu.

- [ ] **PAY-007 — Dodaj RecurringAuthorization**

### Task PAY-007 — Dodaj RecurringAuthorization

#### Goal

Dodaj RecurringAuthorization.

#### Files

CREATED: apps/api/src/payments/infrastructure/typeorm/recurring-authorization.entity.ts; migracja. MODIFIED: apps/api/src/payments/domain/payment.types.ts. DELETED: —.

#### Implementation

Wprowadź provider_reference, provider_reference_type CARD_TOKEN/RECURRING_ALIAS, szyfrowanie i kontrolę odczytu; domena zna lokalny authorizationId.

#### Automated tests

Migration/unit: unique, szyfrowanie round-trip i brak surowej referencji w logu.

#### Manual test

Sprawdź w testowej bazie, że referencja jest zaszyfrowana i aplikacja startuje.

#### Expected result

W bazie nie widać jawnego tokenu ani PAYID.

#### Acceptance criteria

Zaszyfrowany model i testy przechodzą.

#### Do not do yet

Nie pobieraj tokenu z Tpay.

- [ ] **PAY-008 — Dodaj należność i próbę odnowienia**

### Task PAY-008 — Dodaj należność i próbę odnowienia

#### Goal

Dodaj należność i próbę odnowienia.

#### Files

CREATED: apps/api/src/payments/infrastructure/typeorm/subscription-renewal.entity.ts; migracja. MODIFIED: apps/api/src/payments/domain/payment.types.ts. DELETED: —.

#### Implementation

UNIQUE(subscriptionId, periodStart); stany due/charging/unknown/paid/failed i osobne próby charge.

#### Automated tests

Migration/integration: drugi renewal tego okresu odrzucony; unknown blokuje retry.

#### Manual test

Uruchom migrację i obejrzyj testowy zapis; jeden okres ma jedną należność.

#### Expected result

Unikat działa w DB.

#### Acceptance criteria

Duplikat okresu nie powstaje.

#### Do not do yet

Nie uruchamiaj schedulera.

- [ ] **PAY-009 — Dodaj dwa porty i capabilities**

### Task PAY-009 — Dodaj dwa porty i capabilities

#### Goal

Dodaj dwa porty i capabilities.

#### Files

CREATED: apps/api/src/payments/ports/payment-gateway.port.ts; apps/api/src/payments/ports/recurring-gateway.port.ts; apps/api/src/payments/domain/provider-capabilities.ts. MODIFIED: apps/api/src/payments/payments.module.ts. DELETED: —.

#### Implementation

Oddziel one-time/refund od recurring; dodaj neutralne capabilities i tokeny DI; statusy nie zawierają Tpay.

#### Automated tests

Unit: mock obu portów, brak Tpay w importach domeny.

#### Manual test

Uruchom start API z atrapą portów; poza checkoutem strony działają.

#### Expected result

DI przyjmuje mock, brak odwołań do PSP w domenie.

#### Acceptance criteria

Kontrakty są wymienialne i testy przechodzą.

#### Do not do yet

Nie pisz adaptera Tpay.

- [ ] **PAY-010 — Dodaj repozytoria i transakcje stanu**

### Task PAY-010 — Dodaj repozytoria i transakcje stanu

#### Goal

Dodaj repozytoria i transakcje stanu.

#### Files

CREATED: apps/api/src/payments/infrastructure/typeorm/payment.repository.ts; subscription.repository.ts; renewal.repository.ts. MODIFIED: apps/api/src/payments/payments.module.ts. DELETED: —.

#### Implementation

Zapis/odczyt po lokalnych ID, blokada wiersza i atomowy zapis payment + renewal + entitlement projection.

#### Automated tests

Integration: rollback, blokady i podwójny zapis równoległy.

#### Manual test

Uruchom testy bazy, potem zaloguj się i otwórz panel agencji.

#### Expected result

Aplikacja startuje, bez podwójnego wpisu.

#### Acceptance criteria

Repozytoria mają testy transakcyjne.

#### Do not do yet

Nie wysyłaj żądań płatności.

## Phase 2 — Stripe removal

- [ ] **PAY-011 — Wyłącz checkout na czas wymiany**

### Task PAY-011 — Wyłącz checkout na czas wymiany

#### Goal

Wyłącz checkout na czas wymiany.

#### Files

CREATED: —. MODIFIED: apps/api/src/listing-commerce/listing-orders.controller.ts; apps/api/src/agency-plan-commerce/agency-plan-checkout.controller.ts; docs/payments/MANUAL_TESTS.md; docs/MANUAL_RELEASE_TESTS.md. DELETED: —.

#### Implementation

Zwracaj przewidywalny stan niedostępności płatności bez tworzenia próby, a reszta aplikacji działa.

#### Automated tests

API tests: checkout unavailable, pozostałe endpointy 200.

#### Manual test

Wejdź w zakup ogłoszenia i PRO; zobacz jasny komunikat o niedostępności płatności.

#### Expected result

Nie ma przekierowania na Stripe ani nowej próby.

#### Acceptance criteria

Checkout jest bezpiecznie wyłączony i testy przechodzą.

#### Do not do yet

Nie uruchamiaj Tpay.

- [ ] **PAY-012 — Usuń adaptery i webhooki Stripe**

### Task PAY-012 — Usuń adaptery i webhooki Stripe

#### Goal

Usuń adaptery i webhooki Stripe.

#### Files

CREATED: —. MODIFIED: apps/api/src/listing-commerce/listing-commerce.module.ts; apps/api/src/agency-plan-commerce/agency-plan-commerce.module.ts; testy modułów. DELETED: apps/api/src/listing-commerce/stripe-listing-payment.adapter.ts; apps/api/src/listing-commerce/stripe-listing-webhooks.controller.ts; apps/api/src/agency-plan-commerce/stripe-agency-plan-payment.adapter.ts; apps/api/src/agency-plan-commerce/stripe-agency-plan-webhooks.controller.ts; odpowiadające im pliki `.spec.ts`.

#### Implementation

Usuń rejestrację Stripe, endpointy webhooków i importy SDK; neutralne serwisy zachowaj.

#### Automated tests

Build/unit: brak importów Stripe i zielony start API.

#### Manual test

Uruchom API; otwórz ogłoszenia i panel agencji; checkout pokazuje niedostępność.

#### Expected result

Aplikacja działa bez webhooków Stripe.

#### Acceptance criteria

Backend kompiluje się i testy przechodzą.

#### Do not do yet

Nie dodawaj jeszcze Tpay webhooka.

- [ ] **PAY-013 — Usuń Stripe z frontendu i konfiguracji**

### Task PAY-013 — Usuń Stripe z frontendu i konfiguracji

#### Goal

Usuń Stripe z frontendu i konfiguracji.

#### Files

CREATED: —. MODIFIED: apps/web/src/app/(auth)/register/page.tsx; apps/web/src/app/(dashboard)/dashboard/upgrade/page.tsx; apps/web/src/components/listing-commerce/seller-listing-checkout-panel.tsx; apps/web/src/lib/billing-plans.ts; .env.example; docs/LOCAL_SETUP.md; docs/payments/MANUAL_TESTS.md; docs/MANUAL_RELEASE_TESTS.md. DELETED: apps/web/src/lib/stripe-checkout-url.ts; apps/web/src/lib/stripe-checkout-url.spec.ts.

#### Implementation

Usuń Stripe URL helper, teksty i ENV; zachowaj bezpieczny komunikat niedostępności.

#### Automated tests

Web build/unit: brak Stripe helpera i importów.

#### Manual test

Otwórz rejestrację, upgrade i zakup ogłoszenia; brak marki Stripe.

#### Expected result

Interfejs nie wysyła na Stripe.

#### Acceptance criteria

Frontend buduje się i scenariusz ręczny opisany.

#### Do not do yet

Nie twórz jeszcze Tpay redirect.

- [ ] **PAY-014 — Usuń SDK i pola Stripe w lokalnej bazie**

### Task PAY-014 — Usuń SDK i pola Stripe w lokalnej bazie

#### Goal

Usuń SDK i pola Stripe w lokalnej bazie.

#### Files

CREATED: migracja developerska. MODIFIED: apps/api/package.json; pnpm-lock.yaml; apps/api/src/plans/entities/plan-catalog.entity.ts; admin plan DTO/UI/testy; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Po potwierdzeniu PAY-001 usuń testowe Stripe ID/kolumny, zależność SDK i pozostałe konfiguracje; nie kasuj innych danych.

#### Automated tests

Migration/build: API i web kompilują się, brak aktywnych importów/ENV Stripe.

#### Manual test

Uruchom pełną aplikację, zaloguj się, przejdź podstawowe ekrany; płatności pokazują niedostępność.

#### Expected result

Aplikacja działa bez Stripe.

#### Acceptance criteria

Testy i lint przechodzą; rg potwierdza brak aktywnego Stripe.

#### Do not do yet

Nie implementuj Tpay.

## Phase 3 — Tpay basic client

- [ ] **PAY-015 — Dodaj konfigurację Tpay Sandbox**

### Task PAY-015 — Dodaj konfigurację Tpay Sandbox

#### Goal

Dodaj konfigurację Tpay Sandbox.

#### Files

CREATED: apps/api/src/payments/infrastructure/tpay/tpay.config.ts. MODIFIED: apps/api/src/payments/payments.module.ts; .env.example; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Waliduj PAYMENT_PROVIDER, TPAY_API_URL i backendowe sekrety; osobne środowiska sandbox/production.

#### Automated tests

Unit: brak sekretu/nieznany provider blokuje start; sekret nie trafia do logu.

#### Manual test

Uzupełnij lokalny .env.local i uruchom API; zobacz start bez wyświetlania sekretów.

#### Expected result

API startuje z prawidłową konfiguracją.

#### Acceptance criteria

Konfiguracja jest bezpieczna i MT-001 aktualny.

#### Do not do yet

Nie pobieraj tokenu.

- [ ] **PAY-016 — Zaimplementuj OAuth token client**

### Task PAY-016 — Zaimplementuj OAuth token client

#### Goal

Zaimplementuj OAuth token client.

#### Files

CREATED: apps/api/src/payments/infrastructure/tpay/tpay-api.client.ts. MODIFIED: apps/api/src/payments/payments.module.ts. DELETED: —.

#### Implementation

POST /oauth/auth, cache expires_in z marginesem, pojedyncze odświeżenie, timeout i maskowanie błędów.

#### Automated tests

Unit: cache, expiry, równoległe odświeżenie, 401 i timeout.

#### Manual test

Uruchom MT-001: w sandboxie uzyskaj token przy prawidłowych danych.

#### Expected result

Token działa i nie pojawia się w logach.

#### Acceptance criteria

Klient ma testy i ręczne potwierdzenie.

#### Do not do yet

Nie wywołuj transakcji.

- [ ] **PAY-017 — Dodaj test integracyjny OAuth**

### Task PAY-017 — Dodaj test integracyjny OAuth

#### Goal

Dodaj test integracyjny OAuth.

#### Files

CREATED: apps/api/src/payments/infrastructure/tpay/tpay-api.client.spec.ts. MODIFIED: docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Dopisz test na odpowiedź sandbox/HTTP, refresh i niejawne błędy; oznacz test sieciowy jako opt-in.

#### Automated tests

Integration: prawidłowy/nieprawidłowy client secret, expiry.

#### Manual test

Powtórz MT-001 i zapisz Pass/Fail.

#### Expected result

Wynik tokenu jest jednoznaczny.

#### Acceptance criteria

Test i instrukcja są reviewable.

#### Do not do yet

Nie koduj GET methods.

- [ ] **PAY-018 — Odczytaj metody płatności**

### Task PAY-018 — Odczytaj metody płatności

#### Goal

Odczytaj metody płatności.

#### Files

CREATED: —. MODIFIED: apps/api/src/payments/infrastructure/tpay/tpay-api.client.ts; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Dodaj oficjalny GET kanałów/metod dla płatności jednorazowych. Nie wywódź z listy kanałów zgody na MIT ani PAYID; te capabilities wymagają potwierdzenia z PAY-003.

#### Automated tests

Unit/integration: kanał dostępny/niedostępny i błędy API.

#### Manual test

W panelu lub narzędziu dev sprawdź listę BLIK/kart dla sandbox.

#### Expected result

Widać rzeczywiście dostępne metody.

#### Acceptance criteria

Nie deklarujemy metody niedostępnej na koncie.

#### Do not do yet

Nie uruchamiaj checkoutu.

- [ ] **PAY-019 — Utwórz transakcję Tpay przez klienta**

### Task PAY-019 — Utwórz transakcję Tpay przez klienta

#### Goal

Utwórz transakcję Tpay przez klienta.

#### Files

CREATED: —. MODIFIED: apps/api/src/payments/infrastructure/tpay/tpay-api.client.ts; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Dodaj POST /transactions, decimal PLN, callback URLs, zapis transactionId/title/url i klasyfikację niepewnego POST.

#### Automated tests

Unit/integration: kwoty, 4xx, 5xx i timeout=unknown.

#### Manual test

Uruchom MT-002 w sandboxie z testową kwotą.

#### Expected result

Powstaje transakcja pending i link Tpay.

#### Acceptance criteria

MT-002 i testy przechodzą.

#### Do not do yet

Nie aktywuj ogłoszenia.

- [ ] **PAY-020 — Odczytaj status transakcji**

### Task PAY-020 — Odczytaj status transakcji

#### Goal

Odczytaj status transakcji.

#### Files

CREATED: —. MODIFIED: apps/api/src/payments/infrastructure/tpay/tpay-api.client.ts; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Dodaj GET /transactions/{id} tylko jako fallback reconciliation; mapuj wynik na neutralny status.

#### Automated tests

Unit: pending/paid/failed/404 i brak fałszywego confirmed.

#### Manual test

Użyj ID z MT-002 i sprawdź status w sandboxie.

#### Expected result

Status jest zgodny z panelem.

#### Acceptance criteria

Odczyt działa, bez polling każdej płatności.

#### Do not do yet

Nie buduj schedulera.

## Phase 4 — One-time payment

- [ ] **PAY-021 — Połącz ogłoszenie z Payment**

### Task PAY-021 — Połącz ogłoszenie z Payment

#### Goal

Połącz ogłoszenie z Payment.

#### Files

CREATED: —. MODIFIED: apps/api/src/listing-commerce/listing-checkout-sessions.service.ts; listing-payment-gateway.port.ts; apps/api/src/payments/application/payment.service.ts; testy; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Twórz lokalny Payment z kwotą z wyceny, korelację do order i blokadę drugiej aktywnej próby.

#### Automated tests

Unit/integration: kwota z backendu, duplicate order, brak e-mail verification.

#### Manual test

Utwórz testowe ogłoszenie i rozpocznij zakup; w panelu zobacz oczekiwanie na płatność.

#### Expected result

Jedno zamówienie ma jedną aktywną próbę.

#### Acceptance criteria

Test i scenariusz zakupu są opisane.

#### Do not do yet

Nie nadaj entitlement.

- [ ] **PAY-022 — Dodaj adapter płatności jednorazowej**

### Task PAY-022 — Dodaj adapter płatności jednorazowej

#### Goal

Dodaj adapter płatności jednorazowej.

#### Files

CREATED: apps/api/src/payments/infrastructure/tpay/tpay-payment.adapter.ts. MODIFIED: apps/api/src/payments/payments.module.ts; testy adaptera. DELETED: —.

#### Implementation

Mapuj createPayment/status na Tpay; zapisuj transactionId/title i unknown po niepewnej odpowiedzi.

#### Automated tests

Unit/integration: poprawna kwota i callback, błędy/timeout.

#### Manual test

Rozpocznij testowy zakup; sprawdź, że pojawia się link Tpay.

#### Expected result

Link prowadzi do sandboxu, Payment pending.

#### Acceptance criteria

Adapter realizuje tylko port, testy zielone.

#### Do not do yet

Nie odbieraj jeszcze webhooka.

- [ ] **PAY-023 — Dodaj bezpieczny redirect Next.js**

### Task PAY-023 — Dodaj bezpieczny redirect Next.js

#### Goal

Dodaj bezpieczny redirect Next.js.

#### Files

CREATED: apps/web/src/lib/payment-checkout-url.ts. MODIFIED: apps/web/src/components/listing-commerce/seller-listing-checkout-panel.tsx; testy; docs/payments/MANUAL_TESTS.md; docs/MANUAL_RELEASE_TESTS.md. DELETED: —.

#### Implementation

Waliduj HTTPS host checkoutu i pokaż processing po powrocie; success URL nie nadaje uprawnienia.

#### Automated tests

Unit/web: host poprawny/obcy, return nie zmienia stanu.

#### Manual test

Przejdź zakup, wróć z Tpay; ogłoszenie nadal czeka na potwierdzenie.

#### Expected result

Nie widać fałszywego sukcesu po redirect.

#### Acceptance criteria

MT-002 zaktualizowany, web build zielony.

#### Do not do yet

Nie dodawaj webhook fulfillment.

- [ ] **PAY-024 — Obsłuż odmowę, anulowanie i unknown**

### Task PAY-024 — Obsłuż odmowę, anulowanie i unknown

#### Goal

Obsłuż odmowę, anulowanie i unknown.

#### Files

CREATED: —. MODIFIED: apps/api/src/payments/application/payment.service.ts; apps/api/src/listing-commerce/listing-payment-reconciliation.service.ts; testy; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Niepewny POST/status kieruj do reconciliation; anulowanie redirectem nie zmienia zapłaconej płatności; nie rób ślepego retry.

#### Automated tests

Unit/integration: timeout, spóźniony sukces, failed, restart.

#### Manual test

Wykonaj MT-004 i przerwij płatność przed zatwierdzeniem.

#### Expected result

Ogłoszenie nie jest aktywne; unknown nie wywołuje drugiej transakcji.

#### Acceptance criteria

Scenariusze błędu przechodzą.

#### Do not do yet

Nie twórz webhook JWS.

## Phase 5 — Webhooks

- [ ] **PAY-025 — Zaimplementuj weryfikator JWS**

### Task PAY-025 — Zaimplementuj weryfikator JWS

#### Goal

Zaimplementuj weryfikator JWS.

#### Files

CREATED: apps/api/src/payments/infrastructure/tpay/tpay-jws.verifier.ts. MODIFIED: testy weryfikatora. DELETED: —.

#### Implementation

Sprawdź detached JWS na raw body, x5u allowlist, certyfikat i Tpay CA; bez pobierania z dowolnego hosta.

#### Automated tests

Unit: dobry/zły podpis, body, certyfikat, x5u i alg.

#### Manual test

Uruchom MT-006 z przygotowanym błędnym webhookiem; aplikacja nie zmienia płatności.

#### Expected result

Błędny podpis jest odrzucony.

#### Acceptance criteria

Weryfikacja kryptograficzna ma testy.

#### Do not do yet

Nie parsuj logiki ogłoszeń.

- [ ] **PAY-026 — Dodaj cienki endpoint Tpay webhook**

### Task PAY-026 — Dodaj cienki endpoint Tpay webhook

#### Goal

Dodaj cienki endpoint Tpay webhook.

#### Files

CREATED: apps/api/src/payments/infrastructure/tpay/tpay-webhook.controller.ts. MODIFIED: apps/api/src/payments/payments.module.ts; testy; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Odbierz raw form body, wywołaj verifier, zwróć właściwe ACK TRUE; nie nadaj PRO w kontrolerze.

#### Automated tests

Controller tests: 200 TRUE, 4xx zły JWS, bez redirect.

#### Manual test

Wywołaj MT-006; w logu widać odrzucenie bez danych karty.

#### Expected result

Endpoint odpowiada zgodnie z Tpay.

#### Acceptance criteria

Testy transportu i MT-006 opisane.

#### Do not do yet

Nie aktualizuj Payment.

- [ ] **PAY-027 — Dodaj ledger zdarzeń i idempotencję**

### Task PAY-027 — Dodaj ledger zdarzeń i idempotencję

#### Goal

Dodaj ledger zdarzeń i idempotencję.

#### Files

CREATED: apps/api/src/payments/infrastructure/typeorm/payment-event.entity.ts; migracja. MODIFIED: apps/api/src/payments/application/payment.service.ts; testy; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Unikat event key i transakcja DB; duplikat zwraca ACK, starszy event nie cofa paid.

#### Automated tests

Migration/integration: duplicate, out-of-order, rollback.

#### Manual test

Uruchom MT-005: odeślij tę samą notyfikację drugi raz.

#### Expected result

Brak drugiej aktywacji/obciążenia.

#### Acceptance criteria

Deduplikacja działa na poziomie DB.

#### Do not do yet

Nie obsługuj jeszcze alias webhook.

- [ ] **PAY-028 — Potwierdzaj płatność ogłoszenia**

### Task PAY-028 — Potwierdzaj płatność ogłoszenia

#### Goal

Potwierdzaj płatność ogłoszenia.

#### Files

CREATED: —. MODIFIED: apps/api/src/listing-commerce/listing-payment-events.service.ts; apps/api/src/payments/application/payment.service.ts; testy; docs/payments/MANUAL_TESTS.md; docs/MANUAL_RELEASE_TESTS.md. DELETED: —.

#### Implementation

Porównaj merchant, ID, kwotę i walutę; w transakcji potwierdź Payment, order i entitlement.

#### Automated tests

Integration/E2E: pełna kwota, za mało, nieznane ID, ponowny webhook.

#### Manual test

Wykonaj MT-003: zapłać BLIK w sandboxie i wróć do panelu.

#### Expected result

Ogłoszenie aktywne dopiero po webhooku.

#### Acceptance criteria

MT-003 i testy przechodzą.

#### Do not do yet

Nie buduj recurring.

- [ ] **PAY-029 — Dopnij scenariusze webhook negatywne**

### Task PAY-029 — Dopnij scenariusze webhook negatywne

#### Goal

Dopnij scenariusze webhook negatywne.

#### Files

CREATED: —. MODIFIED: apps/api/src/payments/infrastructure/tpay/tpay-webhook.controller.spec.ts; apps/api/src/listing-commerce/listing-payment-events.service.spec.ts; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Dodaj testy nieznanego payment, złej kwoty, replay i opóźnionego sukcesu; alert bez aktywacji.

#### Automated tests

Unit/integration: wszystkie wymienione przypadki.

#### Manual test

Powtórz MT-005 i MT-006 oraz nieudaną płatność MT-004.

#### Expected result

Brak nieuprawnionego ogłoszenia.

#### Acceptance criteria

Negatywne scenariusze są stabilne.

#### Do not do yet

Nie przechodź do refund bez zielonych testów.

## Phase 6 — Refund

- [ ] **PAY-030 — Dodaj żądanie refund Tpay**

### Task PAY-030 — Dodaj żądanie refund Tpay

#### Goal

Dodaj żądanie refund Tpay.

#### Files

CREATED: —. MODIFIED: apps/api/src/payments/infrastructure/tpay/tpay-api.client.ts; tpay-payment.adapter.ts; testy. DELETED: —.

#### Implementation

POST /transactions/{id}/refunds, pełny/częściowy zwrot, timeout jako unknown.

#### Automated tests

Unit/integration: kwota, 4xx, timeout, brak drugiego refund przy unknown.

#### Manual test

Uruchom MT-015 na testowej płatności.

#### Expected result

Panel Tpay pokazuje żądanie zwrotu.

#### Acceptance criteria

Adapter mapuje wynik bez zmiany entitlement.

#### Do not do yet

Nie rozstrzygaj polityki zwrotowej.

- [ ] **PAY-031 — Dodaj lokalny rekord Refund**

### Task PAY-031 — Dodaj lokalny rekord Refund

#### Goal

Dodaj lokalny rekord Refund.

#### Files

CREATED: apps/api/src/payments/infrastructure/typeorm/refund.entity.ts; migracja. MODIFIED: apps/api/src/payments/application/payment.service.ts; testy; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Trwały request/response, unique refund intent, powiązanie z payment; potwierdzenie wyniku przez webhook refundu lub odczyt statusu operatora. Korekta zamówienia wg decyzji produktu.

#### Automated tests

Migration/integration: duplicate, partial, timeout i rollback.

#### Manual test

Powtórz MT-015 i sprawdź historię zamówienia.

#### Expected result

Zwrot i status są widoczne bez podwójnego żądania.

#### Acceptance criteria

Model i testy przechodzą.

#### Do not do yet

Nie automatyzuj faktur.

- [ ] **PAY-032 — Dodaj kontrolowaną akcję zwrotu**

### Task PAY-032 — Dodaj kontrolowaną akcję zwrotu

#### Goal

Dodaj kontrolowaną akcję zwrotu.

#### Files

CREATED: —. MODIFIED: apps/api/src/listing-commerce/listing-orders.controller.ts; testy; docs/payments/MANUAL_TESTS.md; docs/MANUAL_RELEASE_TESTS.md. DELETED: —.

#### Implementation

Dostęp tylko uprawnionej roli; zwrot inicjowany po lokalnym paymentId z audytem.

#### Automated tests

API/E2E: autoryzacja, duplicate request, brak opłaconej płatności.

#### Manual test

Wykonaj MT-015 jako administrator i zwykły użytkownik.

#### Expected result

Administrator może zwrócić; zwykły użytkownik nie.

#### Acceptance criteria

Role, audyt i manualny scenariusz przechodzą.

#### Do not do yet

Nie buduj self-service refund.

## Phase 7 — Card recurring POC


- [ ] **PAY-033 — Potwierdź warunki karty recurring**

### Task PAY-033 — Potwierdź warunki karty recurring

#### Goal

Potwierdź warunki karty recurring.

#### Files

CREATED: —. MODIFIED: docs/tpay-integration-plan.md; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Uzyskaj od Tpay informację o tokenizacji, MIT/cof=recurring, uprawnieniu sandbox/produkcja i prawidłowym payloadzie.

#### Automated tests

Brak; bramka przed POC.

#### Manual test

Sprawdź w panelu i korespondencji Tpay, że funkcje są aktywne; zanotuj wynik.

#### Expected result

Jest potwierdzenie albo jawny blocker.

#### Acceptance criteria

Nie rozpoczynamy POC bez wymaganych danych.

#### Do not do yet

Nie projektuj obejścia kartą jednorazową.


- [ ] **PAY-034 — Sprawdź pierwszą kartę i token w POC**

### Task PAY-034 — Sprawdź pierwszą kartę i token w POC

#### Goal

Sprawdź pierwszą kartę i token w POC.

#### Files

CREATED: tymczasowy skrypt lub opt-in integration spec poza produkcyjnym API. MODIFIED: docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Sandbox initial payment + 3DS + podpisany card_token; sekret i token poza repo, skrypt usunąć po POC.

#### Automated tests

Opt-in integration: token callback i zły podpis.

#### Manual test

Wykonaj MT-008 z testową kartą Tpay.

#### Expected result

Płatność potwierdzona, token dostępny wyłącznie backendowi.

#### Acceptance criteria

Dowód POC zapisany bez sekretów.

#### Do not do yet

Nie twórz abonamentu w aplikacji.


- [ ] **PAY-035 — Sprawdź drugie obciążenie karty w POC**

### Task PAY-035 — Sprawdź drugie obciążenie karty w POC

#### Goal

Sprawdź drugie obciążenie karty w POC.

#### Files

CREATED: tymczasowy skrypt lub opt-in integration spec. MODIFIED: docs/payments/MANUAL_TESTS.md. DELETED: tymczasowy kod po pozytywnym POC.

#### Implementation

Wyślij drugi charge tokenem zgodnie z potwierdzonym payloadem; odbierz webhook i sprawdź brak dubla przy timeout.

#### Automated tests

Opt-in integration: sukces, odmowa, timeout i webhook.

#### Manual test

Wykonaj MT-009 na sandboxie, porównaj dwie transakcje.

#### Expected result

Drugie obciążenie jest odrębną opłaconą transakcją.

#### Acceptance criteria

POC dowodzi MIT i kod tymczasowy usunięty.

#### Do not do yet

Nie podłączaj produkcyjnego schedulera.

## Phase 8 — Card recurring production flow


- [ ] **PAY-036 — Dodaj adapter autoryzacji karty**

### Task PAY-036 — Dodaj adapter autoryzacji karty

#### Goal

Dodaj adapter autoryzacji karty.

#### Files

CREATED: apps/api/src/payments/infrastructure/tpay/tpay-recurring.adapter.ts. MODIFIED: apps/api/src/payments/payments.module.ts; testy; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Initial card payment/tokenization, zapis zaszyfrowanej referencji CARD_TOKEN po potwierdzeniu.

#### Automated tests

Unit/integration: token, 3DS, zły callback i brak PAN.

#### Manual test

Wykonaj MT-008 przez aplikację.

#### Expected result

Zgoda aktywna dopiero po potwierdzeniu.

#### Acceptance criteria

Adapter spełnia neutralny port.

#### Do not do yet

Nie uruchamiaj kolejnego okresu.


- [ ] **PAY-037 — Dodaj pierwszy okres subskrypcji**

### Task PAY-037 — Dodaj pierwszy okres subskrypcji

#### Goal

Dodaj pierwszy okres subskrypcji.

#### Files

CREATED: —. MODIFIED: apps/api/src/agency-plan-commerce/agency-plan-checkout-attempts.service.ts; agency-plan-payment-events.service.ts; apps/api/src/payments/application/recurring.service.ts; testy; docs/payments/MANUAL_TESTS.md; docs/MANUAL_RELEASE_TESTS.md. DELETED: —.

#### Implementation

Twórz stały miesięczny plan i pierwszą należność, aktywuj PRO po zapłacie oraz tokenie; bez kuponów Stripe.

#### Automated tests

Integration/E2E: paid + token, paid bez tokena, duplikat, brak zapłaty.

#### Manual test

Kup PRO kartą w sandboxie i sprawdź datę końca planu.

#### Expected result

PRO aktywne przez opłacony okres.

#### Acceptance criteria

Pierwszy okres i entitlement rozdzielone.

#### Do not do yet

Nie naliczaj następnego miesiąca.


- [ ] **PAY-038 — Dodaj pojedynczy charge karty**

### Task PAY-038 — Dodaj pojedynczy charge karty

#### Goal

Dodaj pojedynczy charge karty.

#### Files

CREATED: —. MODIFIED: apps/api/src/payments/application/recurring.service.ts; tpay-recurring.adapter.ts; testy; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Wywołanie charge dla jawnie wybranej należności; wynik pending/unknown/confirmed; bez automatycznego retry.

#### Automated tests

Unit/integration: token, kwota, timeout, drugi call z tym samym renewal.

#### Manual test

Uruchom MT-009 na testowym okresie, z asystą developera.

#### Expected result

Nowy okres opłacony tylko po webhooku.

#### Acceptance criteria

Brak drugiego charge przy unknown.

#### Do not do yet

Nie dodawaj schedulera.


- [ ] **PAY-039 — Dopnij obsługę webhook karty**

### Task PAY-039 — Dopnij obsługę webhook karty

#### Goal

Dopnij obsługę webhook karty.

#### Files

CREATED: —. MODIFIED: apps/api/src/payments/infrastructure/tpay/tpay-webhook.controller.ts; apps/api/src/payments/application/recurring.service.ts; testy; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Mapuj tokenizację i płatność do lokalnych zdarzeń; ACK odpowiedni do typu; stale events bez cofnięcia PRO.

#### Automated tests

Webhook/integration: token, paid, duplicate, reversed order, invalid JWS.

#### Manual test

Powtórz MT-008 i MT-009, sprawdź stan po powrocie.

#### Expected result

Token i płatność mają osobne potwierdzenia.

#### Acceptance criteria

Testy różnych ACK przechodzą.

#### Do not do yet

Nie implementuj BLIK PAYID.

## Phase 9 — BLIK recurring POC


- [ ] **PAY-040 — Potwierdź PAYID model A**

### Task PAY-040 — Potwierdź PAYID model A

#### Goal

Potwierdź PAYID model A.

#### Files

CREATED: —. MODIFIED: docs/tpay-integration-plan.md; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Potwierdź aktywację BLIK Płatności Powtarzalne, PAYID, model A i parametry limitów/daty/okresu.

#### Automated tests

Brak; bramka przed POC.

#### Manual test

Sprawdź panel i potwierdzenie Tpay, zapisz dostępne banki.

#### Expected result

Jest potwierdzenie lub jawny blocker.

#### Acceptance criteria

POC ma prawidłowe warunki konta.

#### Do not do yet

Nie używaj BLIK One Click zamiast PAYID.


- [ ] **PAY-041 — Sprawdź zgodę PAYID w POC**

### Task PAY-041 — Sprawdź zgodę PAYID w POC

#### Goal

Sprawdź zgodę PAYID w POC.

#### Files

CREATED: tymczasowy skrypt lub opt-in integration spec. MODIFIED: docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Zainicjuj zgodę model A na stałą kwotę i 1M; odbierz ALIAS_REGISTER oddzielnie od płatności.

#### Automated tests

Opt-in integration: alias aktywny i brak zgody.

#### Manual test

Wykonaj MT-010 w sandboxie.

#### Expected result

Zgoda i pierwsza płatność są osobno rozpoznane.

#### Acceptance criteria

POC dowodzi aktywacji aliasu.

#### Do not do yet

Nie zapisuj PAYID jako domenowego statusu.


- [ ] **PAY-042 — Sprawdź charge i revoke PAYID w POC**

### Task PAY-042 — Sprawdź charge i revoke PAYID w POC

#### Goal

Sprawdź charge i revoke PAYID w POC.

#### Files

CREATED: tymczasowy skrypt lub opt-in integration spec. MODIFIED: docs/payments/MANUAL_TESTS.md. DELETED: tymczasowy kod po POC.

#### Implementation

Użyj aliasu do drugiej transakcji, odbierz webhook, cofnij zgodę i sprawdź kolejne obciążenie odrzucone.

#### Automated tests

Opt-in integration: charge, revoke, duplicate/timeout.

#### Manual test

Wykonaj MT-011 i test cofnięcia zgody.

#### Expected result

Druga płatność działa, cofnięty alias nie działa.

#### Acceptance criteria

POC udokumentowany i kod tymczasowy usunięty.

#### Do not do yet

Nie uruchamiaj produkcyjnego billing job.

## Phase 10 — BLIK recurring production flow


- [ ] **PAY-043 — Dodaj adapter zgody PAYID**

### Task PAY-043 — Dodaj adapter zgody PAYID

#### Goal

Dodaj adapter zgody PAYID.

#### Files

CREATED: —. MODIFIED: apps/api/src/payments/infrastructure/tpay/tpay-recurring.adapter.ts; testy; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Mapuj neutralne RECURRING_ALIAS na PAYID model A; w bazie zaszyfrowany provider_reference.

#### Automated tests

Unit/integration: model A, alias unique, brak jawnej referencji.

#### Manual test

Wykonaj MT-010 przez aplikację.

#### Expected result

Zgoda oczekuje na ALIAS_REGISTER.

#### Acceptance criteria

Adapter nie przecieka PAYID do domeny.

#### Do not do yet

Nie naliczaj następnego okresu.


- [ ] **PAY-044 — Obsłuż alias webhook**

### Task PAY-044 — Obsłuż alias webhook

#### Goal

Obsłuż alias webhook.

#### Files

CREATED: —. MODIFIED: apps/api/src/payments/infrastructure/tpay/tpay-webhook.controller.ts; apps/api/src/payments/application/recurring.service.ts; testy; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

ALIAS_REGISTER/UPDATE/UNREGISTER/EXPIRED po JWS zmieniają authorization, niezależnie od payment.

#### Automated tests

Webhook tests: duplikat, wycofanie, brak płatności, opóźniona kolejność.

#### Manual test

Wykonaj MT-010, potem cofnij zgodę w banku lub sandboxie.

#### Expected result

Aplikacja pokazuje aktualny stan zgody.

#### Acceptance criteria

Wycofana zgoda blokuje charge.

#### Do not do yet

Nie zmieniaj statusu PRO bez reguł entitlement.


- [ ] **PAY-045 — Dodaj pierwszy okres i charge BLIK**

### Task PAY-045 — Dodaj pierwszy okres i charge BLIK

#### Goal

Dodaj pierwszy okres i charge BLIK.

#### Files

CREATED: —. MODIFIED: apps/api/src/payments/application/recurring.service.ts; apps/api/src/agency-plan-commerce/agency-plan-payment-events.service.ts; testy; docs/payments/MANUAL_TESTS.md; docs/MANUAL_RELEASE_TESTS.md. DELETED: —.

#### Implementation

Aktywuj PRO po płatności i zgodzie; dla kolejnego okresu twórz transakcję PAYID i czekaj na potwierdzenie.

#### Automated tests

Integration/E2E: paid/no alias, alias/no paid, drugi charge, timeout.

#### Manual test

Wykonaj MT-010 i MT-011 przez aplikację.

#### Expected result

PRO przedłuża się po opłaconym kolejnym okresie.

#### Acceptance criteria

Przypadki częściowych potwierdzeń są bezpieczne.

#### Do not do yet

Nie dodawaj promocyjnej kwoty.


- [ ] **PAY-046 — Dodaj revocation przez adapter**

### Task PAY-046 — Dodaj revocation przez adapter

#### Goal

Dodaj revocation przez adapter.

#### Files

CREATED: —. MODIFIED: apps/api/src/payments/infrastructure/tpay/tpay-recurring.adapter.ts; apps/api/src/payments/application/recurring.service.ts; testy; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Cofnięcie aliasu w PSP i lokalna blokada kolejnych obciążeń, z unknown gdy odpowiedź niepewna.

#### Automated tests

Unit/integration: revoke success, timeout, duplicate.

#### Manual test

Wykonaj test cofnięcia z MT-012 po końcu okresu.

#### Expected result

Nie da się obciążyć cofniętej zgody.

#### Acceptance criteria

Revoke działa bez utraty historii.

#### Do not do yet

Nie dodawaj cancel UI.

## Phase 11 — Billing scheduler


- [ ] **PAY-047 — Wybieraj należne okresy**

### Task PAY-047 — Wybieraj należne okresy

#### Goal

Wybieraj należne okresy.

#### Files

CREATED: apps/api/src/payments/application/billing.scheduler.ts. MODIFIED: apps/api/src/payments/payments.module.ts; testy. DELETED: —.

#### Implementation

NestJS Scheduler + advisory lock + row locking tworzą jedną należność na okres, bez wysyłania charge.

#### Automated tests

Integration: dwa schedulery, unique period, restart.

#### Manual test

W testowej bazie ustaw następny okres na dziś i uruchom API.

#### Expected result

Powstaje jedna należność, bez obciążenia.

#### Acceptance criteria

Wybór jest bezpieczny równolegle.

#### Do not do yet

Nie wywołuj Tpay.


- [ ] **PAY-048 — Wyślij należny charge**

### Task PAY-048 — Wyślij należny charge

#### Goal

Wyślij należny charge.

#### Files

CREATED: —. MODIFIED: apps/api/src/payments/application/billing.scheduler.ts; recurring.service.ts; testy; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Po commit wyślij charge, zapisz wynik pending/unknown, nie oznaczaj paid przed webhookiem.

#### Automated tests

Integration: karta i alias, timeout, duplikat joba.

#### Manual test

Wykonaj MT-009 lub MT-011 z przyspieszonym okresem.

#### Expected result

Powstaje jedna próba, PRO nie jest przedłużone przed zapłatą.

#### Acceptance criteria

Jedno obciążenie na należność.

#### Do not do yet

Nie implementuj retry.


- [ ] **PAY-049 — Dodaj reconciliation stanu unknown**

### Task PAY-049 — Dodaj reconciliation stanu unknown

#### Goal

Dodaj reconciliation stanu unknown.

#### Files

CREATED: —. MODIFIED: apps/api/src/payments/application/billing.scheduler.ts; recurring.service.ts; testy; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Zatrzymaj kolejne charge; webhook/GET status rozstrzyga; bez ID PSP oznacz do ręcznego uzgodnienia.

#### Automated tests

Integration: timeout przed ID, po ID, restart i spóźniony webhook.

#### Manual test

Przerwij połączenie testowe i wykonaj MT-013 z pomocą developera.

#### Expected result

Status niepewny jest widoczny, bez drugiego charge.

#### Acceptance criteria

Unknown nie przechodzi samo w failed.

#### Do not do yet

Nie buduj ręcznej edycji księgowej.


- [ ] **PAY-050 — Przetestuj odzyskiwanie schedulera**

### Task PAY-050 — Przetestuj odzyskiwanie schedulera

#### Goal

Przetestuj odzyskiwanie schedulera.

#### Files

CREATED: —. MODIFIED: apps/api/src/payments/application/billing.scheduler.spec.ts; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Testy restartu i dwóch procesów, śledzenie correlationId, alert dla długiego unknown.

#### Automated tests

Integration/E2E: row lock, crash after commit, duplicate webhook.

#### Manual test

Zrestartuj API podczas testowego odnowienia; sprawdź jedną płatność.

#### Expected result

Nie ma podwójnego pobrania.

#### Acceptance criteria

Test odtwarza awarię i jest zielony.

#### Do not do yet

Nie dodawaj kolejki.

## Phase 12 — Dunning / grace period


- [ ] **PAY-051 — Dodaj prostą politykę retry**

### Task PAY-051 — Dodaj prostą politykę retry

#### Goal

Dodaj prostą politykę retry.

#### Files

CREATED: —. MODIFIED: apps/api/src/payments/application/recurring.service.ts; billing.scheduler.ts; testy; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Ponowienia D+1, D+3, D+7 wyłącznie po pewnym failed; unknown i oczekująca akceptacja BLIK blokują retry.

#### Automated tests

Unit/integration: daty, failed vs unknown, pending approval.

#### Manual test

Wykonaj MT-013 z testową odmową.

#### Expected result

Widać termin następnej próby, bez podwójnego charge.

#### Acceptance criteria

Retry nie startuje dla unknown.

#### Do not do yet

Nie dodawaj zaawansowanego dunning.


- [ ] **PAY-052 — Rozdziel grace od statusu subskrypcji**

### Task PAY-052 — Rozdziel grace od statusu subskrypcji

#### Goal

Rozdziel grace od statusu subskrypcji.

#### Files

CREATED: —. MODIFIED: apps/api/src/users/agency-plan.service.ts; apps/api/src/payments/application/recurring.service.ts; testy; docs/payments/MANUAL_TESTS.md; docs/MANUAL_RELEASE_TESTS.md. DELETED: —.

#### Implementation

AgencyPlanService wylicza entitlement przez 7 dni grace po okresie przy past_due; po tym Free/expired.

#### Automated tests

Unit/E2E: past_due + active PRO, koniec grace, paid recovery.

#### Manual test

Wykonaj MT-014 na testowym koncie z symulowaną datą.

#### Expected result

PRO działa w grace, później wygasa.

#### Acceptance criteria

Frontend dostaje wynik uprawnienia z API.

#### Do not do yet

Nie używaj frontendowego wyliczania.


- [ ] **PAY-053 — Dodaj komunikat o nieudanej płatności**

### Task PAY-053 — Dodaj komunikat o nieudanej płatności

#### Goal

Dodaj komunikat o nieudanej płatności.

#### Files

CREATED: —. MODIFIED: apps/api/src/payments/application/recurring.service.ts; apps/web/src/app/(dashboard)/dashboard/upgrade/page.tsx; testy; docs/payments/MANUAL_TESTS.md; docs/MANUAL_RELEASE_TESTS.md. DELETED: —.

#### Implementation

Pokaż past_due, termin kolejnej próby i możliwość zmiany metody; powiadomienie bez sekretów.

#### Automated tests

Unit/web: treść stanów i uprawnienia.

#### Manual test

Wykonaj MT-013 i MT-014; sprawdź komunikaty konta.

#### Expected result

Użytkownik rozumie stan i datę końca grace.

#### Acceptance criteria

Komunikaty i manualny scenariusz gotowe.

#### Do not do yet

Nie implementuj wielokanałowych kampanii.

## Phase 13 — Cancellation


- [ ] **PAY-054 — Dodaj cancelAtPeriodEnd API**

### Task PAY-054 — Dodaj cancelAtPeriodEnd API

#### Goal

Dodaj cancelAtPeriodEnd API.

#### Files

CREATED: —. MODIFIED: apps/api/src/payments/application/recurring.service.ts; apps/api/src/agency-plan-commerce/agency-plan-checkout.controller.ts; testy; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Właściciel agencji ustawia flagę anulowania; scheduler nie tworzy następnego charge; brak natychmiastowej utraty PRO.

#### Automated tests

API/integration: role, duplicate cancel, brak renewal.

#### Manual test

Wykonaj MT-012 jako właściciel, potem jako inny użytkownik.

#### Expected result

Anulowanie zapisane; PRO trwa do końca okresu.

#### Acceptance criteria

Brak kolejnego obciążenia i kontrola uprawnień.

#### Do not do yet

Nie twórz refund automatycznego.


- [ ] **PAY-055 — Dokończ subskrypcję po okresie**

### Task PAY-055 — Dokończ subskrypcję po okresie

#### Goal

Dokończ subskrypcję po okresie.

#### Files

CREATED: —. MODIFIED: apps/api/src/payments/application/billing.scheduler.ts; recurring.service.ts; testy; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Po current_period_end zakończ entitlement i cofnij zgodę po rozliczeniu otwartych płatności.

#### Automated tests

Integration: koniec okresu, pending payment, revoke timeout.

#### Manual test

Dokończ MT-012 z przyspieszonym czasem.

#### Expected result

PRO wygasa i brak nowego charge.

#### Acceptance criteria

Revoke i entitlement są spójne.

#### Do not do yet

Nie usuwaj historii.


- [ ] **PAY-056 — Dodaj widok anulowania**

### Task PAY-056 — Dodaj widok anulowania

#### Goal

Dodaj widok anulowania.

#### Files

CREATED: —. MODIFIED: apps/web/src/app/(dashboard)/dashboard/upgrade/page.tsx; testy; docs/payments/MANUAL_TESTS.md; docs/MANUAL_RELEASE_TESTS.md. DELETED: —.

#### Implementation

Pokaż datę końca, potwierdzenie akcji i status; wynik z API.

#### Automated tests

Web/E2E: widok właściciela i brak akcji dla nieuprawnionego.

#### Manual test

Przejdź MT-012 bez używania konsoli czy bazy.

#### Expected result

Użytkownik widzi, do kiedy działa PRO.

#### Acceptance criteria

Scenariusz możliwy dla nietechnicznej osoby.

#### Do not do yet

Nie dodawaj natychmiastowego cancel.

## Phase 14 — Frontend subscription management


- [ ] **PAY-057 — Pokaż czytelny stan subskrypcji i PRO**

### Task PAY-057 — Pokaż czytelny stan subskrypcji i PRO

#### Goal

Pokaż czytelny stan subskrypcji i PRO.

#### Files

CREATED: —. MODIFIED: apps/web/src/app/(dashboard)/dashboard/upgrade/page.tsx; apps/web/src/lib/billing-plans.ts; testy; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Osobno wyświetl rozliczenie i uprawnienie z API; pending/active/past_due/cancelled/expired.

#### Automated tests

Web/E2E: każda kombinacja, zwłaszcza past_due + PRO active.

#### Manual test

Otwórz panel dla kont testowych w różnych stanach.

#### Expected result

Status płatności nie myli się z dostępem PRO.

#### Acceptance criteria

Widok używa entitlement API.

#### Do not do yet

Nie dodawaj rocznych planów.


- [ ] **PAY-058 — Dodaj zmianę instrumentu płatności**

### Task PAY-058 — Dodaj zmianę instrumentu płatności

#### Goal

Dodaj zmianę instrumentu płatności.

#### Files

CREATED: —. MODIFIED: apps/api/src/payments/application/recurring.service.ts; apps/web/src/app/(dashboard)/dashboard/upgrade/page.tsx; testy; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Nowa zgoda zastępuje starą dopiero po potwierdzeniu; stary instrument nie znika przed sukcesem.

#### Automated tests

Integration/E2E: nowy token, nieudana zgoda, cofnięcie starej.

#### Manual test

Przez panel zmień testową kartę i sprawdź kolejny okres.

#### Expected result

Nowy instrument działa, stary został bezpiecznie cofnięty.

#### Acceptance criteria

Brak utraty zgody przy nieudanym setup.

#### Do not do yet

Nie implementuj wielu aktywnych instrumentów.


- [ ] **PAY-059 — Dodaj polling statusu po powrocie**

### Task PAY-059 — Dodaj polling statusu po powrocie

#### Goal

Dodaj polling statusu po powrocie.

#### Files

CREATED: —. MODIFIED: apps/web/src/app/(dashboard)/dashboard/upgrade/page.tsx; apps/web/src/components/listing-commerce/seller-listing-checkout-panel.tsx; testy; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Ekran processing odpytuje lokalne API z limitem czasu; unknown ma jasny komunikat, bez fałszywego sukcesu.

#### Automated tests

Web/E2E: delayed webhook, failed, unknown, cancel.

#### Manual test

Zapłać w sandboxie i wróć zanim nadejdzie webhook.

#### Expected result

Najpierw processing, potem potwierdzenie.

#### Acceptance criteria

UI nie interpretuje query param jako zapłaty.

#### Do not do yet

Nie dodawaj push/WebSocket.

## Phase 15 — Final regression / release checklist


- [ ] **PAY-060 — Wykonaj pełną regresję płatności**

### Task PAY-060 — Wykonaj pełną regresję płatności

#### Goal

Wykonaj pełną regresję płatności.

#### Files

CREATED: —. MODIFIED: docs/payments/MANUAL_TESTS.md; docs/MANUAL_RELEASE_TESTS.md; testy E2E. DELETED: —.

#### Implementation

Uruchom unit/integration/E2E i MT-001–MT-015; zapisz wyniki, wersję, datę i znane ograniczenia.

#### Automated tests

Pełny zestaw wymaganych testów oraz build/lint.

#### Manual test

Przejdź każdy MT-XXX w kolejności i zaznacz Pass/Fail.

#### Expected result

Brak krytycznych błędów, wyniki udokumentowane.

#### Acceptance criteria

Regresja zakończona i reviewable.

#### Do not do yet

Nie rozszerzaj scope o Phase 2.


- [ ] **PAY-061 — Sprawdź gotowość wydania**

### Task PAY-061 — Sprawdź gotowość wydania

#### Goal

Sprawdź gotowość wydania.

#### Files

CREATED: —. MODIFIED: docs/tpay-integration-plan.md; docs/payments/IMPLEMENTATION_TASKS.md; docs/payments/MANUAL_TESTS.md. DELETED: —.

#### Implementation

Zweryfikuj DoD, aktywacje Tpay, sekrety, monitoring, refundy, brak Stripe i politykę grace; decyzja o PAYID blockerze jawna.

#### Automated tests

Build/lint, skan importów/sekretów, testy smoke.

#### Manual test

Przejdź checklistę wydania i wykonaj małą płatność sandbox; produkcyjny smoke dopiero przy wydaniu.

#### Expected result

Jest decyzja go/no-go z uzasadnieniem.

#### Acceptance criteria

Wszystkie wymagane taski zaakceptowane.

#### Do not do yet

Nie wdrażaj produkcyjnie bez osobnej autoryzacji.

## Manual regression required po większych iteracjach

| Po fazie | Wykonaj scenariusze |
| --- | --- |
| 2 — usunięcie Stripe | Sprawdzenie podstawowych ekranów bez płatności z PAY-011–PAY-014; MT-001 dopiero po konfiguracji Tpay. |
| 3 — klient API | MT-001, MT-002. |
| 5 — ogłoszenie i webhook | MT-002, MT-003, MT-004, MT-005, MT-006, MT-007. |
| 6 — zwroty | MT-003, MT-015. |
| 8 — karta recurring | MT-008, MT-009, MT-013. |
| 10 — BLIK recurring | MT-010, MT-011, MT-013. |
| 12 — scheduler i dunning | MT-009, MT-011, MT-013, MT-014. |
| 14 — anulowanie i panel | MT-008, MT-010, MT-012, MT-013, MT-014. |
| 15 — wydanie | MT-001–MT-015 i pełny `docs/MANUAL_RELEASE_TESTS.md`. |
