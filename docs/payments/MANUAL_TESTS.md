# Manualne testy płatności PodAdresem

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

Status: scenariusze planowane; MT-001 wykonano ręcznie w Sandbox 10 października 2026 r. ([protokół](test-runs/2026-10-10-mt-001-sandbox.md)); główne ścieżki MT-016 wykonano lokalnie 12 października 2026 r. ([protokół](test-runs/2026-10-12-pay-011-local.md)), a dodatkowe kontrole ról i flag czekają na wynik; główne ścieżki MT-017 potwierdzono lokalnie 12 października 2026 r. ([protokół](test-runs/2026-10-12-pay-013-local.md)), bez osobnych pomiarów bazy, ról i flag; główne ścieżki MT-018 potwierdzono po restarcie API 13 października 2026 r. ([protokół](test-runs/2026-10-12-pay-014-local.md)), a role, flagi i pełne porównanie danych nadal czekają na wynik; pozostałych scenariuszy nie wykonano. Powiązania z [planem](../tpay-integration-plan.md) i [zadaniami PAY-XXX](IMPLEMENTATION_TASKS.md). Testy są napisane dla osoby używającej aplikacji; tam, gdzie trzeba zasymulować czas, webhook lub błąd sieci, developer przygotowuje bezpieczne narzędzie testowe i pomaga w uruchomieniu. Nie używaj prawdziwych kart ani pieniędzy. Dane kart i sekrety pozostają poza repo. Po każdym tasku zmieniającym zachowanie aktualizuj odpowiedni scenariusz oraz `docs/MANUAL_RELEASE_TESTS.md`. W protokole konkretnego przebiegu zapisz datę, środowisko, wersję i Pass/Fail. Po większej iteracji podaj krótką listę `Manual regression required: MT-...`.

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
