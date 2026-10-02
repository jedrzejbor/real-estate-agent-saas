# Polskie bramki płatności i BLIK — wybór oraz testy lokalne

Stan rozpoznania: 2 października 2026 r. Ten dokument jest planem migracji; obecny kod nadal korzysta ze Stripe. Dostępność metod, warunki aktywacji i prowizje trzeba potwierdzić w ofercie dla naszej działalności.

## Czego potrzebuje PodAdresem

Mamy dwa różne przypadki użycia:

1. **Jednorazowa płatność za ogłoszenie lub promocję** — klient płaci w PLN, najlepiej także BLIK-iem; po potwierdzeniu płatności aktywujemy zakupione uprawnienie.
2. **Miesięczny lub roczny plan agencji** — pierwsza płatność, kolejne obciążenia, nieudane odnowienia, anulowanie i rabaty na określoną liczbę cykli.

Zwykły BLIK z sześciocyfrowym kodem obsługuje pierwszy przypadek. Automatyczne odnowienia wymagają osobnego produktu **BLIK Płatności Powtarzalne** (zgoda klienta i token/alias) albo płatności cyklicznych kartą. Nie należy zakładać, że aktywacja zwykłego BLIK w bramce włączy także odnowienia.

## Krótka lista operatorów

| Operator | Płatność jednorazowa BLIK | Płatności powtarzalne BLIK | Sandbox i uwaga wdrożeniowa |
| --- | --- | --- | --- |
| **Tpay** | Tak, również przez stronę płatności operatora | Tak, przez alias PAYID; merchant inicjuje kolejne transakcje | Oddzielny sandbox z udokumentowanymi kodami i scenariuszami błędów. Webhooki mają podpis JWS. Dobry kandydat do pierwszego proof of concept obu przepływów. [BLIK](https://docs-api.tpay.com/pl/payment-methods/blik/), [sandbox](https://docs-api.tpay.com/pl/first-steps/environments/), [notyfikacje](https://docs-api.tpay.com/pl/webhooks/). |
| **PayU** | Tak, strona płatności lub integracja kodu BLIK | Tak, token PAYID i późniejsze obciążenia MIT; wymaga aktywacji usługi i aneksu | Dobrze opisane API zamówień, testy BLIK i powiadomienia. Warto porównać ofertę dla abonamentów. [BLIK](https://developers.payu.com/europe/pl/docs/payment-solutions/blik/), [powtarzalne](https://developers.payu.com/europe/pl/docs/payment-solutions/blik/recurring/), [sandbox](https://developers.payu.com/europe/docs/testing/sandbox/). |
| **Przelewy24** | Tak | Funkcja dostępna w API, ale nie jest domyślnie włączona; wymaga kontaktu z pomocą techniczną | Sandbox REST API i testowe kody BLIK; sprawdzić w rozmowie handlowej dokładny model odnowień dla naszego konta. [Dokumentacja REST API](https://developers.przelewy24.pl/), [specyfikacja OpenAPI](https://developers.przelewy24.pl/yaml/pl_documentation_1.0.yaml). |
| **Autopay** | Tak | Dokumentacja opisuje płatności automatyczne BLIK; konfigurację i zakres należy uzgodnić z operatorem | Sandbox i komunikaty ITN; bardziej zależne od ustaleń konfiguracyjnych. [Bramka](https://developers.autopay.pl/online), [dokumentacja bramki](https://developers.autopay.pl/pdf?documentId=384), [panel testowy](https://developers.autopay.pl/online/portal-autopay). |

**Rekomendacja do sprawdzenia:** zacząć od Tpay i równolegle zebrać ofertę PayU. Obie dokumentacje wprost opisują powtarzalny BLIK, a Tpay ma szczegółowe scenariusze sandboxowe. Jeżeli abonament można na początku odnawiać ręcznie, porównanie jest prostsze; jeśli musi odnawiać się automatycznie, potwierdzić pisemnie dostęp do BLIK PAYID, model zgód, obsługiwane banki, opłaty, zwroty i zachowanie po wycofaniu zgody. Prowizji nie wpisujemy na sztywno: zależą od umowy, wolumenu i metod.

## Jak wygląda integracja w tym repozytorium

1. Zachować domenowe zamówienia, wyceny, próby płatności, deduplikację zdarzeń i nadawanie uprawnień. Dodać adapter wybranego operatora do istniejących portów `apps/api/src/listing-commerce/listing-payment-gateway.port.ts` oraz `apps/api/src/agency-plan-commerce/agency-plan-payment-gateway.port.ts`.
2. Jednorazowa płatność: z kwoty brutto w **groszach** utworzyć transakcję/zamówienie operatora, zapisać jego identyfikator i URL płatności, a użytkownika przekierować na ten URL. Operatorzy różnią się formatem kwoty — konwersję wykonać tylko na granicy adaptera.
3. Dodać osobne publiczne endpointy notyfikacji operatora dla ogłoszeń i planów. Weryfikować autentyczność według jego dokumentacji, identyfikator sklepu, identyfikator zamówienia/próby, kwotę i walutę. Dopiero potwierdzony status z serwera operatora może aktywować usługę. **Powrót przeglądarki z checkoutu nie jest potwierdzeniem zapłaty.**
4. Powtórzone i opóźnione notyfikacje obsłużyć idempotentnie. Obecna tabela zdarzeń i serwisy rozliczające mogą zostać wykorzystane, ale trzeba zmapować statusy nowego operatora. Nie opierać końcowego statusu wyłącznie na czasie wygaśnięcia lokalnej próby: płatność może potwierdzić się później. Dla niejasnego statusu przewidzieć odczyt transakcji przez API operatora.
5. **Plany agencji wymagają osobnego projektu migracji.** Obecny `StripeAgencyPlanPaymentAdapter` tworzy subskrypcję Stripe, `Stripe Price` i kupony. W Tpay/PayU kolejne pobranie BLIK PAYID inicjuje nasz system; potrzebne są harmonogram, model zgody/tokena, próby odnowień, obsługa odmowy, anulowania, zwrotu i rabatu na kolejne cykle. Istniejący port `createSubscriptionCheckoutSession` nie opisuje jeszcze całego tego cyklu.
6. Usunąć zależności od Stripe dopiero po wdrożeniu zamiennika: `stripePriceIdMonthly/Yearly` w katalogu planów i panelu admina, `providerPriceReference`, nazwy pól `session_id`, ustawienia `STRIPE_*`, kontrolery `/api/listing-payments/webhooks/stripe` i `/api/agency-plan-payments/webhooks/stripe`, logikę powrotu z checkoutu i testy. `BILLING_WEBHOOK_SECRET` dotyczy osobnego wewnętrznego webhooka billingowego; nie jest sekretem operatora.
7. Jeśli istnieją aktywne subskrypcje Stripe, zaplanować ich wygaszenie lub ponowne udzielenie zgody na nową metodę. Tokenów płatniczych nie traktować jako przenośnych między operatorami.

## Testowanie i podłączenie lokalnie

### 1. Konto testowe i konfiguracja

- Założyć konto sandbox wybranego operatora, włączyć BLIK oraz ustalić, czy PAYID/płatności automatyczne są aktywne na koncie testowym i produkcyjnym. Tpay rozdziela dane logowania sandbox/produkcja; PayU udostępnia sandbox POS i własne konto testowe; dla P24 i Autopay potrzebna będzie właściwa konfiguracja usługi.
- Trzymać klucze wyłącznie w ignorowanym `apps/api/.env.local` lub lokalnym menedżerze sekretów. Przykładowy zestaw **po implementacji adaptera Tpay**: `PAYMENT_PROVIDER=tpay`, `TPAY_ENV=sandbox`, `TPAY_CLIENT_ID=...`, `TPAY_CLIENT_SECRET=...`, `TPAY_MERCHANT_ID=...`, `TPAY_NOTIFICATION_SECURITY_CODE=...`, `PAYMENT_PUBLIC_BASE_URL=https://<adres-tunelu>`. To **proponowane nazwy**, jeszcze nieobsługiwane przez kod; dokładne pola zależą od adaptera.
- Uruchomić projekt według [LOCAL_SETUP.md](LOCAL_SETUP.md). Lokalnie web działa na `http://localhost:3000`, API na `http://localhost:4000/api`. Dla API w Dockerze sprawdzić, czy tunel kieruje na port hosta `4000`.

### 2. Publiczny adres do notyfikacji

- Wystawić lokalne API przez tunel HTTPS, np. `ngrok http 4000` albo `cloudflared tunnel --url http://localhost:4000`. Otrzymany publiczny adres wpisać w panelu sandbox jako URL notyfikacji lub przekazać w żądaniu, jeśli operator pozwala na nadpisanie adresu. Przykład docelowej ścieżki: `https://<adres-tunelu>/api/listing-payments/webhooks/tpay`.
- Przeglądarka może wrócić na `http://localhost:3000`, jeśli operator akceptuje lokalny URL powrotu. Jeśli nie, wystawić także web przez tunel i zaktualizować `FRONTEND_URL`. URL powrotu i URL notyfikacji to dwie różne rzeczy.
- Po każdym restarcie tunelu z nowym adresem zaktualizować konfigurację sandbox i zrestartować API, jeśli adres jest w ENV. Nie wysyłać testowych notyfikacji do obecnych ścieżek `/stripe`: oczekują podpisu Stripe.

### 3. Przebieg testu BLIK

1. Utworzyć lokalnie zamówienie z istniejącego interfejsu; backend zapisuje próbę i tworzy płatność u operatora.
2. Otworzyć zwrócony URL checkoutu, wybrać BLIK, użyć wyłącznie danych testowych operatora i dokończyć płatność w symulatorze.
3. Sprawdzić, czy API dostało poprawnie podpisaną notyfikację, przypisało ją do właściwej próby i aktywowało ogłoszenie/plan **raz**. Strona po powrocie powinna odczytać status z API, również gdy notyfikacja nadejdzie chwilę później.
4. Powtórzyć próbę z błędem, anulowaniem, timeoutem, ponowionym webhookiem, zmienioną kwotą/podpisem oraz z opóźnioną notyfikacją. Błędny podpis i rozbieżna kwota nie mogą nadać uprawnienia.

Przykłady sandbox: **Tpay** — poprawny kod BLIK zaczyna się od `777` (np. `777654`), kwota `144.00` symuluje odrzucenie przez użytkownika, `120.00` brak środków; PAYID można testować m.in. kodami `999009`–`999016`. **PayU** — dokumentacja podaje `777xxx` dla udanej płatności bez zapisu tokena, `500500` dla negatywnej oraz `700701` dla kodu, który wygasł. **P24** — dokumentacja opisuje `777XXX` jako udany test BLIK White Label. Te kody dotyczą konkretnych ścieżek i konfiguracji usługi, więc przed testem sprawdzić wariant checkoutu w dokumentacji operatora. [Tpay](https://docs-api.tpay.com/pl/first-steps/environments/), [PayU](https://developers.payu.com/europe/docs/payment-solutions/blik/testing/), [P24](https://developers.przelewy24.pl/).

### 4. Test abonamentu

- Udzielić testowej zgody PAYID, zapisać alias/token powiązany z agencją, a następnie uruchomić próbne odnowienie w sandboxie. Zweryfikować zarówno status płatności, jak i ważność zgody.
- Sprawdzić odmowę lub brak środków, wygaśnięcie/wycofanie zgody, ponowne wysłanie powiadomienia, brak dostarczenia powiadomienia i rabat trwający określoną liczbę cykli.
- Nie włączać automatycznego obciążania produkcyjnego przed sprawdzeniem treści zgody, możliwości anulowania przez klienta oraz zakresu usługi w umowie z operatorem.

## Co ustalić z operatorem przed wyborem

- Czy konto obejmie jednorazowy BLIK, BLIK PAYID w modelu potrzebnym do abonamentu, karty cykliczne jako alternatywę i wszystkie wymagane banki?
- Jak wygląda aktywacja sandboxu i produkcji, testy certyfikacyjne, dostęp do API statusu, zwroty, reklamacje i rozliczenie nieudanych płatności?
- Jakie są prowizje dla BLIK, kart i odnowień, opłaty stałe, okres wypłat i warunki przy przewidywanym wolumenie?
- Czy operator wymaga szczególnych zapisów zgody, aneksu lub dodatkowej weryfikacji dla płatności powtarzalnych? Jak zgłasza cofnięcie zgody i jak długo przechowuje alias?

**Decyzja wdrożeniowa:** najpierw uruchomić jednorazowy checkout BLIK i wiarygodny webhook w sandboxie; następnie osobno zaprojektować i przetestować odnowienia planów. Wybór operatora zamknąć po potwierdzeniu warunków PAYID i kosztów dla obu scenariuszy.
