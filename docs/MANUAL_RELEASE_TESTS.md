# Testy manualne przed wydaniem aplikacji

**Właściciel:** osoba przygotowująca wydanie i osoba odbierająca produkt.  
**Stan katalogu:** 2 października 2026 r. Scenariusze opisują funkcje znalezione w aktualnych trasach Web, modułach API i flagach wydania. Żaden test z tej listy nie jest oznaczony jako wykonany.

Ten plik jest **żywym katalogiem scenariuszy**, a nie protokołem z jednego uruchomienia. Przed każdym wydaniem skopiuj tabelę wyników z końca pliku do osobnego protokołu, np. `docs/release-runs/2026-10-02-staging.md`. Dzięki temu aktualizacja scenariuszy nie kasuje historii odbiorów.

## Zasady utrzymania

1. Każda zmiana zachowania widocznego dla użytkownika, administratora lub operatora wymaga w **tym samym PR** dodania albo aktualizacji odpowiednich scenariuszy. Dotyczy to też nowych endpointów, ról, uprawnień, statusów, maili, flag, płatności i integracji.
2. Sprawdź sąsiednie scenariusze regresyjne: sukces, walidację/błąd, dostęp innej roli lub agencji, odświeżenie strony i trwałość danych. Zmień oczekiwany wynik, gdy zmienił się kontrakt produktu. Nie zostawiaj testu opisującego starą funkcję.
3. Zachowuj stabilne identyfikatory testów. Gdy funkcja znika, oznacz test jako `wycofany` z datą i powodem w historii zmian; nie używaj ponownie jego ID.
4. Testy funkcji ukrytych flagą pozostają w katalogu. W protokole wydania nadaj im `N/D` tylko wtedy, gdy flaga jest wyłączona także dla docelowych użytkowników. Sprawdź wtedy scenariusz ukrycia funkcji. Przy włączeniu flagi wykonaj pełen zestaw modułu.
5. W opisie PR podaj ID dodanych/zmienionych testów albo napisz, dlaczego zmiana nie ma wpływu na ręczny odbiór. Przed wydaniem porównaj katalog z trasami w `apps/web/src/app`, kontrolerami w `apps/api/src` i flagami w `release-flags.service.ts`.

## Jak wykonać odbiór

- **P0**: ścieżka krytyczna, bezpieczeństwo, pieniądze lub utrata danych. Nie wydawaj funkcji z wynikiem `FAIL` albo `BLOCKED`.
- **P1**: podstawowe zachowanie modułu. Napraw przed wydaniem albo zapisz świadomą decyzję i obejście w protokole.
- **P2**: jakość interfejsu i przypadki pomocnicze. Zapisz defekt i decyzję.
- Wyniki: `PASS`, `FAIL`, `BLOCKED`, `N/D` (nie dotyczy, z uzasadnieniem). Puste pole oznacza test niewykonany. **Kod ani test automatyczny nie zastępuje `PASS` na stagingu.**
- Wykonuj na stagingu z migracjami, pocztą testową i sandboxem aktywnej bramki. Nie używaj prawdziwych danych klientów. Zapisz wersję aplikacji, datę, testera, przeglądarkę/urządzenie, stan flag i identyfikatory zamówień/testowych rekordów. W scenariuszach płatności porównuj UI, API/bazę i panel operatora.
- Przygotuj co najmniej: gościa, sprzedającego, agenta Free, agenta płatnego, drugiego agenta z innej agencji, administratora; osobne skrzynki e-mail i oferty w różnych stanach. Miej poprawny, uszkodzony i zbyt duży obraz, dokument testowy oraz dane z polskimi znakami.
- Każdy scenariusz wykonaj na aktualnym Chrome desktop. Krytyczne przepływy (`P0`) powtórz na telefonie w Safari/iOS lub Chrome/Android; przeglądarkę zapisz w protokole. Dla problemów z układem użyj małego ekranu i wolniejszego łącza.

## A. Publiczna strona, katalog i treści

| ID | Priorytet | Kroki | Oczekiwany wynik |
| --- | --- | --- | --- |
| PUB-01 | P1 | Otwórz `/`, menu desktop/mobile, stopkę i `/cennik`; przejdź przez linki. | Linki do istniejących stron działają, cennik odpowiada aktywnej ofercie, nie ma niedostępnych CTA ani błędów w konsoli. |
| PUB-02 | P1 | Otwórz `/oferty`; filtruj po lokalizacji i parametrach, zmieniaj widok listy/mapy i stronę wyników. | Liczba i treść wyników odpowiada filtrom; reset filtrów działa; puste wyniki są czytelne; URL/odświeżenie zachowują stan zgodnie z UI. |
| PUB-03 | P0 | Otwórz opublikowaną ofertę `/oferty/[slug]`, galerię, dane, lokalizację i profil agenta; spróbuj otworzyć ofertę nieopublikowaną. | Publiczne dane są poprawne i zdjęcia się ładują; prywatne dane właściciela nie wyciekają; nieopublikowana oferta nie jest publicznie dostępna. |
| PUB-04 | P0 | Wyślij zapytanie z oferty i profilu agenta, potem niepełny formularz i ponów wysyłkę. | Poprawne zapytanie trafia raz do właściwego odbiorcy, zgody są wymagane, błędy są czytelne, nie powstają duplikaty. |
| PUB-05 | P1 | Zaloguj zwykłego użytkownika, dodaj/usuń ulubioną ofertę i otwórz `/dashboard/profile/favorites`; sprawdź zachowanie jako gość. | Stan ulubionych jest spójny po odświeżeniu; gość otrzymuje właściwą ścieżkę logowania; lista innego konta jest odizolowana. |
| PUB-06 | P1 | Otwórz mapę i ofertę z lokalizacją przybliżoną. | Mapa nie zdradza dokładnego adresu, gdy oferta ma ujawniać tylko obszar; wynik mapy prowadzi do właściwej oferty. |
| PUB-07 | P1 | Otwórz `/blog`, kategorię i artykuł; sprawdź nawigację, grafiki i linki. | Opublikowane treści są widoczne, szkice nie, formatowanie i przejścia działają. |
| PUB-08 | P1 | Otwórz `/regulamin`, `/polityka-prywatnosci`, `/polityka-cookies`, `/zasady-publikacji`; sprawdź linki z formularzy. | Dokumenty są dostępne, zgody prowadzą do właściwych wersji, treść i dane operatora zostały zatwierdzone na wydanie. |
| PUB-09 | P0 | Na świeżej przeglądarce sprawdź baner cookies: odrzuć, zaakceptuj i zmień wybór w ustawieniach; odśwież stronę. | Wybór jest zapisany; analityka opcjonalna uruchamia się tylko po zgodzie; zmiana zgody działa. |
| PUB-10 | P1 | Zgłoś nadużycie z publicznej oferty; wyślij niekompletne zgłoszenie i poprawne. | Walidacja chroni formularz; poprawne zgłoszenie trafia do obsługi, a użytkownik widzi potwierdzenie. |
| PUB-11 | P2 | Otwórz nieistniejący slug/URL, sprawdź telefon, klawiaturę i wolne łącze. | Jest czytelny stan 404/błędu; układ nie zasłania akcji, formularze mają etykiety i widoczny fokus. |

## B. Konto i sesja

| ID | Priorytet | Kroki | Oczekiwany wynik |
| --- | --- | --- | --- |
| AUTH-01 | P0 | Zarejestruj agenta Free i prywatnego sprzedającego na osobnych adresach. | Powstają konta właściwych ról; ekran i dostęp odpowiadają wymogowi weryfikacji e-mail; nie ma dostępu do funkcji chronionych przed potwierdzeniem. |
| AUTH-02 | P0 | Potwierdź e-mail z wiadomości, również na innym urządzeniu; użyj linku drugi raz i linku wygasłego. | Poprawny link działa raz, konto uzyskuje dostęp po logowaniu, błędne linki mają czytelną obsługę i nie tworzą sesji. |
| AUTH-03 | P0 | Poproś o ponowną wysyłkę dla niezweryfikowanego i nieistniejącego adresu; spróbuj wielokrotnie. | Komunikat nie zdradza istnienia konta; działa ograniczenie wysyłki; nowy link zastępuje stary. |
| AUTH-04 | P0 | Zaloguj poprawnie, błędnym hasłem i jako konto niezweryfikowane; odśwież stronę i wyloguj. | Sesja/odmowa dostępu są prawidłowe, odświeżenie działa, wylogowanie zamyka dostęp w przeglądarce. |
| AUTH-05 | P0 | Wykonaj reset hasła; użyj linku ponownie, spróbuj starego hasła i aktywnej sesji na drugim urządzeniu. | Link jest jednorazowy, nowe hasło działa, stare nie; stare sesje zachowują się zgodnie z zatwierdzoną polityką bezpieczeństwa. |
| AUTH-06 | P0 | Otwórz bez logowania chronioną trasę i API; spróbuj zasobu innego konta/agencji. | Serwer odmawia dostępu niezależnie od ukrycia przycisków; nie ujawnia danych innej osoby/agencji. |
| AUTH-07 | P1 | Zmień profil, dane agencji, hasło i preferencje w `/dashboard/settings`; odśwież. | Dane zapisują się, walidacja działa, ustawienia są trwałe; prywatne dane nie trafiają do publicznego profilu bez zamierzonej publikacji. |
| AUTH-08 | P0 | Zleć usunięcie/dezaktywację konta, jeśli jest dostępne w UI; spróbuj zalogować się ponownie. | Pokazany jest zakres skutków, a dostęp i dane są obsłużone zgodnie z aktualną polityką produktu. |

## C. Prywatny sprzedający i publikacja oferty

| ID | Priorytet | Kroki | Oczekiwany wynik |
| --- | --- | --- | --- |
| SEL-01 | P0 | Jako gość wypełnij `/dodaj-oferte`: dane kontaktowe, adres, oferta, zdjęcie, zgody. | Formularz prowadzi przez wszystkie kroki, wymaga pól i zgód, po wysłaniu pokazuje `/dodaj-oferte/sprawdz-email` i wysyła wiadomość. |
| SEL-02 | P0 | Potwierdź e-mail zgłoszenia; przejmij ofertę po rejestracji/logowaniu, także na innym urządzeniu. | Oferta jest powiązana wyłącznie z kontem o uprawnionym adresie; dane i zdjęcia przechodzą do panelu; ponowienie nie tworzy duplikatu. |
| SEL-03 | P0 | Spróbuj przejęcia cudzym kontem, wygasłym/użytym tokenem i bez sesji. | Brak przejęcia i wycieku danych; komunikat pozwala wrócić do właściwej ścieżki. |
| SEL-04 | P1 | W `/seller` otwórz listę, szczegóły i edycję swojej oferty; zmień dane i zdjęcia, odśwież. | Zmiany zapisują się i pokazują w odpowiednim miejscu; status moderacji/publikacji pozostaje zgodny z regułami. |
| SEL-05 | P0 | Zgłoś ofertę do moderacji; jako admin zaakceptuj i odrzuć dwie oferty. | Sprzedający widzi czytelny status; tylko zatwierdzona oferta może przejść do publikacji zgodnie z aktywnym modelem płatności. |
| SEL-06 | P1 | Zakończ/wznów nabór agentów, jeśli funkcja jest włączona; sprawdź ofertę publiczną i panel agenta. | Stan naboru jest spójny we wszystkich widokach, a wyłączony nabór blokuje nowe propozycje. |
| SEL-07 | P1 | Sprawdź statystyki wyświetleń/zapytań, wygaśnięcie i ewentualne odnowienie oferty. | Liczniki i terminy odpowiadają rzeczywistym zdarzeniom; oferta po wygaśnięciu zachowuje się zgodnie z opłaconym uprawnieniem. |
| SEL-08 | P0 | Spróbuj podmienić identyfikator oferty w URL edycji i żądaniach. | Sprzedający nie widzi ani nie zmienia cudzej oferty, zdjęć, płatności lub propozycji agentów. |

## D. Agent: codzienna praca i CRM

| ID | Priorytet | Kroki | Oczekiwany wynik |
| --- | --- | --- | --- |
| CRM-01 | P1 | Na nowym koncie otwórz `/dashboard`, samouczek i checklistę startową; wykonaj sugerowane działania. | Puste stany prowadzą do działających ekranów, postęp utrzymuje się po odświeżeniu, kafelki pokazują dane właściwej agencji. |
| CRM-02 | P0 | Utwórz ofertę w `/dashboard/listings/new`, dodaj lokalizację, cenę, szczegóły i zdjęcia; edytuj ją. | Dane i zdjęcia zapisują się; walidacja cen, pól wymaganych i lokalizacji działa; po odświeżeniu jest właściwy stan. |
| CRM-03 | P0 | Opublikuj ofertę, otwórz jej publiczny slug, potem wstrzymaj/wycofaj publikację. | Publiczny status zmienia się zgodnie z panelem; wycofana oferta znika z katalogu i nie ujawnia prywatnych danych. |
| CRM-04 | P1 | Na liście ofert użyj wyszukiwania, filtrów, sortowania, stronicowania i widoku szczegółów; sprawdź działania zbiorcze, jeśli dostępne. | Widoki zgadzają się z danymi, a operacje dotyczą tylko zaznaczonych rekordów. |
| CRM-05 | P1 | Dodaj dokument do oferty, pobierz go i usuń; otwórz raport dla właściciela i kod QR, jeśli widoczne. | Dokument i raport należą do właściwej oferty; pobranie/QR prowadzą do poprawnych zasobów; dostęp jest ograniczony. |
| CRM-06 | P0 | Wyślij zapytanie z publicznej oferty; otwórz `/dashboard/inquiries`, przypisz/obsłuż lead i przejdź do klienta. | Zapytanie trafia do właściwego agenta, licznik i status są spójne, dane klienta nie są dublowane bez potrzeby. |
| CRM-07 | P1 | Utwórz klienta, edytuj dane, notatki i preferencje; sprawdź filtrowanie oraz import CSV, jeśli dostępny. | Dane są trwałe; niepoprawny CSV daje czytelny błąd; rekordy i notatki są widoczne tylko w uprawnionej agencji. |
| CRM-08 | P1 | Utwórz spotkanie w kalendarzu, powiąż z klientem/ofertą, zmień termin i status, usuń. | Kalendarz i szczegóły pokazują te same dane; terminy/strefa czasu są prawidłowe; powiązania działają. |
| CRM-09 | P1 | Utwórz zadanie, ustaw termin/priorytet, powiąż z klientem/ofertą/transakcją i oznacz wykonanie. | Lista, liczniki i powiązane widoki aktualizują się po odświeżeniu; nie ma cudzych zadań. |
| CRM-10 | P1 | Utwórz transakcję, zmień etap, uzupełnij checklistę i zadania; obejrzyj historię. | Etap, historia i powiązania są spójne; walidacja blokuje niedozwolone zmiany. |
| CRM-11 | P1 | Otwórz `/dashboard/reports`, zmień okres/filtry i porównaj kilka liczb z ofertami, leadami i transakcjami. | Raporty liczą dane właściwej agencji i okresu; brak danych ma czytelny stan; eksport, jeśli jest dostępny, odpowiada filtrom. |
| CRM-12 | P1 | Użyj wyszukiwania globalnego, powiadomień, oznacz powiadomienie jako przeczytane i zmień preferencje. | Wyniki i powiadomienia prowadzą do właściwych rekordów; licznik i preferencje zachowują się spójnie. |
| CRM-13 | P1 | Sprawdź limity konta Free: oferty, klienci/użytkownicy i funkcje premium; spróbuj przekroczyć limit także przez API. | Serwer egzekwuje limity, UI wyjaśnia odmowę i prowadzi do planów; odrzucona akcja nie zapisuje częściowych danych. |
| CRM-14 | P1 | Zmień plan w dół przy przekroczonych limitach, jeśli ten przepływ jest udostępniony; sprawdź aktywne dane i komunikat. | Dane nie znikają bez decyzji użytkownika; ograniczenia i okres przejściowy odpowiadają zatwierdzonym regułom. |
| CRM-15 | P1 | Na dashboardzie sprawdź podpowiedź/insight, przejdź przez jej CTA, ukryj ją i przywróć w ustawieniach. | CTA otwiera właściwy rekord; ukrycie i przywrócenie utrzymują się po odświeżeniu i dotyczą tylko bieżącego konta. |
| CRM-16 | P1 | Dla klienta z preferencjami sprawdź dopasowane oferty, zmień preferencje i ponów wyszukiwanie. | Wyniki odpowiadają aktualnym kryteriom, nie zawierają niedostępnych ofert i nie pokazują danych obcej agencji. |
| CRM-17 | P1 | Otwórz szablon wiadomości przy leadzie/kliencie, wypełnij kontekst i skopiuj treść. | Podstawiane dane należą do właściwego rekordu; brakujące pola nie pozostawiają surowych znaczników; skopiowany tekst odpowiada podglądowi. |

## E. Współpraca sprzedającego z agentem — flaga marketplace

Wykonaj cały moduł, gdy `agentListingMarketplaceEnabled=true`. Przy fladze wyłączonej wykonaj `MKT-00`.

| ID | Priorytet | Kroki | Oczekiwany wynik |
| --- | --- | --- | --- |
| MKT-00 | P0 | Wyłącz flagę; sprawdź menu, publiczną ofertę i bezpośrednie URL/API rynku oraz propozycji. | Funkcja nie jest oferowana, a serwer nie pozwala użyć wyłączonego przepływu. |
| MKT-01 | P1 | Włącz flagę; jako agent otwórz `/dashboard/agent-market`, filtruj oferty szukające agenta i szczegóły. | Widoczne są tylko kwalifikujące się oferty i dozwolone dane kontaktowe. |
| MKT-02 | P0 | Wyślij i edytuj propozycję dla oferty; wyślij niepełne dane oraz próbę duplikatu. | Poprawna propozycja pojawia się u obu stron; walidacja i reguły duplikatów działają. |
| MKT-03 | P0 | Jako sprzedający obejrzyj propozycje, prowadź rozmowę i zaakceptuj jedną/odrzuć drugą. | Statusy i wiadomości są spójne; inni agenci nie widzą rozmowy; decyzje dają właściwe powiadomienia. |
| MKT-04 | P0 | Po akceptacji otwórz `/dashboard/agent-assignments` i kopię oferty w CRM; sprawdź relację ze źródłem. | Współpraca i kopia powstają raz, mają właściwe dane i ograniczenia edycji. |
| MKT-05 | P1 | Zakończ nabór lub wyłącz flagę po rozpoczęciu rozmowy; spróbuj nowej propozycji. | Nowe akcje są zablokowane według reguł, istniejące dane nie znikają ani nie wyciekają. |

## F. Cennik, abonament i płatności

Wykonaj scenariusze dla **aktualnie wdrożonego operatora**. Obecnie publiczny checkout jest wyłączony, a integracja Tpay jest wdrażana etapami; scenariusze wymagające rzeczywistej płatności oznaczaj jako Blocked do czasu jej bezpiecznego udostępnienia. [Plan polskich bramek](POLSKIE_BRAMKI_PLATNOSCI_BLIK_PLAN.md) i [plan Tpay](tpay-integration-plan.md) opisują docelowy zakres, nie dostępne już funkcje aplikacji.

| ID | Priorytet | Kroki | Oczekiwany wynik |
| --- | --- | --- | --- |
| PAY-01 | P0 | Porównaj `/cennik`, `/dashboard/upgrade`, produkty w adminie i wycenę API dla planu/oferty/promocji. | Nazwa, czas, cena brutto w PLN, rabat i warunki są zgodne; kwota nie może być zmieniona przez klienta. |
| PAY-02 | P0 | Kup plan agencji w sandboxie; wróć na stronę przed webhookiem i po webhooku. | Sam powrót nie aktywuje planu; potwierdzona płatność nadaje właściwy plan dokładnie raz; stan UI, bazy i operatora jest zgodny. |
| PAY-03 | P0 | Anuluj checkout planu, doprowadź do nieudanej płatności i ponów próbę. | Nie powstaje płatne uprawnienie bez opłaty; użytkownik może bezpiecznie ponowić zgodnie z regułami. |
| PAY-04 | P0 | Zasymuluj odnowienie, nieudaną kolejną płatność, anulowanie i zmianę abonamentu. | Dostęp, termin i status odpowiadają rzeczywistemu cyklowi rozliczeń; brak potwierdzonej obsługi któregokolwiek stanu blokuje publiczne abonamenty. |
| PAY-05 | P0 | Jako sprzedający kup publikację oferty, następnie promocję, jeśli włączona; wróć przed webhookiem i po nim. | Tylko potwierdzona płatność aktywuje odpowiednie uprawnienie, czas i widoczność; jedna płatność nie nadaje go dwa razy. |
| PAY-06 | P0 | Anuluj/odrzuć płatność za ofertę, powtórz checkout i sprawdź próbę wygasłą. | Oferta nie dostaje uprawnienia bez płatności; retry nie tworzy niespójnych zamówień lub podwójnej aktywacji. |
| PAY-07 | P0 | W sandboxie ponów i opóźnij webhook, wyślij błędny podpis i rozbieżną kwotę/walutę. | Duplikat jest idempotentny; nieprawidłowe zdarzenie jest odrzucone i nie nadaje planu/publikacji. |
| PAY-08 | P0 | Spróbuj użyć cudzego `quoteId`, zamówienia, sesji płatności i URL powrotu. | Nie można opłacić/odczytać ani aktywować cudzego zasobu; powrót z checkoutu nie stanowi dowodu płatności. |
| PAY-09 | P1 | Wyłącz kolejno flagi `privateListingPricingEnabled`, `privateListingCheckoutEnabled`, `privateListingFeaturedEnabled`, `privateListingPromotionsEnabled`. | Ukryte produkty nie są obiecywane w UI, a API nie pozwala kupić wyłączonej funkcji. |
| PAY-10 | P0 | Sprawdź płatność opłaconą bez uprawnienia i uprawnienie bez potwierdzonej płatności w monitoringu/rekoncyliacji. | Obie rozbieżności są wykrywane, mają ślad i procedurę naprawy; nie pozostają niezauważone. |
| PAY-11 | P0 | Podczas etapu PAY-011 spróbuj rozpocząć zakup ogłoszenia i planu PRO jako uprawniony użytkownik; sprawdź też istniejące zamówienie, wyceny ogłoszenia i planu, konto bez uprawnienia oraz flagi sprzedaży ogłoszeń. Porównaj liczbę zamówień, prób i uprawnień przed/po teście. Szczegóły: [MT-016](payments/MANUAL_TESTS.md#mt-016--tymczasowa-niedostępność-checkoutu-pay-011). | Oba checkouty pokazują jasny komunikat i zwracają `503 PAYMENTS_UNAVAILABLE`; nie ma redirectu do Stripe, nowego zamówienia, próby ani uprawnienia. Odczyty i dotychczasowe dostępy działają, role i flagi nie omijają blokady. |
| PAY-12 | P0 | Po usunięciu backendowych adapterów Stripe uruchom API; otwórz jako właściciel ogłoszenie oraz panel agencji, sprawdź istniejące uprawnienia i spróbuj rozpocząć obie płatności. Sprawdź, że dawne adresy webhooków Stripe nie są zarejestrowane. Powtórz kontrolę dla konta bez uprawnień i przy używanych flagach sprzedaży. | Strony i dotychczasowe dane działają, checkout nadal zwraca `503 PAYMENTS_UNAVAILABLE`, a dawne webhooki Stripe są niedostępne. Żadna próba, zamówienie ani uprawnienie nie powstaje wskutek próby zakupu; role i flagi nie omijają blokady. |
| PAY-13 | P0 | Otwórz rejestrację z płatnym planem, `/dashboard/upgrade`, zakup ogłoszenia i edycję katalogu planów w adminie; sprawdź role, flagi oraz stan konta, zamówień i uprawnień. Szczegóły: [MT-017](payments/MANUAL_TESTS.md#mt-017--frontend-bez-stripe-podczas-wstrzymanych-płatności-pay-013). | Frontend nie pokazuje marki ani pól konfiguracyjnych Stripe i nigdzie nie przekierowuje do operatora. Niedostępność płatności jest jasna, konto można utworzyć bez płatnego uprawnienia, istniejące dane pozostają dostępne, role i flagi nie omijają blokady. |
| PAY-14 | P0 | Po migracji uruchom ponownie API, następnie sprawdź panel, wycenę planu, ogłoszenie, oba checkouty, edycję planu, role, flagi i stan danych. Szczegóły: [MT-018](payments/MANUAL_TESTS.md#mt-018--aplikacja-po-usunięciu-sdk-i-kolumn-stripe-pay-014). | API i web działają bez Stripe; wycena planu nie zwraca HTTP 500, a dwa checkouty nadal informują o niedostępności bez przekierowania i nowych prób. Usunięto tylko puste kolumny Stripe, a dotychczasowe dane, plan i uprawnienia pozostały. |
| PAY-15 | P0 | Uruchom API z konfiguracją Sandbox według [kontroli PAY-015](payments/MANUAL_TESTS.md#kontrola-konfiguracji-api--pay-015), sprawdź log startowy i zwykłe ekrany; błędną konfigurację sprawdź testem z fikcyjnymi sekretami. | Poprawna konfiguracja pozwala wystartować, brak sekretu lub nieznany provider blokuje start bez ujawnienia wartości. Checkout nadal jest niedostępny; dane, role i flagi wydania pozostają bez zmian. |
| PAY-16 | P0 | Wykonaj [kontrolę klienta OAuth PAY-016](payments/MANUAL_TESTS.md#kontrola-klienta-oauth--pay-016) z Sandbox; sprawdź wynik i czas ważności bez pokazywania tokenu. Błędy 401, timeout, cache i równoległe odświeżenie sprawdź jednostkowo; potwierdź brak zmian uprawnień, danych i checkoutu przy obowiązujących rolach i flagach. | Nowy klient pobiera token tylko na żądanie, nie ujawnia danych w logach i nie wywołuje transakcji. Checkout nadal pokazuje niedostępność; istniejące dane i role pozostają bez zmian. |
| PAY-21 | P0 | Wykonaj [MT-021](payments/MANUAL_TESTS.md#mt-021--powiązanie-ogłoszenia-z-lokalną-płatnością-pay-021): jako właściciel ogłoszenia sprawdź komunikat niedostępności, a developer na odizolowanej bazie sprawdza kwotę z zamówienia, korelację z próbą, ponowienie i blokadę drugiej aktywnej próby. Sprawdź niezweryfikowany e-mail, obce konto i flagi. | Publiczny checkout nadal zwraca `503 PAYMENTS_UNAVAILABLE` i nie tworzy płatności. Wewnętrzny zapis ma najwyżej jedną aktywną płatność na zamówienie, bez transakcji operatora i uprawnienia; baza robocza pozostaje bez zmian. Krok nowego statusu oczekiwania w panelu jest zablokowany do włączenia checkoutu. |
| PAY-23 | P0 | Jako właściciel ogłoszenia sprawdź [MT-002](payments/MANUAL_TESTS.md#mt-002--utworzenie-testowej-transakcji): poprawny i obcy host checkoutu, powrót z parametrem `payment_return=1` oraz `success=1`, odświeżenie statusu zamówienia, konto bez dostępu do ogłoszenia i warianty flag sprzedaży. Przy wyłączonym checkoutcie sprawdź komunikat o niedostępności; pełny powrót z Tpay oznacz jako Blocked. | Tylko HTTPS i host Tpay wybranego środowiska mogą służyć do przekierowania. Parametr powrotu nie nadaje uprawnienia; stan „Sprawdzamy wynik płatności” wymaga zamówienia `pending_payment` odczytanego przez uprawnionego właściciela z API. Po odświeżeniu nadal obowiązuje status serwera. Obcy użytkownik i flagi nie obchodzą blokady `PAYMENTS_UNAVAILABLE`; dotychczasowe dane pozostają bez zmian. |
| PAY-24 | P0 | Wykonaj [MT-004](payments/MANUAL_TESTS.md#mt-004--nieudana-lub-anulowana-płatność-blik): przerwij płatność przed zatwierdzeniem, sprawdź pewną odmowę, timeout i spóźniony sukces. Porównaj status operatora, zamówienia, lokalnej płatności i uprawnienia; sprawdź anulowanie po wcześniejszej zapłacie oraz powtórzony odczyt statusu. Powtórz próbę bez uprawnień i przy używanych flagach. Jeśli checkout/strona Sandbox są niedostępne, oznacz część operatora jako Blocked. | Odmowa nie aktywuje ogłoszenia. `unknown` nie tworzy drugiej transakcji i nie wygasa jako odmowa. Powrót z anulowania nie cofa zapłaty. Zweryfikowany spóźniony sukces zapisuje zapłatę i uprawnienie raz; odświeżenie, restart, role i flagi nie obchodzą reguł. Przy wyłączonym checkoutcie brak nowych prób i zmian w danych roboczych. |
| PAY-26 | P0 | Wykonaj [MT-006](payments/MANUAL_TESTS.md#mt-006--niepoprawny-podpis-webhooka) na lokalnym API: wyślij form body z brakującym i błędnym JWS bez sesji użytkownika, sprawdź 4xx, brak przekierowania, bezpieczny log i liczniki danych przed/po. Poprawne ACK `200 TRUE` sprawdź na podpisanej lokalnej fixture z pasującą płatnością i możliwą realizacją; powtórz kontrolę przy obowiązujących flagach checkoutu. | Endpoint jest publiczny dla Tpay, ale bez poprawnego podpisu nie wykonuje żadnej zmiany. Po PAY-028 poprawny podpis sam nie wystarcza do ACK: zdarzenie musi być trwale zapisane, a wymagana realizacja zakończona. Role i flagi nie omijają JWS; checkout pozostaje wyłączony. Nie kieruj powiadomień produkcyjnych na endpoint, dopóki robocza baza i obsługa wszystkich włączonych typów płatności nie są gotowe. |
| PAY-27 | P0 | Wykonaj [MT-005](payments/MANUAL_TESTS.md#mt-005--powtórzony-webhook) na bezpiecznej podpisanej fixture: wyślij tę samą notyfikację dwa razy, porównaj `payment_events`, stan płatności i uprawnień przed/po; sprawdź starsze zdarzenie oraz awarię zapisu. Powtórz bez sesji użytkownika i przy wyłączonym checkoutcie. Jeśli brak płatności lub fixture, oznacz ręczną część jako Blocked. | Oba identyczne dostarczenia dostają ACK dopiero po trwałym zapisie; unikatowy klucz pozostawia jeden rekord. Awaria bazy nie dostaje `TRUE`, starsze zdarzenie nie cofa opłaconej płatności. Ledger sam nie nadaje uprawnienia; role i flagi nie obchodzą podpisu ani blokady checkoutu. |
| PAY-28 | P0 | Wykonaj [MT-003](payments/MANUAL_TESTS.md#mt-003--udana-płatność-blik-za-ogłoszenie) wyłącznie przy dostępnych checkoutcie Sandbox, stronie płatności i tabelach płatności. Jako właściciel opłać testowe ogłoszenie BLIK; porównaj wynik w panelu Tpay, `Payment`, `payment_events`, zamówieniu i uprawnieniach przed powrotem oraz po webhooku. Powtórz podpisany webhook. Developer osobno sprawdza odrzucenie obcego merchant ID, `tr_id`, `tr_crc`, kwoty lub waluty oraz rollback przy błędzie realizacji. Sprawdź cudze konto, brak sesji i używane flagi sprzedaży; przy wyłączonym checkoutcie oznacz MT-003 jako Blocked. | Sam URL powrotu niczego nie aktywuje. Dopiero zweryfikowana, zgodna notyfikacja zapisuje zdarzenie i atomowo potwierdza płatność, zamówienie oraz jedno uprawnienie na pozycję. Duplikat nie nadaje ponownie; niezgodność i awaria realizacji nie dają `TRUE` ani częściowej aktywacji. Role i flagi nie omijają podpisu ani blokady checkoutu; wcześniejsze uprawnienia pozostają bez zmian. |
| PAY-29 | P0 | Powtórz [MT-004](payments/MANUAL_TESTS.md#mt-004--nieudana-lub-anulowana-płatność-blik), [MT-005](payments/MANUAL_TESTS.md#mt-005--powtórzony-webhook) i [MT-006](payments/MANUAL_TESTS.md#mt-006--niepoprawny-podpis-webhooka) na bezpiecznej płatności Sandbox. Porównaj dane przed/po dla nieznanego ID, niedopłaty, błędnego podpisu, ponowionej notyfikacji i opóźnionego sukcesu. Sprawdź bezpieczny kod alertu, brak surowych danych w logu, rolę właściciela oraz bieżące flagi sprzedaży. Przy wyłączonym checkoutcie, HTTP 403 strony Sandbox lub braku tabel w roboczej bazie oznacz zależne kroki jako Blocked. | Nieznane ID, błędny podpis i niezgodna kwota nie potwierdzają płatności ani nie aktywują ogłoszenia. Duplikat i spóźniony zweryfikowany sukces realizują najwyżej raz. Niepowodzenie realizacji nie dostaje `TRUE`; alert nie zawiera body, sekretów ani tokenów. Role i flagi nie obchodzą weryfikacji, istniejące uprawnienia i dane pozostają zachowane. |
| PAY-30 | P0 | Wykonaj [MT-015](payments/MANUAL_TESTS.md#mt-015--zwrot-płatności) tylko na istniejącej opłaconej transakcji Sandbox, gdy dostępny będzie uprawniony proces administracyjny. Sprawdź pełny i częściowy zwrot, błędną kwotę, pewną odmowę, timeout, ponowienie po `unknown`, rolę bez uprawnienia i obowiązujące flagi. Porównaj żądanie w panelu Tpay oraz lokalną płatność i uprawnienie przed/po. Bez opłaconej transakcji lub procesu UI oznacz MT-015 jako Blocked. | Żądanie zaakceptowane przez Tpay jest `pending`, nie potwierdzonym zwrotem; 4xx jest odmową, a timeout/niejednoznaczność pozostaje `unknown` bez automatycznego drugiego POST w bieżącym procesie. PAY-030 nie zmienia uprawnienia ani danych płatności. Trwała ochrona po restarcie, role, flagi i korekta uprawnienia wymagają dalszych zadań; nie ogłaszaj gotowości zwrotów po samym teście adaptera. |
| PAY-31 | P0 | Powtórz [MT-015](payments/MANUAL_TESTS.md#mt-015--zwrot-płatności) wyłącznie na opłaconej płatności Sandbox; porównaj historię zamówienia i rekord `Refund` przed/po pełnym lub częściowym żądaniu. Sprawdź tę samą intencję po restarcie, równoległe żądania, nadmierną kwotę, timeout, odczyt statusu operatora oraz rolę bez uprawnienia i używane flagi. Jeśli nie ma opłaconej płatności lub akcji UI, oznacz kroki ręczne jako Blocked. | Unikatowa intencja i kwota są trwałe przed POST; duplikat lub `unknown` nie wysyłają drugiego zwrotu po restarcie. Zaakceptowany POST jest `pending`, a tylko zgodny, sprawdzony status operatora oznacza zakończenie. Suma częściowych zwrotów nie przekracza płatności. Checkout, role i flagi pozostają bez zmian; PAY-031 nie koryguje zamówienia ani uprawnienia bez decyzji produktu. |
| PAY-32 | P0 | Wykonaj [MT-015](payments/MANUAL_TESTS.md#mt-015--zwrot-płatności) przez kontrolowany endpoint administracyjny wyłącznie dla istniejącej opłaconej płatności Sandbox. Sprawdź administratora z jawnym `listing_commerce:manage_refunds`, administratora bez tego uprawnienia, zwykłego użytkownika i brak sesji. Sprawdź obcy lub nieopłacony `paymentId`, nieprawidłową kwotę i ponowienie tej samej intencji po restarcie oraz po wyniku `unknown`. Porównaj zapis aktora, liczbę żądań do operatora, historię zamówienia, uprawnienie ogłoszenia i wyłączony checkout. Bez opłaconej transakcji oznacz wykonanie zwrotu w Sandbox jako Blocked; autoryzację sprawdź osobno na izolowanych danych. | Tylko administrator z jawnym uprawnieniem może rozpocząć zwrot. Odrzucone żądanie nie tworzy `Refund` ani żądania do Tpay. Duplikat zwraca istniejący stan bez drugiego POST, również po restarcie i `unknown`; pierwszy aktor jest zapisany w intencji. Przyjęcie POST pozostawia zwrot `pending`. Status zamówienia i uprawnienie nie zmieniają się automatycznie, a publiczny checkout pozostaje wyłączony. |

## G. Administracja, CMS i feedback

| ID | Priorytet | Kroki | Oczekiwany wynik |
| --- | --- | --- | --- |
| ADM-01 | P0 | Zaloguj administratora i zwykłego agenta; otwórz trasy `/dashboard/admin/*` i wywołaj chronione API. | Tylko uprawniony administrator ma dostęp; agent nie widzi danych ani nie wykonuje operacji admina. |
| ADM-02 | P0 | W `/dashboard/admin/submissions` przejrzyj, zaakceptuj i odrzuć zgłoszenia. | Decyzje są trwałe, status sprzedającego i publiczna widoczność aktualizują się prawidłowo, historia wskazuje operatora. |
| ADM-03 | P1 | Zmień plan, uprawnienia i promocję planu w adminie; sprawdź daty, limity i ponowną wycenę. | Nowa konfiguracja działa od właściwego momentu; stare zamówienia i kwoty nie zmieniają się wstecz. |
| ADM-04 | P1 | Edytuj produkty/promocje ogłoszeń, aktywuj/dezaktywuj je i sprawdź `/cennik` oraz checkout. | Tylko aktywne produkty są oferowane; wycena serwera i treść sprzedażowa pozostają zgodne. |
| ADM-05 | P1 | Utwórz szkic wpisu bloga, ustaw kategorię, podgląd, opublikuj i wycofaj. | Szkic nie jest publiczny; opublikowany wpis i kategoria są dostępne; wycofanie działa. |
| ADM-06 | P1 | Wyślij feedback jako gość i zalogowany; jako admin zmień status i opublikuj ideę/ankietę. | Zgłoszenia trafiają do panelu bez ujawniania danych prywatnych; statusy i widoczność odpowiadają decyzji admina. |
| ADM-07 | P1 | Zagłosuj na ideę, cofnij głos, odpowiedz na ankietę; sprawdź `/dashboard/feedback/*` i `/feedback`. | Wynik jest trwały, jeden użytkownik nie dubluje głosu, ankieta respektuje uprawnienia i limity. |
| ADM-08 | P1 | Otwórz `/dashboard/admin/analytics`, zmień okres i porównaj liczniki ze zdarzeniami testowymi. | Dane pojawiają się po właściwych akcjach; brak zgody na analitykę opcjonalną jest respektowany. |

## H. Integracje, bezpieczeństwo i gotowość środowiska

| ID | Priorytet | Kroki | Oczekiwany wynik |
| --- | --- | --- | --- |
| OPS-01 | P0 | Wyślij każdy typ maila używany w odbieranych przepływach: konto, reset, zgłoszenie oferty, lead, płatność/powiadomienie, jeśli skonfigurowane. | Wiadomości dochodzą na testową skrzynkę, linki prowadzą na staging, nie zawierają sekretów ani błędnych domen. |
| OPS-02 | P0 | Dodaj zdjęcie i dokument; pobierz po odświeżeniu, restarcie API/Web i ponownym wdrożeniu na stagingu. | Pliki są trwałe, uprawnienia do odczytu działają, brak zgubionych zasobów. |
| OPS-03 | P0 | Prześlij plik z fałszywym MIME, uszkodzony obraz, plik ponad limit i niedozwolony dokument. | Serwer odrzuca plik czytelnym błędem, nie zapisuje go jako poprawnego ani nie blokuje aplikacji. |
| OPS-04 | P0 | Sprawdź HTTPS, cookies sesji, CORS/CSRF oraz próbę wywołania API z obcej domeny i bez wymaganych zabezpieczeń. | Chronione żądania są odrzucone, cookies mają właściwe atrybuty, nie ma publicznych sekretów/stack trace. |
| OPS-05 | P0 | Zasymuluj serię logowań, resendów, leadów i uploadów z jednego IP; sprawdź nagłówek podszywający się pod inne IP. | Limity działają za docelowym proxy; podszyty nagłówek nie omija ochrony. |
| OPS-06 | P0 | Sprawdź `health`, błędy 5xx, nieudane maile/webhooki i alerty. | Monitoring wykrywa awarię, ma właściciela i pozwala znaleźć zdarzenie bez ujawniania danych wrażliwych. |
| OPS-07 | P0 | Odtwórz backup bazy i plików na odrębnym środowisku; uruchom najnowsze migracje. | Dane są spójne i aplikacja startuje; czas i wynik odtworzenia są zapisane w protokole. |
| OPS-08 | P1 | Sprawdź kluczowe ścieżki na telefonie i wolnym łączu: rejestracja, oferta, wizard, seller, agent, płatność. | Formularze i CTA są dostępne, błędy czytelne, nie ma utraty danych przy przejściu między krokami. |

## Bramka wydania i protokół

Przed decyzją o wydaniu wykonaj przynajmniej komplet aktywnych `P0`, wszystkie `P1` dla modułów udostępnianych użytkownikom oraz test ukrycia dla modułów wyłączonych flagą. Otwarty defekt `P0` oznacza **NO-GO**. Dla `P1` zapisz decyzję i właściciela poprawki. Pozostałe przypadki `N/D` muszą mieć powód i konfigurację flag. Powtórz dotknięte testy po każdej poprawce.

Szablon pojedynczego przebiegu (skopiuj do `docs/release-runs/<data>-<środowisko>.md`):

```md
# Odbiór wydania
- Wersja/commit:
- Data i tester:
- Środowisko, URL, migracje, operator płatności i poczta:
- Przeglądarki/urządzenia:
- Flagi i plany/produkty aktywne:
- Konta i rekordy testowe (bez haseł, tokenów i danych osobowych):

| ID | Wynik: PASS/FAIL/BLOCKED/N/D | Dowód/link do defektu lub powód N/D | Tester i data |
| --- | --- | --- | --- |
| <ID scenariusza> |  |  |  |

- Nierozwiązane defekty i obejścia:
- Decyzja GO/NO-GO, osoba zatwierdzająca, data:
```

## Powiązane plany szczegółowe

- [Plan E2E freemium](FREEMIUM_SPRINT_7_E2E_TEST_PLAN.md) — starsze scenariusze; aktualne zachowanie konta zawsze weryfikuj z kodem i `AUTH-*`.
- [Marketplace agentów — lista regresji](AGENT_LISTING_TAKEOVER_MARKETPLACE_PLAN.md#12-manualna-lista-testow-regresji-przed-rolloutem) — rozwinięcie `MKT-*`.
- [Gotowość produkcyjna](ANALIZA_GOTOWOSCI_PRODUKCYJNEJ_2026-09-26.md) — ryzyka i warunki uruchomienia.
- [Plan polskich bramek](POLSKIE_BRAMKI_PLATNOSCI_BLIK_PLAN.md) — do uwzględnienia po wdrożeniu nowego operatora.

## Historia zmian katalogu

| Data | Zmiana |
| --- | --- |
| 2026-10-02 | Utworzono katalog scenariuszy dla aktualnych modułów i szablon protokołu wydania. |
