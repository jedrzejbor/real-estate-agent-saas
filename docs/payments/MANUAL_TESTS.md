# Manualne testy płatności PodAdresem

PAY-023: [protokół lokalny](test-runs/2026-10-16-pay-023-local.md) potwierdza testy web i build; ręczny widok lokalny oraz pełny powrót z Tpay pozostają **Blocked**.

## MT-016 — Tymczasowa niedostępność checkoutu (PAY-011)

**Prerequisites:** Wersja z PAY-011; testowe konto prywatnego sprzedającego z ofertą gotową do zakupu oraz osobne konto właściciela agencji z planem **Free**. Nie używaj prawdziwych pieniędzy. Developer porówna liczbę prób płatności i uprawnień w testowej bazie przed testem i po nim.

1. Jako sprzedający otwórz zakup publikacji ogłoszenia i naciśnij przycisk rozpoczęcia płatności.
2. Sprawdź, że widzisz komunikat „Płatności są tymczasowo niedostępne. Spróbuj ponownie później.” i pozostajesz w PodAdresem.
3. Jako właściciel agencji z planem **Free** wejdź na `/dashboard/upgrade`, wybierz płatny plan i poczekaj na wycenę. Kliknij „Przejdź do bezpiecznej płatności”. Sprawdź ten sam komunikat. Jeśli przycisk jest nieaktywny, zanotuj widoczną przyczynę (np. obecny płatny plan albo błąd wyceny) i oznacz tę część jako **Blocked**, nie jako Pass.
4. Odśwież obie strony. Sprawdź, że istniejące zamówienie, wycena i dotychczasowe uprawnienia są nadal dostępne. Developer porównuje liczbę prób płatności i uprawnień przed testem i po nim.
5. Powtórz żądania jako niezalogowany użytkownik lub osoba bez dostępu do zasobu; obowiązujące reguły uwierzytelnienia i uprawnień nadal mają działać. Sprawdź też stan dostępnych flag sprzedaży ogłoszeń: żadna nie może ponownie włączyć checkoutu.

**Expected result:** Próba rozpoczęcia płatności zwraca HTTP 503 z kodem `PAYMENTS_UNAVAILABLE`; nie ma przekierowania do Stripe ani nowego zamówienia, próby płatności lub uprawnienia. Odczyt istniejących zamówień oraz wyceny ogłoszenia i planu nadal działają. Komunikat „Internal server error” jest wynikiem negatywnym.

**Pass/Fail:** [ ] Pass  [ ] Fail  [ ] Blocked; data: ______; tester: ______; środowisko/wersja: ______; stan flag: ______; uwagi: ______.

**Do zapisania po powrocie — wyślij wyniki bez danych logowania:**

- Ogłoszenie: [ ] komunikat o niedostępności [ ] inny wynik [ ] Blocked; widoczny tekst: ______; przekierowanie do Stripe: [ ] tak [ ] nie.
- PRO na agencji Free: [ ] komunikat o niedostępności [ ] inny wynik [ ] Blocked; widoczny tekst lub powód nieaktywnego przycisku: ______; przekierowanie do Stripe: [ ] tak [ ] nie.
- Dotychczasowy plan na wcześniej używanym koncie (zaległa kontrola PAY-010): [ ] nadal widoczny [ ] niewidoczny [ ] nie sprawdzono.
- Data i wersja aplikacji: ______. Developer uzupełni wynik kontroli bazy i kod odpowiedzi API; nie trzeba otwierać Tpay ani wpisywać karty.

Pozostałe scenariusze MT-002–MT-015 dotyczą płatności po ponownym uruchomieniu checkoutu i nie są scenariuszami odbioru PAY-011.

## MT-017 — Frontend bez Stripe podczas wstrzymanych płatności (PAY-013)

**Prerequisites:** Lokalny frontend i API z PAY-013; testowe konto agencji Free, konto sprzedającego z ogłoszeniem oraz dane do rejestracji nowego konta testowego. Nie wpisuj danych karty.

1. Otwórz rejestrację i wybierz płatny plan. Sprawdź, że strona nie wymienia Stripe i informuje o tymczasowej niedostępności płatności. Po utworzeniu konta przejdź do panelu: konto pozostaje dostępne, plan nie aktywuje się bez zapłaty, a komunikat o niedostępności jest czytelny. Jeśli wymagane jest potwierdzenie e-mail, sprawdź najpierw ekran oczekiwania, a potem panel po weryfikacji.
2. Jako właściciel agencji Free otwórz `/dashboard/upgrade`, poczekaj na wycenę i kliknij „Przejdź do bezpiecznej płatności”. Powinien pojawić się komunikat o niedostępności. Sprawdź także konto z istniejącym płatnym planem: plan nadal jest widoczny, a zakup kolejnego planu pozostaje niedostępny.
3. Jako prywatny sprzedający otwórz zakup ogłoszenia i kliknij „Zamawiam i płacę”. Powinien pojawić się ten sam komunikat, bez utworzenia zamówienia.
4. Jako administrator otwórz edycję katalogu planów. Nie ma pól identyfikatorów cen Stripe. Zapisz nieszkodliwą zmianę planu testowego tylko jeśli środowisko testowe na to pozwala; formularz nie wysyła pól Stripe. Sprawdź role: zwykły użytkownik nie może edytować katalogu.
5. Developer porównuje zamówienia, próby płatności, uprawnienia i plan konta przed/po testach. Sprawdza też, że żadna dostępna flaga sprzedaży nie przywraca przekierowania do Stripe.

**Expected result:** Nigdzie w tych przepływach nie ma marki Stripe ani przekierowania do operatora. Kliknięcia pokazują „Płatności są tymczasowo niedostępne. Spróbuj ponownie później.”, nie tworzą płatnego uprawnienia i nie zmieniają dotychczasowych danych. Rejestracja konta jest możliwa niezależnie od niedostępności płatności.

**Pass/Fail:** [ ] Pass  [ ] Fail  [ ] Blocked; data: ______; tester: ______; środowisko/wersja: ______; stan flag: ______; uwagi: ______.

## MT-018 — Aplikacja po usunięciu SDK i kolumn Stripe (PAY-014)

**Prerequisites:** Lokalna aplikacja po migracji PAY-014 i ponownym uruchomieniu API; istniejące konto agencji z przypisanym planem, konto agencji Free i ogłoszenie gotowe do zakupu. Developer ma zweryfikowany backup sprzed migracji i porównuje stan bazy przed/po. Nie używaj karty ani prawdziwych pieniędzy.

1. Uruchom API i web, zaloguj się na istniejące konto. Otwórz panel agencji, listę ogłoszeń i `/dashboard/upgrade`. Sprawdź, że dotychczasowy plan, ogłoszenia i wyceny pozostają dostępne.
2. Na agencji Free spróbuj rozpocząć zakup PRO; jako właściciel ogłoszenia spróbuj opłacić publikację. Oba widoki powinny pokazać komunikat „Płatności są tymczasowo niedostępne. Spróbuj ponownie później.” bez przekierowania i bez nowej próby płatności.
3. Sprawdź walidację i role: konto bez dostępu nie może edytować katalogu planów ani kupić cudzego ogłoszenia. W panelu admina nie ma pól Stripe; edycja ceny testowego planu nadal podlega istniejącym regułom walidacji.
4. Developer porównuje liczbę agencji, planów, ogłoszeń, zamówień i uprawnień przed/po migracji oraz sprawdza, że pozostałe flagi sprzedaży nie przywracają checkoutu.

**Expected result:** Aplikacja startuje bez SDK i konfiguracji Stripe. Tylko dwie puste kolumny cen Stripe są usunięte; pozostałe dane i uprawnienia są zachowane. Wycena planu działa bez błędu HTTP 500. Checkout pozostaje niedostępny niezależnie od roli i flagi, a zwykłe ekrany działają.

**Pass/Fail:** [ ] Pass  [ ] Fail  [ ] Blocked; data: ______; tester: ______; środowisko/wersja: ______; stan flag: ______; uwagi: ______.

## MT-019 — Dostępne kanały płatności jednorazowych (PAY-018)

**Prerequisites:** Dane API Sandbox w ignorowanym `apps/api/.env.local`; klient OAuth i `TpayApiClient.getAvailablePaymentChannels()`. Kontrola jest wykonywana przez developera w narzędziu lokalnym, bez uruchamiania checkoutu ani tworzenia transakcji.

1. Wywołaj metodę odczytu kanałów z konfiguracją Sandbox. Nie wypisuj tokenu, Client ID, Client Secret ani surowego body odpowiedzi.
2. Zanotuj liczbę i identyfikatory kanałów z odpowiedzi, które mają `available=true`. Sprawdź osobno BLIK (`channelId=64`, `groupId=150`) i kartę (`channelId=53`, `groupId=103`). Jeśli którejś metody nie ma, zapisz ją jako niedostępną zamiast uznawać test za nieudany.
3. W lokalnych testach HTTP sprawdź, że `available=false` lub brak jawnego `true` usuwa kanał z wyniku, a błędy OAuth/API i niepoprawna odpowiedź nie deklarują żadnej metody jako dostępnej. Sekrety i token nie mogą pojawić się w komunikacie błędu.
4. Potwierdź zakres: odczyt nie zmienia rekordów, uprawnień, ról, flag ani zablokowanego checkoutu. Lista kanałów jednorazowych nie potwierdza tokenizacji, MIT ani BLIK PAYID.

**Expected result:** Wynik odpowiada aktualnej odpowiedzi [Tpay `GET /transactions/channels`](https://docs-api.tpay.com/en/first-steps/list-of-payment-methods/), zawiera tylko `available=true`; brak kanału nie jest ukrywany jako sukces danej metody. Nie powstaje płatność ani zmiana stanu aplikacji.

**Pass/Fail:** [ ] Pass  [ ] Fail  [ ] Blocked; data: ______; tester: ______; dostępne BLIK: ______; karta: ______; liczba kanałów: ______; uwagi: ______.

## MT-020 — Awaryjny odczyt statusu transakcji (PAY-020)

**Prerequisites:** Istniejąca transakcja Tpay Sandbox z MT-002 i jej `transactionId`; lokalna konfiguracja Sandbox w ignorowanym `apps/api/.env.local`. Nie twórz nowej transakcji, nie otwieraj checkoutu i nie dokonuj płatności.

1. Developer jednokrotnie wywołuje `TpayApiClient.getTransactionStatus(transactionId)`. Klient używa OAuth oraz `GET /transactions/{transactionId}` wyłącznie jako odczytu awaryjnego; nie uruchamiaj automatycznego pollingu.
2. Porównaj status neutralny (`pending`, `confirmed`, `failed` lub `unknown`) ze statusem tej samej transakcji w panelu Sandbox. Nie uznawaj `result=success` z API za potwierdzenie zapłaty: oznacza powodzenie zapytania.
3. Przy `unknown`, HTTP 404, niespójnej lub niepełnej odpowiedzi zapisz ograniczenie; nie aktywuj usługi. W protokole umieść tylko bezpieczny identyfikator, status i wynik porównania, bez tokenu, sekretu, danych płatnika lub pełnej odpowiedzi.

**Expected result:** Odczyt jest zgodny z panelem. Oczekująca lub nieznana transakcja nie otrzymuje `confirmed`, nie powstaje lokalna płatność ani uprawnienie; checkout pozostaje niedostępny. Kontrola nie zastępuje brakującego testu otwarcia strony w MT-002.

**Pass/Fail:** [ ] Pass  [ ] Fail  [ ] Blocked; data: ______; tester: ______; status API: ______; status panelu: ______; uwagi: ______.

## MT-021 — Powiązanie ogłoszenia z lokalną płatnością (PAY-021)

**Prerequisites:** Testowe ogłoszenie i konto prywatnego sprzedającego; backend z PAY-021. Publiczne endpointy zakupu nadal zwracają `503 PAYMENTS_UNAVAILABLE`. Developer używa wyłącznie odizolowanej bazy do sprawdzenia zapisu wewnętrznego.

1. Jako właściciel ogłoszenia otwórz jego panel i spróbuj rozpocząć zakup. Sprawdź komunikat o niedostępności oraz brak przekierowania. Nowy status oczekiwania w panelu jest w tym etapie **Blocked**, ponieważ checkout jest wyłączony; nie obchodź blokady przez publiczne API.
2. Developer w odizolowanej bazie uruchamia test wewnętrznego przygotowania próby: odczytuje kwotę z zapisanego zamówienia, sprawdza lokalny `Payment` z tym samym `orderId`, ID próby jako `correlationId` i kwotą w groszach. Ponowienie tej samej próby zwraca ten sam rekord; druga aktywna próba dla zamówienia jest odrzucona.
3. Developer sprawdza przypadek niepotwierdzonego adresu e-mail: nie powstaje `Payment` ani próba wywołania bramki. Sprawdza też brak nowego uprawnienia ogłoszenia i brak zmian w roboczej bazie po teście. Role i flagi nadal nie mogą ominąć publicznej blokady.

**Expected result:** Publiczny zakup pozostaje niedostępny. Wewnętrzny zapis tworzy najwyżej jedną aktywną płatność dla zamówienia, z kwotą backendu i bez `providerTransactionId` lub uprawnienia. Panel nie pokazuje nowej płatności do czasu późniejszego udostępnienia checkoutu.

**Pass/Fail:** [ ] Pass  [ ] Fail  [ ] Blocked; data: ______; tester: ______; komunikat UI: ______; wynik bazy testowej: ______; uwagi: ______.

## MT-022 — Adapter jednorazowej płatności Tpay (PAY-022)

**Prerequisites:** Dane Sandbox tylko w ignorowanym `apps/api/.env.local`; pojedyncze, jawnie uruchomione narzędzie developerskie wywołujące `TpayPaymentAdapter`. Publiczny checkout nadal zwraca `PAYMENTS_UNAVAILABLE`.

1. W narzędziu developerskim użyj lokalnego `paymentId`, małej kwoty w groszach, testowego płatnika i adresów callback HTTPS. Wywołaj adapter najwyżej raz dla tego testu. Nie używaj prawdziwych danych kupującego.
2. Sprawdź wynik `pending`, obecność `providerTransactionId`, `providerTitle` i linku w domenie Sandbox. Zapisz tylko bezpieczne identyfikatory i domenę, bez pełnego URL, tokenów ani sekretów. Wynik `unknown` wymaga uzgodnienia; nie ponawiaj automatycznie POST.
3. Otwórz otrzymany link w przeglądarce bez wyboru metody i bez płacenia. Jeśli wystąpi HTTP 403 lub inny błąd, oznacz **otwarcie strony** jako `Blocked`, choć samo utworzenie transakcji może być `Pass`. Nie twórz kolejnej transakcji wyłącznie w celu ponowienia kontroli.
4. Developer potwierdza, że publiczny zakup ogłoszenia i PRO nadal są zablokowane, a w bazie roboczej nie pojawiły się nowa płatność ani uprawnienie. Adapter sam nie zapisuje `Payment`; trwały zapis transakcji należy do późniejszego połączenia aplikacyjnego. Zmiana roli lub flagi nie może udostępnić checkoutu.

**Expected result:** Adapter mapuje wynik Tpay na neutralny `pending` z ID i `title`; pełna kontrola linku wymaga strony płatności działającej w zwykłej przeglądarce. Nie ma zapłaty, webhooka ani aktywacji usługi. Przypadki 4xx, 5xx i timeout są sprawdzane testami z fikcyjnymi odpowiedziami.

**Pass/Fail:** utworzenie [ ] Pass [ ] Fail [ ] Blocked; otwarcie strony [ ] Pass [ ] Fail [ ] Blocked; data: ______; tester: ______; bezpieczne ID: ______; uwagi: ______.

Status: scenariusze planowane; MT-001 wykonano ręcznie w Sandbox 10 października 2026 r. ([protokół](test-runs/2026-10-10-mt-001-sandbox.md)); MT-002 ma potwierdzone utworzenie transakcji 15 października 2026 r., lecz otwarcie strony płatności pozostaje **Blocked** — panel pokazuje transakcję, ale nie udostępnia linku ([protokół](test-runs/2026-10-15-pay-019-local.md)); główne ścieżki MT-016 wykonano lokalnie 12 października 2026 r. ([protokół](test-runs/2026-10-12-pay-011-local.md)), a dodatkowe kontrole ról i flag czekają na wynik; główne ścieżki MT-017 potwierdzono lokalnie 12 października 2026 r. ([protokół](test-runs/2026-10-12-pay-013-local.md)), bez osobnych pomiarów bazy, ról i flag; główne ścieżki MT-018 potwierdzono po restarcie API 13 października 2026 r. ([protokół](test-runs/2026-10-12-pay-014-local.md)), a role, flagi i pełne porównanie danych nadal czekają na wynik; MT-019 potwierdzono w Sandbox 14 października 2026 r. ([protokół](test-runs/2026-10-14-pay-018-local.md)); pozostałych scenariuszy nie wykonano. Powiązania z [planem](../tpay-integration-plan.md) i [zadaniami PAY-XXX](IMPLEMENTATION_TASKS.md). Testy są napisane dla osoby używającej aplikacji; tam, gdzie trzeba zasymulować czas, webhook lub błąd sieci, developer przygotowuje bezpieczne narzędzie testowe i pomaga w uruchomieniu. Nie używaj prawdziwych kart ani pieniędzy. Dane kart i sekrety pozostają poza repo. Po każdym tasku zmieniającym zachowanie aktualizuj odpowiedni scenariusz oraz `docs/MANUAL_RELEASE_TESTS.md`. W protokole konkretnego przebiegu zapisz datę, środowisko, wersję i Pass/Fail. Po większej iteracji podaj krótką listę `Manual regression required: MT-...`.

Kontrolę startu konfiguracji PAY-015 wykonano lokalnie 13 października 2026 r. ([protokół](test-runs/2026-10-13-pay-015-local.md)); nie ponawiano wtedy MT-001 ani nie pobierano tokenu. Kontrolę klienta OAuth PAY-016 wykonano 13 października 2026 r. ([protokół](test-runs/2026-10-13-pay-016-local.md)). Testy integracyjne i ponowne MT-001 dla PAY-017 wykonano 13 października 2026 r. ([protokół](test-runs/2026-10-13-pay-017-local.md)). MT-020 potwierdzono w Sandbox 15 października 2026 r. ([protokół](test-runs/2026-10-15-pay-020-local.md)); MT-002 pozostaje częściowo zablokowany. PAY-021 ma [osobny protokół](test-runs/2026-10-16-pay-021-local.md). PAY-022 ma [protokół](test-runs/2026-10-16-pay-022-local.md): utworzenie transakcji Pass, otwarcie strony Blocked.

## MT-001 — Uzyskanie tokenu OAuth Tpay Sandbox

### Kontrola integracyjna — PAY-017

Testy lokalnego HTTP w `tpay-api.client.spec.ts` sprawdzają formularz `POST /oauth/auth`, odpowiedź z tokenem, odświeżenie po wygaśnięciu, błędny Client Secret oraz maskowanie odpowiedzi błędu. Używają wyłącznie fikcyjnych danych i lokalnego serwera. Test Sandbox jest domyślnie pomijany; trzeba go jawnie włączyć, używając ignorowanego `apps/api/.env.local`:

```sh
cd apps/api
PAYMENT_PROVIDER=tpay TPAY_OAUTH_LIVE_TEST=1 node --env-file=.env.local ./node_modules/jest/bin/jest.js --runInBand src/payments/infrastructure/tpay/tpay-api.client.spec.ts --testNamePattern='PAY-017 live Sandbox'
```

Po teście powtórz MT-001 przez `TpayApiClient.getAccessToken()` i zapisz tylko Pass/Fail, kod HTTP i `expires_in`. Nie zapisuj tokenu, Client ID, Client Secret ani pełnej odpowiedzi. Błędny sekret sprawdzaj lokalnym testem HTTP, nie przez niepotrzebne próby na koncie Sandbox. Sam OAuth nie zmienia danych, uprawnień, ról ani flag i nie odblokowuje checkoutu.

### Kontrola klienta OAuth — PAY-016

Użyj istniejących danych Sandbox z ignorowanego `apps/api/.env.local` i wywołaj **tylko** metodę `TpayApiClient.getAccessToken()` w jednorazowym lokalnym skrypcie. `PAYMENT_PROVIDER=tpay` dotyczy tego procesu; sam start API nie powinien pobierać tokenu. Nie zapisuj tokenu, Client ID ani sekretu w protokole lub logach.

1. Developer uruchamia klienta z konfiguracją Sandbox. Potwierdza, że żądanie OAuth zakończyło się powodzeniem i odpowiedź ma dodatni `expires_in`; do protokołu wpisuje jedynie wynik i czas ważności, bez tokenu.
2. Developer sprawdza, że ponowne wywołanie w okresie ważności korzysta z cache, a równoległe wywołania przy odświeżeniu wykonują jedno żądanie (testy jednostkowe z fikcyjnymi danymi).
3. Błędne dane (401) i timeout sprawdza tylko testem jednostkowym z fikcyjnymi sekretami. Komunikat błędu oraz logi nie mogą ujawniać danych uwierzytelniających ani tokenu.
4. Sprawdź, że checkout dla uprawnionego konta nadal jest niedostępny, konto bez uprawnień nie dostaje dostępu do płatności, a stan płatności, planu i ogłoszenia nie zmienił się. Flagi wydania nie uruchamiają nowego klienta OAuth automatycznie.

**Oczekiwany wynik PAY-016:** Token Sandbox można uzyskać przez nowego klienta, bez ujawnienia wartości. Sam OAuth nie tworzy transakcji, nie zapisuje danych w bazie i nie aktywuje checkoutu. Wcześniejszy test Postman MT-001 nie zastępuje tej kontroli.

### Kontrola konfiguracji API — PAY-015

Ta kontrola nie ponawia testu OAuth i nie wysyła żądania do Tpay. W ignorowanym `apps/api/.env.local` przygotuj `PAYMENT_PROVIDER=tpay`, `TPAY_API_URL=https://openapi.sandbox.tpay.com`, Sandbox Client ID/Secret i numeryczny Merchant ID. Nie wklejaj wartości do protokołu ani logów. `TPAY_SECURITY_CODE` będzie potrzebny przy późniejszym webhooku; nie jest wymagany do startu PAY-015.

1. Uruchom lokalne API z `NODE_ENV=development` i sprawdź, że startuje. Jeśli używasz Dockera, przekaż zmienne do procesu API; sam plik `apps/api/.env.local` nie jest montowany do kontenera przez obecny `docker-compose.yml`.
2. Sprawdź log startowy: nie ma w nim Client Secret ani innych danych uwierzytelniających Tpay. Nie wykonuj checkoutu ani żądania OAuth.
3. Developer uruchamia testy jednostkowe z fikcyjnymi wartościami: nieznany `PAYMENT_PROVIDER`, brak wymaganego sekretu i URL produkcyjny w środowisku Sandbox muszą zatrzymać inicjalizację. Wartości sekretów nie mogą pojawić się w komunikacie błędu.

**Oczekiwany wynik PAY-015:** API startuje z kompletną konfiguracją Sandbox; płatności nadal pokazują komunikat o niedostępności. Konfiguracja nie zmienia danych, ról ani flag wydania. Wynik zapisz osobno, bez sekretów. Wcześniejszy wynik MT-001 w Postmanie pozostaje bez zmian.

### Przygotowanie konta do MT-001 — PAY-002

Ten etap sprawdza dostęp do konta Sandbox. Właściciel dodatkowo wykonał już ręczny test OAuth; klient API aplikacji został zaimplementowany w PAY-016 i sprawdzony integracyjnie w PAY-017. Sandbox i produkcja mają odrębne konta oraz dane dostępowe. [Środowiska Tpay](https://docs-api.tpay.com/en/first-steps/environments/).

1. Otwórz [rejestrację Tpay Sandbox](https://register.sandbox.tpay.com/) albo, jeśli konto już istnieje, przejdź od razu do [panelu Sandbox](https://panel.sandbox.tpay.com/).
2. Przy nowym koncie wpisz własny adres e-mail i nazwę firmy; zapoznaj się z regulaminem Sandbox i samodzielnie zaakceptuj go, jeśli chcesz utworzyć konto. Dokończ wymagane przez Tpay potwierdzenie konta.
3. Zaloguj się do panelu Sandbox. Sprawdź, czy widzisz identyfikator akceptanta (Merchant ID); zanotuj go w prywatnym miejscu, bez haseł i sekretów w repo lub zgłoszeniu.
4. Otwórz **Integracja → API** i znajdź sekcję **Open API Keys** oraz przycisk **Add new key**. Klucz Sandbox jest już zapisany lokalnie; nie wpisuj go do protokołu. [Autoryzacja Tpay](https://docs-api.tpay.com/en/first-steps/authorization/).

**Wynik PAY-002 do odnotowania:** data: ______; panel dostępny [ ] tak [ ] nie; Merchant ID znaleziony [ ] tak [ ] nie; sekcja Open API Keys dostępna [ ] tak [ ] nie. Nie wpisuj tutaj Merchant ID, Client Secret, hasła ani tokenu. Jeśli któryś punkt jest niedostępny, zapisz tylko komunikat błędu bez danych konta.

**ID:** MT-001  
**Name:** Uzyskanie tokenu OAuth Tpay Sandbox  
**Purpose:** Sprawdzić, że dane konta sandbox pozwalają połączyć się z API.  
**Prerequisites:** Konto Tpay Sandbox; klient API lub przygotowana kolekcja Postman; Client ID/Secret zapisane poza repo.

**Steps:**

1. Otwórz przygotowane żądanie „OAuth Sandbox” w Postman.
2. Wskaż lokalne sekrety sandbox i kliknij Send.
3. Sprawdź kod odpowiedzi i pole expires_in; nie kopiuj tokenu do zgłoszenia.

**Expected result:** Odpowiedź HTTP 200 zawiera access_token i czas ważności; sekret nie pojawia się w logach.

**Database state:** Brak zmian w bazie. Stan bazy sprawdza developer; tester ocenia przede wszystkim widok aplikacji.

**Pass/Fail:** [ ] Pass  [ ] Fail  [ ] Blocked; data: ______; tester: ______.

**Notes:** Jeśli 401, sprawdź konto i klucze; nie wklejaj sekretów do dokumentu. Miejsce na numer zamówienia i uwagi: ______.

## MT-002 — Utworzenie testowej transakcji

**ID:** MT-002  
**Name:** Utworzenie testowej transakcji  
**Purpose:** Sprawdzić, że backend/Tpay tworzy płatność i zwraca adres checkoutu.  
**Prerequisites:** MT-001 zaliczony; dane Sandbox w ignorowanym `apps/api/.env.local`. W PAY-019 test wykonywany jest jednorazowym narzędziem developerskim, bez podłączania checkoutu aplikacji. Publiczny tunel jest potrzebny dopiero do testu działającego webhooka, nie do samego utworzenia nieopłaconej transakcji.

**Steps:**

1. Developer wywołuje `TpayApiClient.createTransaction()` z niewielką kwotą testową w groszach, opisem, testowym płatnikiem i adresami callback HTTPS. Użyj unikalnego `hiddenDescription`; nie używaj prawdziwych danych kupującego.
2. Sprawdź wynik `pending`, identyfikator transakcji, `title` i obecność adresu płatności. W protokole zapisz tylko bezpieczne identyfikatory i domenę adresu, bez pełnego URL, tokenu lub sekretów. Jeśli wynik to `unknown`, **nie powtarzaj POST**; zanotuj niepewny wynik do uzgodnienia w późniejszym etapie.
3. Sprawdź, że frontend akceptuje adres `https://secure.sandbox.tpay.com/` tylko przy konfiguracji Sandbox, a adres produkcyjny tylko przy konfiguracji produkcyjnej. Adres z innym hostem, HTTP, danymi użytkownika w URL albo nietypowym portem musi zostać odrzucony bez przekierowania. Nie zapisuj pełnego linku w protokole.
4. Otwórz zwrócony link w przeglądarce i potwierdź, że widać stronę płatności **Sandbox**. Nie wybieraj metody i nie finalizuj płatności. Jeśli przeglądarka testowa zwraca HTTP 403, oznacz kontrolę strony jako **Blocked** i zweryfikuj tę samą transakcję zwykłą przeglądarką lub panelem Sandbox, bez tworzenia drugiej.
5. Po późniejszym udostępnieniu checkoutu wróć na ogłoszenie z Tpay. Panel ma odczytać zamówienie przez API i przy statusie `pending_payment` wyświetlić „Sprawdzamy wynik płatności”. Sam parametr powrotu lub `success` w URL nie oznacza zapłaty ani publikacji. Dopóki publiczny checkout zwraca `PAYMENTS_UNAVAILABLE`, oznacz ten krok jako **Blocked**; nie obchodź blokady.

**Expected result:** Odpowiedź tworzenia ma status `pending` i link Tpay Sandbox; poprawny host jest dozwolony wyłącznie we właściwym środowisku. Powrót z Tpay pokazuje stan serwera, bez fałszywego sukcesu. `result=success` z POST oznacza utworzenie transakcji, nie zapłatę.

**Database state:** PAY-019 nie zapisuje lokalnego rekordu płatności. Po późniejszym podłączeniu aplikacji potrzebny będzie trwały zapis identyfikatorów i osobne potwierdzenie statusu. Stan bazy sprawdza developer.

**Pass/Fail:** [ ] Pass  [ ] Fail  [ ] Blocked; data: ______; tester: ______.

**Notes:** Nie uznawaj wyniku `result=success` z POST za opłaconą transakcję. Błędy 4xx i niepewne 5xx/timeout sprawdzają testy PAY-019; pełnego URL nie wklejaj do dokumentacji. Miejsce na bezpieczny identyfikator i uwagi: ______.

## MT-003 — Udana płatność BLIK za ogłoszenie

**ID:** MT-003  
**Name:** Udana płatność BLIK za ogłoszenie  
**Purpose:** Sprawdzić pełny zakup i aktywację ogłoszenia po potwierdzeniu.  
**Prerequisites:** API, web, ngrok i Tpay Sandbox działają; zalogowane konto testowe; testowe ogłoszenie gotowe.

**Steps:**

1. Otwórz formularz publikacji ogłoszenia i przygotuj testowe ogłoszenie.
2. Kliknij „Opublikuj i zapłać” lub aktualny przycisk zakupu.
3. Na stronie Tpay Sandbox wybierz BLIK i użyj aktualnego kodu testowego z dokumentacji Tpay (np. kod z grupy 777***).
4. Zatwierdź płatność i wróć do PodAdresem.
5. Odśwież panel ogłoszeń po otrzymaniu potwierdzenia.

**Expected result:** Najpierw może pojawić się „Przetwarzamy płatność”; potem potwierdzenie, a ogłoszenie ma status aktywny.

**Database state:** payment.status=confirmed; order paid; jedno listing entitlement. Stan bazy sprawdza developer; tester ocenia przede wszystkim widok aplikacji.

**Pass/Fail:** [ ] Pass  [ ] Fail  [ ] Blocked; data: ______; tester: ______.

**Notes:** Jeśli webhook jeszcze nie dotarł, poczekaj; sam powrót nie wystarcza. Miejsce na numer zamówienia i uwagi: ______.

## MT-004 — Nieudana lub anulowana płatność BLIK

**ID:** MT-004  
**Name:** Nieudana lub anulowana płatność BLIK  
**Purpose:** Sprawdzić brak aktywacji ogłoszenia bez zapłaty.  
**Prerequisites:** Warunki MT-003; drugie, nieopłacone ogłoszenie testowe.

**Steps:**

1. Rozpocznij zakup ogłoszenia.
2. W Tpay Sandbox użyj scenariusza odmowy z aktualnej dokumentacji (np. kwota 144.00, jeśli konfiguracja pozwala) albo anuluj płatność.
3. Wróć do PodAdresem i odśwież panel.
4. Spróbuj ponownie tylko po wyraźnym komunikacie, że poprzednia próba jest zakończona.

**Expected result:** Ogłoszenie pozostaje nieaktywne; widoczny jest błąd lub anulowanie, bez fałszywego sukcesu.

**Database state:** payment.status=failed/expired albo pending/unknown do uzgodnienia; brak entitlement. Stan bazy sprawdza developer; tester ocenia przede wszystkim widok aplikacji.

**Pass/Fail:** [ ] Pass  [ ] Fail  [ ] Blocked; data: ______; tester: ______.

**Notes:** Przy timeout nie uznawaj płatności za failed bez sprawdzenia stanu operatora. Miejsce na numer zamówienia i uwagi: ______.

## MT-005 — Powtórzony webhook

**ID:** MT-005  
**Name:** Powtórzony webhook  
**Purpose:** Sprawdzić, że ta sama notyfikacja nie aktywuje usługi dwa razy.  
**Prerequisites:** MT-003 wykonany; developer przygotował bezpieczny replay tej samej podpisanej notyfikacji sandbox.

**Steps:**

1. Zanotuj liczbę aktywnych uprawnień ogłoszenia przed testem.
2. Poproś developera o ponowne wysłanie tej samej notyfikacji przez przygotowane narzędzie.
3. Odśwież panel ogłoszenia i porównaj stan.
4. Sprawdź z developerem odpowiedź webhooka.

**Expected result:** Ogłoszenie pozostaje aktywne tylko raz; webhook otrzymuje poprawne ACK.

**Database state:** Jeden payment confirmed, jedno entitlement i jedno zastosowanie zdarzenia. Stan bazy sprawdza developer; tester ocenia przede wszystkim widok aplikacji.

**Pass/Fail:** [ ] Pass  [ ] Fail  [ ] Blocked; data: ______; tester: ______.

**Notes:** Nie modyfikuj podpisanego body przy teście duplikatu. Miejsce na numer zamówienia i uwagi: ______.

## MT-006 — Niepoprawny podpis webhooka

**ID:** MT-006  
**Name:** Niepoprawny podpis webhooka  
**Purpose:** Sprawdzić, że fałszywa notyfikacja nie zmienia płatności.  
**Prerequisites:** Developer przygotował fixture z błędnym JWS; istnieje oczekująca płatność sandbox.

**Steps:**

1. Zanotuj status oczekującej płatności.
2. Uruchom przygotowany test „Niepoprawny podpis” lub poproś developera o jego uruchomienie.
3. Odśwież panel i sprawdź, czy ogłoszenie nadal oczekuje.
4. Sprawdź, czy log pokazuje odrzucenie bez sekretów.

**Expected result:** Żadne ogłoszenie ani PRO nie zostaje aktywowane; webhook jest odrzucony.

**Database state:** Payment nie zmienia się na confirmed; zdarzenie może mieć bezpieczny wpis audytu. Stan bazy sprawdza developer; tester ocenia przede wszystkim widok aplikacji.

**Pass/Fail:** [ ] Pass  [ ] Fail  [ ] Blocked; data: ______; tester: ______.

**Notes:** Nie wysyłaj prawdziwych sekretów w narzędziu testowym. Miejsce na numer zamówienia i uwagi: ______.

## MT-007 — Udana płatność kartą za ogłoszenie

**ID:** MT-007  
**Name:** Udana płatność kartą za ogłoszenie  
**Purpose:** Sprawdzić jednorazową kartę i ewentualne 3DS.  
**Prerequisites:** Warunki MT-003; testowa karta z aktualnej dokumentacji Tpay Sandbox.

**Steps:**

1. Rozpocznij zakup testowego ogłoszenia.
2. W Tpay wybierz kartę i użyj testowych danych wskazanych w oficjalnej dokumentacji.
3. Przejdź wymagany krok 3DS, jeśli się pojawi.
4. Wróć do PodAdresem i sprawdź ogłoszenie.

**Expected result:** Ogłoszenie jest aktywne dopiero po potwierdzeniu płatności.

**Database state:** payment.status=confirmed; jedno entitlement. Stan bazy sprawdza developer; tester ocenia przede wszystkim widok aplikacji.

**Pass/Fail:** [ ] Pass  [ ] Fail  [ ] Blocked; data: ______; tester: ______.

**Notes:** Nie zapisuj numeru karty ani CVC w repo, notatkach i zrzutach. Miejsce na numer zamówienia i uwagi: ______.

## MT-008 — Autoryzacja karty recurring

**ID:** MT-008  
**Name:** Autoryzacja karty recurring  
**Purpose:** Sprawdzić pierwszą płatność, 3DS i bezpieczny token.  
**Prerequisites:** PAY-033 potwierdzony; sandbox pozwala na tokenizację; konto testowe bez PRO.

**Steps:**

1. Wybierz miesięczny PRO i kartę.
2. Użyj testowej karty Tpay oraz przejdź 3DS.
3. Poczekaj na potwierdzenie płatności i zgody.
4. Otwórz ekran PRO.

**Expected result:** PRO aktywne na pierwszy opłacony miesiąc; karta jest zapisana jako metoda bez pokazywania pełnego numeru.

**Database state:** subscription active; initial payment confirmed; authorization active z zaszyfrowaną referencją CARD_TOKEN. Stan bazy sprawdza developer; tester ocenia przede wszystkim widok aplikacji.

**Pass/Fail:** [ ] Pass  [ ] Fail  [ ] Blocked; data: ______; tester: ______.

**Notes:** W POC wykonaj te same kroki w przygotowanej kolekcji/skrypcie z developerem. Miejsce na numer zamówienia i uwagi: ______.

## MT-009 — Odnowienie karty recurring

**ID:** MT-009  
**Name:** Odnowienie karty recurring  
**Purpose:** Sprawdzić drugą płatność za kolejny miesiąc.  
**Prerequisites:** MT-008 zaliczony; developer przygotował przyspieszenie daty testowej lub ręczne uruchomienie jednej należności.

**Steps:**

1. Otwórz ekran PRO i zanotuj datę końca pierwszego okresu.
2. Uruchom przygotowany test „Następny okres” z developerem.
3. Poczekaj na potwierdzenie Tpay i odśwież ekran.
4. Porównaj datę końca i historię płatności.

**Expected result:** Data końca przesuwa się o jeden opłacony miesiąc; w historii jest jedna nowa płatność.

**Database state:** Jedna subscription_renewal paid na ten okres; payment confirmed; brak dubla. Stan bazy sprawdza developer; tester ocenia przede wszystkim widok aplikacji.

**Pass/Fail:** [ ] Pass  [ ] Fail  [ ] Blocked; data: ______; tester: ______.

**Notes:** Nie testuj na realnej karcie ani bez możliwości powrotu daty testowej. Miejsce na numer zamówienia i uwagi: ______.

## MT-010 — Autoryzacja BLIK Płatności Powtarzalnych

**ID:** MT-010  
**Name:** Autoryzacja BLIK Płatności Powtarzalnych  
**Purpose:** Sprawdzić PAYID model A i pierwszą płatność.  
**Prerequisites:** PAY-040 potwierdzony; sandbox wspiera PAYID; konto testowe bez PRO.

**Steps:**

1. Wybierz miesięczny PRO i opcję BLIK Płatności Powtarzalne.
2. Użyj oficjalnego scenariusza testowego PAYID w Tpay Sandbox.
3. Potwierdź zgodę w dostępnym symulatorze banku.
4. Poczekaj na potwierdzenie pierwszej płatności i zgody.
5. Otwórz ekran PRO.

**Expected result:** PRO aktywne dopiero gdy płatność i zgoda są potwierdzone; metoda wyświetla się jako BLIK recurring.

**Database state:** initial payment confirmed; authorization active typu RECURRING_ALIAS; subscription active. Stan bazy sprawdza developer; tester ocenia przede wszystkim widok aplikacji.

**Pass/Fail:** [ ] Pass  [ ] Fail  [ ] Blocked; data: ______; tester: ______.

**Notes:** W POC wykonaj to z developerem przez przygotowany skrypt/Postman. To nie jest BLIK OneClick. Miejsce na numer zamówienia i uwagi: ______.

## MT-011 — Odnowienie BLIK recurring

**ID:** MT-011  
**Name:** Odnowienie BLIK recurring  
**Purpose:** Sprawdzić obciążenie już aktywnej zgody PAYID.  
**Prerequisites:** MT-010 zaliczony; developer przygotował jedną testową należność kolejnego miesiąca.

**Steps:**

1. Zanotuj obecną datę końca PRO.
2. Uruchom przygotowany test „Następny okres BLIK”.
3. Poczekaj na wynik Tpay i odśwież ekran.
4. Porównaj historię płatności i datę końca.

**Expected result:** Jedna nowa płatność za kolejny okres; PRO przedłuża się po potwierdzeniu.

**Database state:** Jedna renewal paid; jeden payment confirmed; alias pozostaje aktywny. Stan bazy sprawdza developer; tester ocenia przede wszystkim widok aplikacji.

**Pass/Fail:** [ ] Pass  [ ] Fail  [ ] Blocked; data: ______; tester: ______.

**Notes:** Dla modelu wymagającego potwierdzenia poczekaj zgodnie z aktualną konfiguracją, nie uruchamiaj dubla. Miejsce na numer zamówienia i uwagi: ______.

## MT-012 — Anulowanie na koniec okresu

**ID:** MT-012  
**Name:** Anulowanie na koniec okresu  
**Purpose:** Sprawdzić, że klient zachowuje opłacony PRO i nie jest obciążany ponownie.  
**Prerequisites:** Aktywne PRO z kartą lub BLIK recurring; konto właściciela agencji.

**Steps:**

1. Otwórz zarządzanie subskrypcją.
2. Kliknij „Anuluj na koniec okresu” i potwierdź.
3. Sprawdź podaną datę końca dostępu.
4. Z developerem przyspiesz datę testową poza koniec okresu i odśwież panel.

**Expected result:** Do końca okresu PRO działa; potem wygasa; nie pojawia się następna płatność.

**Database state:** cancel_at_period_end=true; po dacie status cancelled/expired; brak nowego renewal/charge. Stan bazy sprawdza developer; tester ocenia przede wszystkim widok aplikacji.

**Pass/Fail:** [ ] Pass  [ ] Fail  [ ] Blocked; data: ______; tester: ______.

**Notes:** Sprawdź też konto bez uprawnienia właściciela: nie może anulować. Miejsce na numer zamówienia i uwagi: ______.

## MT-013 — Nieudane odnowienie

**ID:** MT-013  
**Name:** Nieudane odnowienie  
**Purpose:** Sprawdzić odmowę, termin retry i brak dubla przy niepewnym wyniku.  
**Prerequisites:** Aktywna subskrypcja testowa; developer przygotował odmowę i osobny timeout.

**Steps:**

1. Uruchom test kolejnego okresu z odmową płatności.
2. Otwórz ekran PRO i sprawdź komunikat oraz datę kolejnej próby.
3. Uruchom osobny scenariusz timeout z developerem.
4. Sprawdź, że aplikacja pokazuje „Sprawdzamy wynik”, bez drugiego pobrania.

**Expected result:** Pewna odmowa daje past_due i zaplanowany retry; timeout daje unknown i blokuje retry.

**Database state:** failed renewal ma next_retry_at; unknown ma reconciliation_required, bez kolejnej próby. Stan bazy sprawdza developer; tester ocenia przede wszystkim widok aplikacji.

**Pass/Fail:** [ ] Pass  [ ] Fail  [ ] Blocked; data: ______; tester: ______.

**Notes:** Nie wywołuj ręcznie ponownego charge dla unknown. Miejsce na numer zamówienia i uwagi: ______.

## MT-014 — Grace period i wygaśnięcie PRO

**ID:** MT-014  
**Name:** Grace period i wygaśnięcie PRO  
**Purpose:** Sprawdzić różnicę między statusem abonamentu a dostępem do PRO.  
**Prerequisites:** MT-013 z pewną odmową; developer może przesunąć zegar testowy.

**Steps:**

1. Otwórz panel w pierwszym dniu po nieudanym odnowieniu.
2. Sprawdź, czy funkcje PRO nadal działają podczas grace.
3. Z developerem przesuń datę za koniec 7 dni grace.
4. Odśwież panel i spróbuj użyć funkcji PRO.

**Expected result:** W grace dostęp PRO działa mimo past_due; po grace dostęp wygasa, a panel pokazuje przyczynę.

**Database state:** subscription.status=past_due/expired; entitlement active w grace, potem Free. Stan bazy sprawdza developer; tester ocenia przede wszystkim widok aplikacji.

**Pass/Fail:** [ ] Pass  [ ] Fail  [ ] Blocked; data: ______; tester: ______.

**Notes:** Długość grace jest decyzją produktu; przed testem sprawdź aktualną konfigurację. Miejsce na numer zamówienia i uwagi: ______.

## MT-015 — Zwrot płatności

**ID:** MT-015  
**Name:** Zwrot płatności  
**Purpose:** Sprawdzić bezpieczny refund i korektę zamówienia.  
**Prerequisites:** Opłacona testowa płatność sandbox; konto administratora i zwykłego użytkownika.

**Steps:**

1. Jako administrator otwórz opłacone zamówienie i wybierz zwrot.
2. Potwierdź kwotę i wykonaj zwrot.
3. Sprawdź wynik w panelu PodAdresem oraz Tpay Sandbox.
4. Spróbuj powtórzyć identyczny zwrot.
5. Jako zwykły użytkownik sprawdź, że akcja jest niedostępna.

**Expected result:** Zwrot jest widoczny raz, ponowienie nie oddaje pieniędzy drugi raz; rola bez uprawnień nie wykona zwrotu.

**Database state:** Jeden refund confirmed/pending zgodnie z PSP; payment refunded/partially_refunded; korekta entitlement zgodna z polityką. Stan bazy sprawdza developer; tester ocenia przede wszystkim widok aplikacji.

**Pass/Fail:** [ ] Pass  [ ] Fail  [ ] Blocked; data: ______; tester: ______.

**Notes:** Politykę zwrotu i częściowego zwrotu trzeba zatwierdzić przed wdrożeniem. Miejsce na numer zamówienia i uwagi: ______.
