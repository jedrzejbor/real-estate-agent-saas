# Niezależna ścieżka: gotowość płatności jednorazowych w Sandbox

Data: 4 listopada 2026 r. Zakres: diagnoza wcześniejszego HTTP 403, kontrola lokalnej bazy i poprawka wyboru certyfikatu webhooka. Bez PAY-034, bez nowej transakcji, bez zmiany publicznego checkoutu.

## Ustalenia

- PAY-019 i PAY-022 utworzyły dwie transakcje Sandbox po 1,00 PLN. Tpay zwrócił status `pending` oraz linki z hostem `secure.sandbox.tpay.com`, zgodnym z [oficjalnym wykazem środowisk](https://docs-api.tpay.com/en/first-steps/environments/). Panel pokazał transakcje jako oczekujące. Nie potwierdzono otwarcia strony płatności: wcześniejsza przeglądarka testowa otrzymała HTTP 403, a pełne linki nie były przechowywane. Na tej podstawie nie można ustalić, czy 403 pochodził z automatyzacji przeglądarki, ograniczenia transakcji czy Tpay. Nie tworzono trzeciej transakcji tylko dla ponowienia tej kontroli.
- [Oficjalna referencja Tpay Open API](https://api.tpay.com/) podaje osobne certyfikaty JWS i CA pod `secure.sandbox.tpay.com`. Weryfikator miał dotąd wyłącznie adresy produkcyjne, więc poprawnie podpisane powiadomienie Sandbox wskazujące jego własny `x5u` byłoby odrzucone. Poprawiono wybór pary certyfikatów i dozwolonego `x5u` według konfiguracji środowiska. Nadal pobierane są tylko stałe URL Tpay, bez podążania za redirectem i bez pobierania arbitralnego `x5u` z nagłówka.
- Kontrola bazy: na początku kontener `real-estate-db` nie działał; uruchomiono **wyłącznie** usługę `db` przez `docker compose up -d db`, bez API/web i bez migracji. Odczyt w transakcji `READ ONLY` w lokalnej bazie `real_estate_saas` potwierdził: `listing_orders` istnieje; `payments`, `payment_events`, `refunds` i `agency_plan_checkout_attempts` **nie istnieją**. Nie użyto bazy innego projektu. Dane i schemat roboczy nie zostały zmienione przez polecenia SQL.
- Publiczne endpointy zakupu pozostają zablokowane odpowiedzią `PAYMENTS_UNAVAILABLE`; nie nadano uprawnień do ogłoszeń ani PRO.

## Kontrole wykonane

- Jednostkowy test weryfikatora JWS: **Pass, 9/9**. Obejmuje wybór hosta Sandbox i produkcji, odrzucenie podpisu z drugiego środowiska, dokładne raw body, obcy certyfikat, niedozwolony `x5u`, algorytm, brak podpisu oraz pobieranie tylko dwóch stałych URL.
- Testy modułu płatności i kontrolera webhooka: **Pass, 11/11**. Pierwsza próba w ograniczonym środowisku testowym zakończyła się `listen EPERM` na `127.0.0.1`; ponowienie z dozwolonym lokalnym nasłuchem przeszło. Żaden test nie kontaktował się z Tpay.
- Kontrola typów API: **Pass** (`pnpm --filter api type-check`).
- Manualne otwarcie strony płatności MT-002/MT-022: **Blocked**, ponieważ pełny URL wcześniejszych transakcji nie został zapisany i nie ma obecnie bezpiecznej strony do otwarcia. Manualna notyfikacja Sandbox MT-006 i pełny zakup MT-003: **Blocked** bez właściwej uruchomionej bazy, korelacji płatności i publicznego checkoutu.
- Zmiany bazy danych: **brak migracji i zapisu SQL**; zmienił się tylko stan kontenera PostgreSQL na uruchomiony. Brak połączeń do Tpay API i brak nowej transakcji w tej kontroli.

## Następny bezpieczny krok

1. Przed migracją roboczej bazy zrobić zweryfikowaną kopię i plan migracji forward-only dla brakujących tabel `payments`, `payment_events`, `refunds` i `agency_plan_checkout_attempts`. Wcześniej potwierdzić kolejność zależności oraz zachowanie istniejących rekordów.
2. Gdy środowisko lokalne będzie gotowe, utworzyć **jedną** nową małą transakcję testową przez opt-in narzędzie developerskie, zapisać link wyłącznie tymczasowo poza repo i otworzyć go w zwykłej przeglądarce bez płacenia. Zanotować kod odpowiedzi i widok bez kopiowania pełnego URL. Przy kolejnym HTTP 403 zebrać kod i czas zdarzenia oraz zgłosić do Tpay bez ujawniania sekretów.
3. Dopiero po działającym linku, wymaganych tabelach, bezpiecznej korelacji i poprawnym webhooku planować osobne zadanie stopniowego włączenia checkoutu. PAY-033/PAY-034 dla karty cyklicznej pozostają niezależnie zablokowane do odpowiedzi Tpay.

Manual regression required: MT-002, MT-003, MT-006 po przygotowaniu środowiska.
