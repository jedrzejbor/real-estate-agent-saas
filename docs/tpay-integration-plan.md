# PodAdresem: migracja Stripe → Tpay Business

Stan aktualizacji: 4 października 2026 r. **Dokument projektowy, bez implementacji.** Źródłem dla szczegółów operatora jest [dokumentacja Tpay Open API](https://docs-api.tpay.com/en/) i [referencja API](https://api.tpay.com/). Podane w zadaniu 49,99 zł i 149 zł/mies. są przykładami, nie bieżącymi cenami kodu: katalog domyślny ma Starter 99 zł i Professional 249 zł miesięcznie (`agency-plan.service.ts`), a plany i ceny edytuje administrator. Kluczowe decyzje dotyczą **agencji** jako nabywcy PRO. Właściciel potwierdził, że aplikacja działa wyłącznie lokalnie: brak klientów produkcyjnych, rzeczywistych płatności, aktywnych subskrypcji i historii Stripe do zachowania. Stripe można usunąć po wprowadzeniu neutralnego modelu i portów, bez okresu równoległej obsługi.

**Dokumenty wykonawcze:** [lista zadań PAY-XXX](payments/IMPLEMENTATION_TASKS.md) i [scenariusze MT-XXX](payments/MANUAL_TESTS.md). Jeden wskazany task to jeden zakres implementacji i review. Nie wykonywać kolejnych tasków ani całej fazy bez osobnego polecenia.

## 1. Current architecture audit

| Obszar | Obecnie | Ocena |
| --- | --- | --- |
| Ogłoszenia | `listing-checkout` → `listing-orders` → `listing_payment_attempts` → port `ListingPaymentGateway` → Stripe Checkout → podpisany webhook → `ListingPaymentEventsService` → `listing_entitlements` | Dobra baza: wycena, próba, blokady, idempotencja i nadanie uprawnienia są domenowe. Port i kontrakt zdarzeń nadal mówią o „session”; trzeba je odwiązać od Stripe. |
| Plany | `agency-plan-checkout` → wycena i rezerwacja promocji → `agency_plan_checkout_attempts` → `AgencyPlanPaymentGateway` → Stripe Checkout `mode=subscription` → webhook pierwszego checkoutu → zmiana `agencies.plan` | Checkout jest ściśle związany z mechaniką Stripe (`Price`, kupon, `subscriptionId`), a nie z ogólnym cyklem subskrypcji. |
| Billing/PRO | `agencies.plan`, `agencies.subscription`, `current_period_end`, `trial_ends_at`; `AgencyPlanService.getEntitlements` zwraca limity/funkcje, wykorzystywane m.in. przez `UsersService` i egzekwowanie limitów | Brak pełnego lokalnego modelu subskrypcji, kolejnych płatności i anulowania przez klienta. Sam checkout ustawia `ACTIVE`, lecz nie aktualizuje `currentPeriodEnd`. |
| Inny webhook billingowy | `POST /api/billing/webhooks/subscription-events`, własny HMAC `BILLING_WEBHOOK_SECRET`, obsługa updated/past_due/canceled | To **wewnętrzny** kontrakt, nie adapter Stripe ani Tpay. Obecna deduplikacja i zapis agencji nie są jedną transakcją; wymaga utwardzenia lub zastąpienia bezpośrednim serwisem aplikacyjnym. |
| Scheduler | Rekoncyliacja prób ogłoszeń i planów, lifecycle ogłoszeń oraz wymuszenie limitów planu używają PostgreSQL advisory lock | Warto zachować wzorzec blokady. Żaden scheduler nie inicjuje obecnie miesięcznych obciążeń abonamentu. |
| Zwroty/faktury | Statusy `refunded`/`partially_refunded` i `refunded_at` są w modelu zamówienia; nie znaleziono produkcyjnego flow wywołującego refund PSP ani automatyzacji faktur | Nowy flow zwrotów i osobny proces fakturowania są konieczne. Raporty same zaznaczają brak statusów rozliczenia/faktur. |

### Current Stripe implementation

- **SDK i adaptery:** `stripe` w `apps/api/package.json` i `pnpm-lock.yaml`; `stripe-listing-payment.adapter.ts`, `stripe-agency-plan-payment.adapter.ts`. Pierwszy tworzy `mode=payment`, drugi `mode=subscription`, kupony Stripe i odwołuje się do Stripe Price ID.
- **Webhooki:** `POST /api/listing-payments/webhooks/stripe` i `POST /api/agency-plan-payments/webhooks/stripe`; oba sprawdzają `stripe-signature` przy użyciu `rawBody`. Listing mapuje `checkout.session.completed`, `checkout.session.async_payment_succeeded/failed`, `checkout.session.expired`; plan mapuje `checkout.session.completed`, `checkout.session.async_payment_failed`, `checkout.session.expired`. Nie znaleziono bezpośredniego webhooka Stripe typu `invoice.paid`/`invoice.payment_failed` ani cyklicznego przedłużania planu.
- **Endpointy aplikacyjne:** `POST /api/listing-checkout/quote`, `/orders`, `POST /api/listing-orders/:id/checkout-session`, `GET /api/listing-orders/:id`; `POST /api/agency-plan-checkout/quote`, `/attempts`. Nadal można zachować ich rolę, ale nazwę `checkout-session` w nowych API zastąpić neutralną `/payment-attempts` lub utrzymać stary endpoint jako alias przejściowy.
- **ENV:** `STRIPE_SECRET_KEY`, `STRIPE_LISTING_WEBHOOK_SECRET`, `STRIPE_AGENCY_PLAN_WEBHOOK_SECRET`, `STRIPE_LISTING_SUCCESS_URL`, `STRIPE_LISTING_CANCEL_URL`, używane także `STRIPE_AGENCY_PLAN_SUCCESS_URL` i `STRIPE_AGENCY_PLAN_CANCEL_URL` (te ostatnie nie są w `.env.example`). Reconciliation ENV jest neutralne. `BILLING_WEBHOOK_SECRET` nie jest sekretem Stripe.
- **Baza:** `plan_catalog.stripe_price_id_monthly/yearly` jest vendor-specific. `agencies.billing_customer_id`, `billing_subscription_id` wyglądają neutralnie, ale nie mają jawnego `provider`, a wartości pochodzą dziś z Stripe. `listing_orders`, `listing_payment_attempts`, `agency_plan_checkout_attempts` mają neutralne `provider_*` i indeksy. W tabeli agencji brak odrębnej encji subskrypcji i okresów. Nie znaleziono osobnej tabeli płatności/rachunków abonamentowych.
- **Frontend:** `apps/web/src/lib/stripe-checkout-url.ts` oraz importy w `register/page.tsx`, `dashboard/upgrade/page.tsx` i `seller-listing-checkout-panel.tsx`; napisy Stripe w rejestracji/upgrade; pola `stripePriceIdMonthly/Yearly` w `billing-plans.ts` i panelu admina. Nie znaleziono frontendowego Stripe SDK.
- **Testy:** specyfikacje obu adapterów i kontrolerów, `stripe-checkout-url.spec.ts`, testy checkoutu/zdarzeń planów i ogłoszeń z fixture `stripe`, testy migracji. Dokumentacja `LOCAL_SETUP.md`, `BILLING_PLANS_IMPLEMENTATION.md`, `PRIVATE_SELLER_PRICING_AND_PROMOTIONS_PLAN.md` i `.env.example` zawierają instrukcje Stripe.
- **Ryzyko:** `AgencyPlanPaymentEventsService` wymaga w zdarzeniu `subscriptionId`, kwoty i waluty, a Tpay zwraca identyfikator transakcji i potwierdzenie zapłaty, nie „subskrypcję” w stylu Stripe. `AgencyPlanCheckoutAttemptsService` blokuje nowy zakup przy `billingSubscriptionId`. Należy zmienić model, a nie wpisywać ID Tpay w pole subskrypcji Stripe. Lokalna rekoncyliacja ogłoszeń opiera się na czasie próby, bez odczytu PSP przed wygaszeniem.

## 2. Architektura docelowa i kontrakty

Zachować dwa istniejące obszary domenowe (`listing-commerce`, `agency-plan-commerce`), a wspólną infrastrukturę umieścić w `payments/`. Nie tworzyć jednego wielkiego `PaymentProvider`: jednorazowa płatność i autoryzacja/obciążenie recurring mają różne możliwości i cykle życia. Domeny używają własnych UUID zamówienia, płatności, subskrypcji i agencji; ID Tpay są wyłącznie mapowaniem infrastruktury. Przepływ zależności: Domain/Application → `PaymentGateway` i `RecurringPaymentGateway` → adaptery Tpay → `TpayApiClient` → Tpay API. Tę samą domenę można później połączyć z adapterem Paynow, Przelewy24 lub Stripe.

```ts
interface PaymentGateway {
  createPayment(input: { paymentId: string; amountMinor: number; currency: 'PLN'; buyerEmail: string; returnUrls: ReturnUrls }): Promise<{ providerTransactionId: string; redirectUrl: string }>;
  getPaymentStatus(providerTransactionId: string): Promise<VerifiedProviderPaymentStatus>;
  refundPayment(input: RefundRequest): Promise<ProviderRefundResult>;
}
interface RecurringPaymentGateway {
  startAuthorization(input: AuthorizationRequest): Promise<ProviderAuthorizationStart>;
  charge(input: { renewalId: string; authorizationId: string; amountMinor: number }): Promise<ProviderChargeResult>;
  revokeAuthorization(authorizationId: string): Promise<void>;
}
interface PaymentProviderCapabilities {
  oneTimePayments: boolean;
  cardRecurring: boolean;
  recurringAlias: boolean;
  refunds: boolean;
}
```

To **nasze kontrakty**, nie pola API Tpay. Szczegóły `card_token`, PAYID, `groupId`, OAuth i webhooków pozostają w adapterze. Dla pierwszej płatności z jednoczesnym zapisem instrumentu dopuszczalny jest dodatkowy wariant `createInitialSubscriptionPayment` w porcie recurring. Refund należy wykonywać na lokalnym `paymentId`, a adapter mapuje go na transakcję operatora. Status płatności i status zgody recurring są osobne. `PaymentProviderCapabilities` jest neutralnym opisem dostępnych funkcji, ustalanym w konfiguracji aktywowanego konta i wystawianym aplikacji przez DI; sam typ nie gwarantuje, że usługa jest aktywna u Tpay. Niedostępna funkcja ma być ukryta/odrzucona przewidywalnie. Bez `if (provider==='tpay')` w domenie.

```text
apps/api/src/payments/
  payments.module.ts                 # DI i konfiguracja; bez reguł planów/ogłoszeń
  domain/payment.types.ts           # nasze statusy/kwoty; bez Tpay DTO
  application/payment.service.ts    # orkiestracja prób, zapis, idempotencja; bez HTTP PSP
  application/recurring.service.ts  # zgody i obciążenia; bez parsowania JWS
  application/billing.scheduler.ts  # wyszukiwanie należnych okresów; bez numerów kart
  ports/payment-gateway.port.ts      # jednorazowa płatność, status, refund
  ports/recurring-gateway.port.ts    # zgoda, charge, revoke
  infrastructure/provider.factory.ts # wybór implementacji raz w DI
  infrastructure/tpay/tpay-api.client.ts       # OAuth/HTTP/timeout/mapowanie błędów; bez aktywacji PRO
  infrastructure/tpay/tpay-payment.adapter.ts  # tłumaczenie kontraktu płatności
  infrastructure/tpay/tpay-recurring.adapter.ts # tłumaczenie karty i PAYID
  infrastructure/tpay/tpay-jws.verifier.ts     # certyfikat, JWS, surowe body; bez DB
  infrastructure/tpay/tpay-webhook.controller.ts # cienki endpoint i poprawny ACK
  infrastructure/typeorm/*.entity.ts          # payment, subscription, authorization, renewal, refund, event
```

`PaymentService` nie ufa redirectowi; `TpayApiClient` nie zapisuje planów; kontroler webhooka nie nadaje uprawnień. `ListingEntitlementsService`, wyceny, limity i istniejące reguły dostępu pozostają w swoich modułach. `PaymentsModule` eksportuje porty/serwisy; fabryka NestJS wybiera adapter według `PAYMENT_PROVIDER`, a brak implementacji powoduje błąd startu. Przy braku produkcyjnych danych Stripe nie ma routingu historycznych webhooków. W fazie usuwania Stripe aplikacja może czasowo wyświetlać niedostępność checkoutu, ale pozostałe funkcje muszą działać i testy przechodzić.

| Plik / grupa | Odpowiada za | Nie odpowiada za |
| --- | --- | --- |
| `payments.module.ts` i `provider.factory.ts` | Rejestrację zależności NestJS, walidację konfiguracji i wybór adaptera dla nowych płatności. | Decyzję, czy agencja ma PRO, ani interpretację webhooka. |
| `domain/payment.types.ts` i `ports/*.port.ts` | Własne identyfikatory, statusy, kontrakty płatności i zgody recurring. | Pola JSON Tpay, token OAuth i DTO webhooków. |
| `application/payment.service.ts` | Zapis próby, korelację z zamówieniem, przejścia stanów i idempotencję domeny. | HTTP do PSP lub nadanie uprawnienia bez potwierdzenia. |
| `application/recurring.service.ts` i `billing.scheduler.ts` | Cykl zgody, należności, ponowień, anulowania i odnowienia po zapłacie. | Przechowywanie danych karty i parsowanie JWS. |
| `infrastructure/typeorm/*.entity.ts` oraz repozytoria | Trwały ledger, indeksy, transakcje i blokady DB. | Reguły cennika i decyzje o uprawnieniach. |
| `tpay-api.client.ts` | OAuth, żądania HTTP, timeouty i mapowanie błędów protokołu. | Zapis subskrypcji i przyznanie PRO. |
| `tpay-payment.adapter.ts` i `tpay-recurring.adapter.ts` | Tłumaczenie portów na transakcje, refund, token karty i PAYID. | Politykę ceny, promocji, grace i proration. |
| `tpay-jws.verifier.ts` i `tpay-webhook.controller.ts` | Weryfikację podpisu oraz transport/ACK; przekazanie zweryfikowanego zdarzenia. | Bezpośrednie ustawianie statusu ogłoszenia czy agencji. |

## 3. Model danych i migracja schematu

Nie zastępować wszystkich obecnych tabel jedną nową. Dodać wspólny ledger płatności i subskrypcji, zachowując `listing_orders` oraz `agency_plan_quotes` jako źródła wycen i reguł produktu.

| Tabela / pola proponowane | Zasady |
| --- | --- |
| `payments`: `id` UUID, `kind` (`listing`, `subscription_initial`, `subscription_renewal`), `order_id`/`quote_id`/`renewal_id` nullable, `buyer_user_id`, `agency_id`, `amount_minor` integer, `currency`, `status`, `provider`, `provider_transaction_id`, `provider_title`, `attempt_no`, `created_at`, `confirmed_at`, `failure_code`, bezpieczne `metadata` | Kwota i waluta są niezmiennym snapshotem; `UNIQUE(provider, provider_transaction_id)` gdy ID istnieje; unikat aktywnej próby per zamówienie/okres. Wszystkie kwoty lokalnie w groszach, przy API Tpay dokładna konwersja decimal PLN bez float. |
| `subscriptions`: `id` UUID, `agency_id`, `plan_code`, `interval`, `status`, `price_minor`, `current_period_start/end`, `next_billing_at`, `cancel_at_period_end`, `cancelled_at`, `grace_ends_at`, `provider`, `authorization_id`, `version` | Jeden aktywny/past_due abonament agencji przez częściowy indeks; w MVP stała cena i stały miesięczny okres, bez promocji pierwszego cyklu. `agencies.plan/subscription` pozostają projekcją decyzji o uprawnieniach, aktualizowaną atomowo. |
| `recurring_authorizations`: `id` UUID, `subscription_id`, `method` (`card`, `recurring_alias`), `status`, `provider`, zaszyfrowany `provider_reference`, `provider_reference_type` (`CARD_TOKEN`, `RECURRING_ALIAS`), `consented_at`, `expires_at`, `revoked_at`, `last4`, `brand` | `provider_reference` to identyfikator instrumentu PSP, zaszyfrowany i dostępny tylko adapterowi; domena operuje lokalnym `authorization_id`. Adapter Tpay mapuje `RECURRING_ALIAS` na PAYID. Bez PAN/CVC. Jedna aktywna zgoda per subskrypcja/metoda. |
| `subscription_renewals`: `id`, `subscription_id`, `period_start/end`, `amount_minor`, `status`, `attempt_no`, `next_retry_at`, `payment_id`, `created_at` | `UNIQUE(subscription_id, period_start)` gwarantuje jedną należność za okres, nie jedną próbę. Stan `unknown/reconciliation_required` blokuje kolejny charge do rozstrzygnięcia. Próby płatności są osobnymi rekordami. |
| `payment_events` / `refunds`: `provider`, klucz zdarzenia, surowe ID operatora, status przetwarzania, powiązanie z payment/refund, czas, skrót payloadu; refund z kwotą i statusem | `UNIQUE(provider, event_key)`; nie trzymać sekretów ani danych kart w payload. Refund jako oddzielny proces, nie sam status zamówienia. |

Statusy: płatność `created/pending/unknown/confirmed/failed/expired/refunded/partially_refunded`; subskrypcja `pending/active/past_due/cancelled/expired`; zgoda `pending/active/revoked/expired`; okres `due/charging/unknown/paid/retry_scheduled/failed`. `unknown` oznacza brak pewnego wyniku po timeout, zerwaniu połączenia lub restarcie. Trzymać statusy wewnętrzne niezależnie od `tr_status`. Indeksy po `next_billing_at`, `next_retry_at`, statusie i agencji. FK do istniejących zamówień/wycen, `ON DELETE RESTRICT` dla finansowych rekordów. `stripe_price_id_*` i lokalne ID Stripe usunąć po potwierdzeniu, że to wyłącznie dane testowe; nie tworzyć migracji historii Stripe. Nie wpisywać PAYID do domenowego pola subskrypcji.

**Założenie potwierdzone przez właściciela:** brak środowiska produkcyjnego i danych Stripe do zachowania. Faza 0 ma to jedynie udokumentować na podstawie lokalnej bazy i konfiguracji. Lokalne rekordy development/test Stripe można usunąć lub odtworzyć migracją developerską, po zrobieniu kopii lokalnej bazy jeśli developer jej potrzebuje. Nie projektować współistnienia PSP ani backfillu historii Stripe. Jeśli audyt ujawni realne dane, zatrzymać usuwanie i osobno uzgodnić plan; nie jest to obecny zakres.

### Subscription a uprawnienie PRO

`Subscription` opisuje rozliczenie: cenę, opłacony okres, następną należność, metodę i status płatności. `Agency PRO entitlement` opisuje dostęp do funkcji produktu. To różne stany: `subscription.status=past_due` może współistnieć z aktywnym PRO w trakcie jawnie ustalonego grace period. Jedynym miejscem odpowiadającym na pytanie „czy agencja ma teraz PRO?” jest `AgencyPlanService` lub wydzielony serwis uprawnień, który bierze pod uwagę opłacony okres, grace, anulowanie i status agencji. Frontend wyświetla wynik API, nie interpretuje sam statusu subskrypcji. Zmiana planu/uprawnienia jest transakcyjna i nie następuje po samym redirectcie.

## 4. Jednorazowe ogłoszenie

1. UI pobiera wycenę; API tworzy `listing_order` i trwałą `payment`/próbę ze snapshotem kwoty. Obecny checkout wymaga weryfikacji e-mail i uprawnień — zachować.
2. Adapter Tpay tworzy `POST /transactions` z kwotą w PLN (np. `49.99`), `hiddenDescription` = niejawny lokalny identyfikator/korelacja, `callbacks.notification.url` i adresami powrotu. Zapisuje `transactionId`, **`title`**, `transactionPaymentUrl`; `title` jest `tr_id` w webhooku. Nie używać kwoty z frontendu. [Pierwsza transakcja](https://docs-api.tpay.com/en/first-steps/first-transaction/), [webhook](https://docs-api.tpay.com/en/webhooks/).
3. Next.js przechodzi na zweryfikowany URL Tpay. Po powrocie pokazuje `processing` i odczytuje stan z naszego API. Redirect nie aktywuje ogłoszenia.
4. Podpisany webhook z `tr_status=true`, zgodnym `id`, `tr_id`, `tr_crc`, `tr_amount`, `tr_paid`, `tr_currency` uruchamia jednorazowe przejście `confirmed → paid order → listing entitlement` w transakcji DB. Odrzucić niepełną kwotę. Reconciliation sprawdza Tpay `GET /transactions/{transactionId}` przed lokalnym wygaszeniem; nie zakładać, że brak webhooka = odmowa.
5. Po timeoutcie lub zerwaniu połączenia oznaczyć próbę `unknown/reconciliation_required`, nie `failed`. Webhook albo `GET /transactions/{id}` rozstrzyga stan, jeśli ID zostało zapisane; gdy POST nie zwrócił ID, potrzebna jest udokumentowana metoda korelacji z Tpay lub ręczne sprawdzenie panelu przed nowym żądaniem. **Nie zakładać obsługi nagłówka idempotency key przez Tpay, jeśli endpoint go nie dokumentuje.** Własny unikalny klucz `paymentId`/okresu chroni domenę, ale sam nie gwarantuje braku drugiego obciążenia u PSP. Duplikat webhooka, nieznana płatność, błędny podpis, anulowanie i późny sukces mają osobne ścieżki.

## 5. PRO: karta i BLIK Płatności Powtarzalne

**Karta.** Pierwszy checkout Tpay `POST /transactions` z `pay.groupId=103` i `pay.cardPaymentData.save=1` przekierowuje do formularza Tpay oraz 3DS. Dopiero po podpisanym potwierdzeniu płatności zapisać `card_token` i stan zgody; alternatywnie autoryzacja bez pobrania przez `POST /tokens`, `callbackUrl`, redirect i oddzielny webhook tokenizacji. Kolejne płatności wykorzystują token i nową transakcję, a nie przechowywany numer karty. Referencja API opisuje `pay.tokenPaymentData` oraz `cof='recurring'` dla regularnych obciążeń, ale dokładny zestaw wymaganych pól i uprawnienie konta potwierdzić w sandboxie i z Tpay przed kodowaniem MIT. [Tokenizacja](https://docs-api.tpay.com/en/tokenization/), [Open API](https://api.tpay.com/).

**BLIK — trzy odrębne produkty.** Standardowy BLIK: kod do jednej płatności. One Click: alias `UID`, kolejne płatności bez kodu, zwykle z potwierdzeniem klienta. **BLIK Płatności Powtarzalne**: alias `PAYID` i wyraźna zgoda w aplikacji bankowej; to właściwy produkt dla abonamentu. Modele Tpay: **A** stała kwota i częstotliwość (np. `1M`), **M** zmienna kwota z zatwierdzaniem każdej należności, **O** zmienna kwota bez potwierdzenia (dla wybranych branż wymaga zgody Tpay). Dla MVP proponowany model A, stała cena i miesięczny okres. Promocje pierwszego miesiąca, zmiany kwoty, model M/O i proration przechodzą do fazy 2. [BLIK](https://docs-api.tpay.com/en/payment-methods/blik/).

Aktywacja PAYID to pierwsza płatność `POST /transactions` z `pay.groupId=150`, `blikPaymentData.blikToken`, `aliases.type=PAYID`, własnym unikalnym `aliases.value`, `aliases.autopayment` opisującym model/limit/częstotliwość; możliwa jest też sama zgoda bez pobrania przez `POST /blik/alias`. Tpay wysyła oddzielne notyfikacje o transakcji i `ALIAS_REGISTER`; aktywna subskrypcja wymaga **zapłaconego pierwszego okresu oraz aktywnej zgody**. W kolejnych okresach merchant tworzy nową transakcję z `blikPaymentData.type=2` i `aliases.type=PAYID`; po `ALIAS_UNREGISTER/UPDATE/EXPIRED` trzeba zmienić status zgody. Usunięcie zgody: `POST /blik/alias/{aliasValue}` z `aliasType=PAYID`; sprawdzić odpowiedź i webhook. Zgoda bankowa może zostać cofnięta poza naszą aplikacją. [BLIK recurring](https://docs-api.tpay.com/en/payment-methods/blik/).

## 6. Cykl subskrypcji, scheduler, dunning i anulowanie

**Własny harmonogram.** Wybrać NestJS Scheduler + PostgreSQL + istniejący `PostgresAdvisoryLockService` dla MVP, bez Redis, BullMQ i RabbitMQ. Co kilka minut scheduler wybiera należne okresy ograniczoną partią, blokuje wiersz (`FOR UPDATE SKIP LOCKED` lub równoważna transakcja), tworzy jedną `subscription_renewal`, zapisuje `charging` i dopiero po commit wywołuje Tpay. Advisory lock chroni schedulery, unikat okresu i blokada wiersza zabezpieczają przed dwiema instancjami. Po timeoutcie, connection reset lub restarcie przy niepewnym POST wynik `unknown/reconciliation_required` blokuje kolejny charge. Webhook i `GET /transactions/{id}` uzgadniają stan; brak ID operatora wymaga ręcznej lub potwierdzonej przez Tpay korelacji. Dopiero jednoznacznie `failed` pozwala na retry. PRO przedłuża się **wyłącznie** po potwierdzonym opłaceniu okresu; aktualizacja `subscriptions`, uprawnienia agencji i należności w jednej transakcji. Recovery nie ponawia automatycznie `charging/unknown`.

### When to introduce a queue

Kolejkę dodać dopiero, gdy liczba odnowień lub czas przetwarzania przekroczą możliwości partiowego schedulera PostgreSQL, wymagamy wielu niezależnych workerów albo pomiar wykaże wąskie gardło. Wtedy kolejka może rozdzielać pracę, lecz unikat okresu, ledger prób, status `unknown` i reguły idempotencji pozostają w bazie; sama kolejka nie zapewnia bezpieczeństwa finansowego.

MVP dunning: po odmowie `past_due`; jedna ponowna próba po 24 h, następna po 72 h, ostatnia po 7 dniach **tylko gdy wcześniejsza jest definitywnie nieudana**. Termin/limity potwierdzić produktowo. Przez grace nie przedłużać `current_period_end`; dostęp PRO po końcu opłaconego okresu wymaga jawnej decyzji biznesowej. Propozycja: ograniczony grace 7 dni i potem `expired`/Free, z komunikatem i możliwością zmiany metody. Przy BLIK M 72 h na akceptację oznacza, że nie wolno dublować obciążenia w tym oknie. Powiadomienia e-mail o problemie i zmiana instrumentu w panelu.

Domyślne anulowanie: `cancel_at_period_end=true`, bez następnej próby; plan pozostaje aktywny do `current_period_end`. Natychmiastowe anulowanie jako osobna operacja administracyjna/zwrotowa, z jawną polityką zwrotu. Cofnąć/usuwać token lub PAYID po końcu uprawnienia i po rozstrzygnięciu otwartych płatności. MVP: dla każdego sprzedawanego wariantu stała cena i stały okres miesięczny; obecna logika kuponów Stripe nie przechodzi do recurring MVP. Upgrade/downgrade, `pending_plan_code`, promocje, roczne okresy i proration w fazie 2. Istniejący checkout planu blokuje zakup przy `billingSubscriptionId`; po migracji zastąpić regułą cyklu lokalnej subskrypcji.

## 7. Tpay API client, webhook i bezpieczeństwo

`TpayApiClient`: OAuth `POST /oauth/auth` (`application/x-www-form-urlencoded`, `client_id`, `client_secret`), cache Bearer tokenu do `expires_in` z marginesem, odświeżenie pod blokadą; nie odświeżać na każde żądanie. Obsługuje `POST /transactions`, `GET /transactions/{id}`, `POST /transactions/{id}/refunds`, `/tokens` i operacje `/blik/alias`; ograniczony timeout, klasyfikację 4xx/5xx, ponowienie tylko bezpiecznych GET i jednoznacznie idempotentnych operacji. Błędy zewnętrzne mapuje na nasze typy, nie zmienia baz. [OAuth](https://docs-api.tpay.com/en/first-steps/authorization/), [zwroty](https://docs-api.tpay.com/en/refunds/).

Webhook: Nest ma `rawBody: true` (`main.ts`). Kontroler przyjmuje surowe `application/x-www-form-urlencoded`; walidator **przed parsowaniem biznesowym** sprawdza `X-JWS-Signature` jako detached JWS: dozwolony `alg`, ściśle zatwierdzone HTTPS `x5u`/host Tpay, certyfikat podpisujący względem zaufanego Tpay CA, podpis nad `base64url(header) + '.' + base64url(rawBody)`. Nie pobierać certyfikatu z dowolnego URL z nagłówka (SSRF), cache z limitem czasu i odświeżaniem. Potem porównać Merchant ID, `tr_id`/`tr_crc`, kwotę docelową i rzeczywiście zapłaconą, walutę i zapisany stan. Oficjalne powiadomienie transakcyjne wymaga **HTTP 200, body `TRUE`**, a tokenizacja ma własny format odpowiedzi `{"result":true}`. Nie wysyłać 301/302. Tpay dokumentuje także `md5sum` z merchant security code; weryfikować zgodnie z wariantem notyfikacji jako dodatkową kontrolę, **nie zastępować nim JWS**. [Webhooki/JWS](https://docs-api.tpay.com/en/webhooks/).

Po pozytywnej weryfikacji zapisać zdarzenie o kluczu `(provider, typ, ID transakcji/aliasu, status)` i w jednej transakcji zastosować zmianę; duplikat zwraca prawidłowy ACK, nieznana płatność trafia do kwarantanny/alertu, nie aktywuje usługi. Powtórzona stara notyfikacja nie cofa `paid`. Każda operacja ma `correlationId`, lokalne `paymentId`, `subscriptionId`, ID PSP i typ zdarzenia; bez pełnego body, numerów kart, CVC, sekretów, tokenów OAuth czy PAYID w logach. Sekrety tylko w backendzie; HTTPS, rate limiting własnych endpointów checkoutu, autoryzacja agencji, rotacja kluczy, minimalne uprawnienia API, szyfrowanie tokenów w DB, retencja audytu. Testy JWS obejmują zły podpis, zmienione body, obcy certyfikat/host i brak certyfikatu. Nie polegać na IP allowlist: Tpay deklaruje dynamiczne IP. [Źródło](https://docs-api.tpay.com/en/webhooks/).

### Security

`TPAY_CLIENT_SECRET` i security code trzymać w backendowym secret store, a lokalnie tylko w ignorowanym `.env.local`; rotować bez ujawniania w CI i logach. Nie zapisywać PAN/CVC, pełnego payloadu webhooka ani pełnego aliasu PAYID w logach. Tokeny i aliasy szyfrować w bazie, ograniczyć odczyt do procesu obciążeń i rejestrować audyt dostępu. Checkout i zmiana metody wymagają uwierzytelnienia oraz kontroli właściciela agencji; endpointy inicjujące płatności ograniczać częstotliwościowo. Webhook dostępny publicznie przez HTTPS, akceptowany wyłącznie po JWS, z ograniczeniem rozmiaru body i bez zaufania do adresu IP. Ochronę przed replay zapewniają unikatowy klucz zdarzenia, monotoniczne przejścia statusów i porównanie kwoty/ID z lokalnym rekordem.

## 8. ENV i lokalny Sandbox — instrukcja od zera

Konfiguracja **projektowana**, jeszcze nieobsługiwana przez kod:

```dotenv
PAYMENT_PROVIDER=tpay
TPAY_API_URL=https://openapi.sandbox.tpay.com
TPAY_CLIENT_ID=<z panelu Sandbox>
TPAY_CLIENT_SECRET=<z panelu Sandbox>
TPAY_MERCHANT_ID=<numer akceptanta z panelu>
TPAY_SECURITY_CODE=<kod z Ustawienia > Powiadomienia > Zabezpieczenia>
PAYMENT_PUBLIC_API_URL=https://<staly-publiczny-tunel>
FRONTEND_URL=http://localhost:3000
```

Na produkcji `TPAY_API_URL=https://api.tpay.com` i **osobne** klucze. `TPAY_SECURITY_CODE` jest dla notyfikacji/`md5sum`, nie do OAuth. URL certyfikatu i zaufane CA dla JWS konfigurować według oficjalnej dokumentacji; nie mieszać z tajnym kluczem. [Środowiska](https://docs-api.tpay.com/en/first-steps/environments/), [OAuth](https://docs-api.tpay.com/en/first-steps/authorization/), [webhook](https://docs-api.tpay.com/en/webhooks/).

**Granica obecnego stanu:** kroki 1–5 pozwalają już dziś sprawdzić konto Sandbox i utworzyć transakcję ręcznie. E2E ogłoszenia z bazą i webhookiem wymaga faz 4–5, a cykliczne odnowienie wymaga także POC i faz 8–11. Nie traktować samego redirectu ani wyniku curl jako potwierdzenia działania aplikacji.

1. Zarejestruj konto na `https://register.sandbox.tpay.com`, zaloguj się do `https://panel.sandbox.tpay.com`; API ma bazę `https://openapi.sandbox.tpay.com`. Sandbox i produkcja mają różne konta i dane. [Źródło](https://docs-api.tpay.com/en/first-steps/environments/).
2. W panelu **Integracja → API → Open API Keys → Add new key** wygeneruj Client ID/Secret; sekret skopiuj od razu. Merchant ID to ID akceptanta w panelu (nie Client ID). Security code znajdź w **Ustawienia → Powiadomienia → Zabezpieczenia**. Ustaw tam statyczny URL webhooka dla PAYID i w razie potrzeby zezwól na nadpisanie URL dla transakcji. [OAuth](https://docs-api.tpay.com/en/first-steps/authorization/), [webhook](https://docs-api.tpay.com/en/webhooks/).
3. Uruchom projekt według [LOCAL_SETUP.md](LOCAL_SETUP.md): API `localhost:4000/api`, web `localhost:3000`, PostgreSQL. Sekrety tylko w ignorowanym `apps/api/.env.local`; backend musi znać `TPAY_*`, przeglądarka nie.
4. Przed implementacją klienta sprawdź OAuth w Postman lub curl (zmienne ustaw lokalnie, nie w historii terminala): `curl -X POST https://openapi.sandbox.tpay.com/oauth/auth -H 'Content-Type: application/x-www-form-urlencoded' --data-urlencode 'client_id=...' --data-urlencode 'client_secret=...'`. Odpowiedź ma `access_token` i `expires_in`; nie zapisuj jej w repo. [OAuth](https://docs-api.tpay.com/en/first-steps/authorization/).
5. Wyślij testowy `POST https://openapi.sandbox.tpay.com/transactions` z `Authorization: Bearer <token>`, JSON `{"amount":49.99,"description":"Test PodAdresem","hiddenDescription":"<lokalny-id>","payer":{"email":"test@example.com","name":"Test User"},"callbacks":{"notification":{"url":"https://<tunel>/api/payments/webhooks/tpay"},"payerUrls":{"success":"http://localhost:3000/seller/payments/success","error":"http://localhost:3000/seller/payments/cancel"}}}`. Własny kod potwierdzi wymagania konta i dostępność nadpisania callback. Z odpowiedzi zachowaj `transactionId`, `title`, `transactionPaymentUrl`; samo `result=success` znaczy tylko, że transakcja powstała. [Pierwsza transakcja](https://docs-api.tpay.com/en/first-steps/first-transaction/).
6. Preferowany tunel: zainstaluj ngrok (`brew install ngrok` na macOS), załóż konto, zapisz token poleceniem `ngrok config add-authtoken <token>` i uruchom `ngrok http 4000`. Skopiuj publiczny HTTPS URL, ustaw go w panelu Tpay i `PAYMENT_PUBLIC_API_URL`; po restarcie darmowego tunelu z nowym adresem zaktualizuj konfigurację. Łańcuch: Tpay → HTTPS ngrok → `localhost:4000/api/payments/webhooks/tpay`. Tpay nie podąża za redirectem webhooka. W razie polityki odrzucającej `localhost` na return URL wystaw też web przez drugi tunel i dopasuj `FRONTEND_URL`/CORS. [ngrok](https://ngrok.com/use-cases/share-localhost), [Tpay webhooki](https://docs-api.tpay.com/en/webhooks/).
7. **BLIK jednorazowy:** w panelu transakcyjnym wybierz BLIK, kod zaczynający się od `777` (np. `777654`) daje sukces w sandboxie. Kwoty `144.00`, `120.00`, `312.00` symulują odpowiednio odmowę, brak środków, timeout. [Sandbox](https://docs-api.tpay.com/en/first-steps/environments/).
8. **Karta:** na stronie Tpay wybierz kartę i użyj aktualnych testowych danych z sekcji „Card Payments” w dokumentacji sandbox; nie kopiuj numerów do repo. Zrób osobno sukces/3DS, odmowę i zapis tokenu. Karty/portfele mogą wymagać aktywacji produkcyjnej. [Sandbox](https://docs-api.tpay.com/en/first-steps/environments/), [metody](https://docs-api.tpay.com/en/first-steps/list-of-payment-methods/).
9. **Karta recurring:** zainicjuj kartę z `pay.groupId=103`, `pay.cardPaymentData.save=1`, przejdź 3DS, odbierz podpisany webhook z `card_token`, zapisz tylko token, a potem utwórz należność testową i charge tokenem zgodnie z [referencją API](https://api.tpay.com/) i uprawnieniem konta. Kwota `504.00` służy do błędu tokenowej płatności w sandboxie. Potwierdź `cof=recurring`, brak podwójnego charge i opóźniony webhook. [Tokenizacja](https://docs-api.tpay.com/en/tokenization/), [sandbox](https://docs-api.tpay.com/en/first-steps/environments/).
10. **BLIK recurring:** utwórz próbę zgody PAYID, użyj kodu `999009`–`999016` lub kwoty `x.08`–`x.15` z kodem `777***`; sprawdź `ALIAS_REGISTER`, następnie charge na zapisanym aliasie i webhook potwierdzający transakcję. Kwota `495.00`, kod `777***`, opis `mock` symulują bank bez wsparcia PAYID. Sandbox PAYID ma limity aliasów; nie zakładać trwałości testowego aliasu. [Sandbox](https://docs-api.tpay.com/en/first-steps/environments/), [BLIK](https://docs-api.tpay.com/en/payment-methods/blik/).
11. **JWS/E2E:** zweryfikuj `X-JWS-Signature` certyfikatem Tpay i raw body, a dopiero potem porównaj merchant, ID i kwotę. Tpay → webhook → `payment_events`/`payments` → `listing_orders.paid` → uprawnienie ogłoszenia. Drugi przebieg: initial PRO → autoryzacja instrumentu → potwierdzona płatność → `subscriptions.active` → zasymulowany kolejny okres → nowy charge → webhook → nowy `current_period_end`. Odtwórz duplikat i zły podpis; sprawdź, że uprawnienie powstaje raz.

## 9. Frontend Next.js, obserwowalność i testy

Next.js wysyła żądanie wyceny/zakupu do NestJS, pokazuje loading, przechodzi na zweryfikowany HTTPS `transactionPaymentUrl` i po powrocie odpytuje nasze API. Ekrany: `processing`, `paid`, `failed`, `cancelled`, `subscription pending authorization`, `past_due`; brak sekretów Tpay w bundle i brak przyznawania PRO po query param success. Dla BLIK PAYID wyraźny ekran zgody i późniejsze zarządzanie anulowaniem. Hosty checkoutu walidować po aktualnych URL sandbox/produkcja i konfiguracji Tpay, bez akceptowania dowolnego redirectu.

Logować `payment_created`, `provider_request`, `webhook_received/verified/rejected`, `payment_confirmed`, `renewal_attempted/failed`, `refund_requested/completed` z correlation ID, czasem i kodem błędu; bez tokenów/secrets/card data. Mierzyć opóźnienie webhooka, liczbę `unknown`, naliczenia podwójne, należności po terminie i brak uprawnienia po zapłacie.

Testy: unit domeny z mockiem portów, tabela przejść statusów, stała kwota/okres, anulowanie i oddzielne uprawnienie PRO; integracja adaptera z odpowiedziami sandbox/HTTP i kwotami decimal; webhook prawidłowy JWS, zły certyfikat, zmienione body, duplikat, nieznane ID, za mało wpłacone, stare zdarzenie; scheduler dwa workery/restart/timeout, stan `unknown` i brak podwójnego charge; E2E sandbox dla ogłoszenia, karty recurring, PAYID, odmowy, anulowania i zwrotu. Szczegółowe testy MT-XXX są w [MANUAL_TESTS.md](payments/MANUAL_TESTS.md). Przy zmianie zachowania aktualizować także `docs/MANUAL_RELEASE_TESTS.md` zgodnie z `AGENTS.md`.

## 10. Stripe removal

| Kategoria | Dokładne elementy i kolejność |
| --- | --- |
| KEEP | `listing_orders`, `listing_order_items`, `listing_entitlements`, wyceny ogłoszeń, mechanizm blokad i reconciliation po dostosowaniu, `AgencyPlanService` jako jedyny czytnik uprawnień. |
| REFACTOR | Oba porty gateway i kontrakty zdarzeń (`sessionId`, wymagany `subscriptionId`), `AgencyPlanCheckoutAttemptsService`, `AgencyPlanPaymentEventsService`, `BillingSubscriptionEventsService`, `AgencyPlanPaymentReconciliationService`, nazwy endpointów checkoutu, frontendowy redirect validator, panel admina planów, obsługa zwrotów. |
| MIGRATE lokalny schemat | `plan_catalog.stripe_price_id_*` usunąć po zastąpieniu lokalną ceną; `agencies.billing_customer_id/billing_subscription_id` zastąpić lokalną `subscriptions`; `provider_checkout_session_id` zmienić na neutralne ID transakcji lub usunąć wraz z lokalnymi próbami testowymi. Nie ma migracji historii Stripe. |
| DELETE we wczesnej fazie 2 | Dwa adaptery i dwa kontrolery Stripe oraz ich specyfikacje, `stripe-checkout-url.ts` i test, Stripe fixtures/teksty/ENV w `.env.example`, `LOCAL_SETUP.md`, planach i dokumentacji, zależność `stripe` w `apps/api/package.json` i `pnpm-lock.yaml`, lokalne sekrety/webhooki Stripe. |

Kolejność: neutralne porty i schemat → potwierdzenie lokalnego charakteru wszystkich rekordów → bezpieczne wyłączenie checkoutu na czas refaktoru → usunięcie Stripe → kompilacja, testy i działanie aplikacji bez płatności → Tpay. Nie utrzymywać równoległych webhooków ani routingu historycznego. Lokalną bazę developerską można odtworzyć; kopię zrobić, jeśli zawiera przydatne testowe dane. Wewnętrzny `BILLING_WEBHOOK_SECRET` usunąć dopiero po sprawdzeniu jego konsumentów, bo nie jest częścią Stripe.

## 11. MVP, fazy i kryteria odbioru

**MVP:** jednorazowa płatność BLIK/kartą za ogłoszenie, podpisany webhook, reconciliation, refund, karta recurring, BLIK PAYID model A jeśli aktywowany, stała cena i miesięczny okres, scheduler, anulowanie na koniec okresu, proste dunning, logi i monitoring. **Faza 2:** promocyjny pierwszy cykl, dynamiczne kwoty recurring, modele BLIK M/O, roczne plany, proration, samoobsługowe upgrade/downgrade, kupony recurring, automatyczne faktury, drugi PSP/failover. Istniejące wyceny ogłoszeń nadal działają; promocje planów należy jawnie wyłączyć z recurring MVP lub osobno przeprojektować.

Szczegółowa kolejność i kryteria każdego małego kroku są w [IMPLEMENTATION_TASKS.md](payments/IMPLEMENTATION_TASKS.md). Fazy: 0 Preparation; 1 Neutral payment domain; 2 Stripe removal; 3 Tpay basic client; 4 One-time payment; 5 Webhooks; 6 Refund; 7 Card recurring POC; 8 Card recurring production flow; 9 BLIK recurring POC; 10 BLIK recurring production flow; 11 Billing scheduler; 12 Dunning/grace; 13 Cancellation; 14 Frontend subscription management; 15 Final regression/release. Wskazanie `PAY-XXX` autoryzuje wyłącznie ten task. Po tasku uruchomić jego testy, zaktualizować odpowiadający scenariusz w [MANUAL_TESTS.md](payments/MANUAL_TESTS.md) i, jeśli zmienia się funkcjonalność, również [MANUAL_RELEASE_TESTS.md](MANUAL_RELEASE_TESTS.md). Raportować wynik i czekać na kolejne polecenie. Po większej iteracji wypisać krótką listę `Manual regression required: MT-...`; nie wykonywać całego katalogu po każdym tasku.

### Definition of Done

- [ ] Tpay obsługuje płatność za ogłoszenie i potwierdzony zwrot.
- [ ] Karta recurring działa; BLIK PAYID model A działa albo konkretny brak w koncie/umowie, alternatywny flow i decyzja o zakresie wydania są jawnie opisane.
- [ ] JWS jest zawsze weryfikowany, a zła kwota, zły podpis i obcy certyfikat nie zmieniają stanu.
- [ ] Duplikat webhooka, retry i równoległe schedulery nie wykonują podwójnego charge ani nie przedłużają PRO dwa razy.
- [ ] PRO przedłuża się wyłącznie po zapłacie, wygasa zgodnie z polityką grace i można anulować na koniec okresu.
- [ ] Domena nie importuje Tpay, a wybór providera jest zamknięty w DI.
- [ ] Sandbox, tunel i testy lokalne są udokumentowane; testy automatyczne i manualne przechodzą.
- [ ] Sekrety nie trafiają do repo ani logów, a Stripe nie obsługuje aktywnego flow i został bezpiecznie wycofany.

## 12. Tpay API assumptions / open questions

### PAY-003 — rejestr aktywacji konta (4 października 2026 r.)

**Znaczenie statusu:** „Opisane przez Tpay” potwierdza istnienie funkcji w dokumentacji, **nie** jej dostępność dla konta PodAdresem. Nie mam dostępu do panelu akceptanta ani potwierdzenia od Tpay; PAY-002 nadal oczekuje na ukończenie. Sandbox według [dokumentacji środowisk](https://docs-api.tpay.com/en/first-steps/environments/) udostępnia funkcje testowe, ale nie potwierdza aktywacji produkcyjnej. Każdy wiersz wymaga sprawdzenia w panelu Sandbox i, gdy panel nie pokazuje odpowiedniego uprawnienia, pisemnej odpowiedzi Tpay.

| Funkcja | Co potwierdza dokumentacja | Status dla konta PodAdresem | Dowód wymagany do zamknięcia |
| --- | --- | --- | --- |
| BLIK jednorazowy | Kanał BLIK (`groupId=150`) jest opisany przez [Tpay](https://docs-api.tpay.com/en/payment-methods/blik/). | Niepotwierdzony. | Widoczny kanał BLIK w panelu Sandbox albo potwierdzenie Tpay; następnie test konta w osobnym tasku. |
| Karty jednorazowe | Kanał kart (`groupId=103`) jest opisany przez [Tpay](https://docs-api.tpay.com/en/payment-methods/cards/); Tpay ostrzega, że karty mogą wymagać aktywacji. | Niepotwierdzony. | Widoczny kanał kart i potwierdzone uprawnienie konta. |
| Tokenizacja karty | [Tokenizacja](https://docs-api.tpay.com/en/tokenization/) wymaga aktywnych płatności kartą i notyfikacji; pozwala otrzymać token. | Niepotwierdzona. | Potwierdzenie Tpay lub udany POC otrzymania tokenu po pierwszej płatności; przed POC sprawdzić uprawnienie konta. |
| Obciążenia kartowe MIT / `cof=recurring` | Token może służyć do kolejnej transakcji według [dokumentacji tokenizacji](https://docs-api.tpay.com/en/tokenization/) i [referencji API](https://api.tpay.com/). | Niepotwierdzone; **blokuje PAY-034–PAY-035**, dopóki Tpay nie potwierdzi poprawnego flow i uprawnienia. | Pisemne potwierdzenie, że konto może inicjować kolejne obciążenia tokenem dla abonamentu oraz wymaganych pól/cof; potem POC. |
| BLIK Płatności Powtarzalne PAYID, model A | [Model A](https://docs-api.tpay.com/en/payment-methods/blik/) jest przeznaczony do stałej kwoty i częstotliwości. | Niepotwierdzony; **blokuje PAY-041–PAY-042**, dopóki Tpay nie potwierdzi uprawnienia. | Pisemne potwierdzenie PAYID/modelu A dla konta, limitów, dat zgody i obsługiwanych banków; potem POC. |
| Zwroty | [API zwrotów](https://docs-api.tpay.com/en/refunds/) opisuje pełny i częściowy refund; wymaga środków na koncie na kwotę zwrotu i opłatę. | Niepotwierdzone dla konta i kanałów, które wybierzemy. | Potwierdzenie dostępności, uprawnień, opłat i ograniczeń dla BLIK/kart; test w PAY-030–PAY-032. |
| Apple Pay | Występuje na [liście metod](https://docs-api.tpay.com/en/first-steps/list-of-payment-methods/); Tpay wskazuje możliwą potrzebę aktywacji. | Niepotwierdzony; nie blokuje podstawowego MVP. | Potwierdzenie Tpay dla konta i wybranego checkoutu oraz warunków sandbox/produkcja. |
| Google Pay | Występuje na [liście metod](https://docs-api.tpay.com/en/first-steps/list-of-payment-methods/); Tpay wskazuje możliwą potrzebę aktywacji. | Niepotwierdzony; nie blokuje podstawowego MVP. | Potwierdzenie Tpay dla konta i wybranego checkoutu oraz warunków sandbox/produkcja. |

**Kontrola manualna PAY-003:** po ukończeniu PAY-002 zalogować się do [panelu Sandbox](https://panel.sandbox.tpay.com/), sprawdzić dostępne metody płatności i sekcję Integracja → API; zanotować datę i wynik dla każdego wiersza bez kopiowania kluczy. Sama obecność BLIK lub karty na liście nie dowodzi uprawnienia do PAYID albo MIT. Funkcje niewidoczne lub niejednoznaczne skierować do Tpay. Kontrola panelu **nie została wykonana**, ponieważ dostęp do konta nie został potwierdzony. Żadnej wiadomości do Tpay jeszcze nie wysłano.

**Kontakt do Tpay:** [Centrum pomocy dla deweloperów](https://support.tpay.com/developer), [formularz kontaktowy Tpay](https://tpay.com/kontakt), Biuro Obsługi Klienta **+48 61 66 82 778**. Formularz ma pole ID konta; można je podać Tpay przez ich kanał, bez umieszczania w repo. [Źródło kontaktu](https://support.tpay.com/developer). Właściciel konta może przekazać Tpay następujące pytania, bez sekretów:

1. Czy na naszym koncie Sandbox i docelowym koncie produkcyjnym są dostępne: BLIK, karty, tokenizacja kart, obciążenia MIT (`cof=recurring`), PAYID model A, pełne/częściowe zwroty, Apple Pay i Google Pay? Co wymaga osobnej aktywacji/umowy?
2. Jaki jest aktualny poprawny proces drugiego obciążenia karty zapisanym tokenem, w tym wymagane pola API i zgoda klienta? Czy konto ma uprawnienie do takiego charge?
3. Czy PAYID model A obsłuży stałą miesięczną cenę PRO; jakie są limity, daty ważności zgody, banki i warunki anulowania?
4. Jakie są opłaty i ograniczenia zwrotów oraz dostępność portfeli w checkoutcie przekierowującym?

**Wniosek na dziś:** można projektować neutralną domenę, ale POC karty i PAYID wymaga potwierdzenia aktywacji konta. PAY-003 pozostaje otwarty do czasu sprawdzenia panelu i uzyskania odpowiedzi na niejednoznaczne uprawnienia. Nie utożsamiać dokumentacji funkcji ani domyślnych możliwości Sandbox z gotowością konta produkcyjnego.

1. **Business i aktywacja:** przed POC karty potwierdzić tokenizację, MIT i `cof=recurring`; przed POC BLIK potwierdzić Płatności Powtarzalne, PAYID i model A; przed planowaniem portfeli potwierdzić Apple Pay/Google Pay w wybranym flow. Sprawdzić refundy i opłaty. Sandbox może mieć funkcje włączone, produkcja niekoniecznie. [Metody](https://docs-api.tpay.com/en/first-steps/list-of-payment-methods/).
2. **Card MIT:** referencja opisuje `tokenPaymentData` i `cof`, dokumentacja tokenizacji opisuje otrzymanie tokena, ale szczegóły poprawnego payloadu odnowienia i wymaganego pierwotnego ID transakcji trzeba potwierdzić w aktualnej referencji i działającym sandboxie przed implementacją. [API](https://api.tpay.com/), [tokenizacja](https://docs-api.tpay.com/en/tokenization/).
3. **BLIK model A:** jakie limity, data końca zgody i banki są dostępne dla stałej kwoty miesięcznej? Promocja pierwszego miesiąca i model M/O są poza MVP. [BLIK](https://docs-api.tpay.com/en/payment-methods/blik/).
4. **Idempotencja PSP:** w opisie `POST /transactions` nie potwierdzono kontraktu idempotency-key analogicznego do Stripe. Do czasu potwierdzenia stosować lokalny ledger i status lookup po timeoutcie; nie ponawiać automatycznie niepewnego POST. [API](https://api.tpay.com/).
5. **Notyfikacje:** dokumentacja wymaga JWS oraz opisuje `md5sum` dla transakcji i różne body ACK. Zatwierdzić na własnym sandboxie format wszystkich typów, certyfikat dla sandboxu, mapowanie `transactionId`/`title` i statusy błędów. [Webhooki](https://docs-api.tpay.com/en/webhooks/).
6. **Dane i decyzje biznesowe:** właściciel potwierdził brak produkcyjnych danych Stripe; PAY-001 zapisze wynik lokalnego audytu, bez projektowania migracji produkcyjnej. Faktury, polityka zwrotów i długość grace wymagają osobnej decyzji produktowo-księgowej, ale nie blokują neutralnego modelu.

## Architecture invariants

1. Domain/Application nie importuje Tpay SDK, DTO ani endpointów.
2. Każda płatność ma lokalny `paymentId`.
3. Kwota pochodzi z backendu, nigdy z frontendu.
4. Success redirect nie oznacza zapłaty.
5. Wyłącznie zweryfikowany webhook lub potwierdzony status PSP potwierdza płatność.
6. Każda operacja finansowa jest idempotentna po stronie aplikacji.
7. Timeout, connection reset i restart nie oznaczają `failed`.
8. Niepewnego charge nie wolno automatycznie ponowić.
9. `RecurringAuthorization` i `Subscription` są oddzielne.
10. `Subscription` i uprawnienie PRO są oddzielne; dostęp wylicza `AgencyPlanService`.
11. Nie przechowujemy PAN/CVV.
12. Surowa referencja PSP jest chroniona w infrastrukturze, poza domeną.
13. Scheduler i równoległe workery nie mogą pobrać dwa razy za ten sam okres.
14. Jedna para `subscription + period` ma maksymalnie jedną należność `renewal`.
15. Tpay da się zastąpić innym adapterem bez przebudowy logiki biznesowej.
