# Manualne testy płatności PodAdresem

Status: scenariusze planowane; MT-001 wykonano ręcznie w Sandbox 10 października 2026 r. ([protokół](test-runs/2026-10-10-mt-001-sandbox.md)); pozostałych nie wykonano. Powiązania z [planem](../tpay-integration-plan.md) i [zadaniami PAY-XXX](IMPLEMENTATION_TASKS.md). Testy są napisane dla osoby używającej aplikacji; tam, gdzie trzeba zasymulować czas, webhook lub błąd sieci, developer przygotowuje bezpieczne narzędzie testowe i pomaga w uruchomieniu. Nie używaj prawdziwych kart ani pieniędzy. Dane kart i sekrety pozostają poza repo. Po każdym tasku zmieniającym zachowanie aktualizuj odpowiedni scenariusz oraz `docs/MANUAL_RELEASE_TESTS.md`. W protokole konkretnego przebiegu zapisz datę, środowisko, wersję i Pass/Fail. Po większej iteracji podaj krótką listę `Manual regression required: MT-...`.

## MT-001 — Uzyskanie tokenu OAuth Tpay Sandbox

### Przygotowanie konta do MT-001 — PAY-002

Ten etap sprawdza dostęp do konta Sandbox. Właściciel dodatkowo wykonał już ręczny test OAuth; klient API aplikacji pozostaje do zaimplementowania w PAY-016. Sandbox i produkcja mają odrębne konta oraz dane dostępowe. [Środowiska Tpay](https://docs-api.tpay.com/en/first-steps/environments/).

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
**Prerequisites:** MT-001 zaliczony; lokalne API i ngrok uruchomione, gdy test obejmuje callback.

**Steps:**

1. W przygotowanej kolekcji wybierz „Utwórz transakcję testową”.
2. Ustaw kwotę i opis testowy zgodnie z instrukcją developera, kliknij Send.
3. Otwórz zwrócony adres płatności w przeglądarce.

**Expected result:** Widać stronę Tpay Sandbox; transakcja ma status oczekujący, bez aktywacji usługi.

**Database state:** Po integracji: payment.status=pending, zapisane transactionId/title; przy samym Postmanie może nie być lokalnego rekordu. Stan bazy sprawdza developer; tester ocenia przede wszystkim widok aplikacji.

**Pass/Fail:** [ ] Pass  [ ] Fail  [ ] Blocked; data: ______; tester: ______.

**Notes:** Nie uznawaj wyniku result=success z POST za opłaconą transakcję. Miejsce na numer zamówienia i uwagi: ______.

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
