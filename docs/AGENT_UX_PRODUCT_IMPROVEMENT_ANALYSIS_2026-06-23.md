# Analiza usprawnień UX i produktu dla agentów - 2026-06-23

Cel dokumentu: wskazać, co jeszcze warto usprawnić w EstateFlow, aby aplikacja
była bardziej użyteczna, przyjemna i atrakcyjna dla agentów nieruchomości. To
nie jest pełny backlog techniczny, tylko priorytety produktowe z perspektywy
codziennej pracy agenta.

## Executive summary

EstateFlow ma już solidny fundament: oferty, CRM klientów, kalendarz, publiczne
oferty, leady, raporty, limity planów, dokumenty i część flow prywatnego
sprzedającego. Największa szansa produktowa nie polega teraz na dodaniu kolejnej
dużej sekcji, ale na połączeniu istniejących modułów w bardziej spójne centrum
pracy agenta.

Agent powinien po wejściu do panelu natychmiast wiedzieć:

- co wymaga działania dzisiaj,
- które leady mogą ostygnąć,
- które oferty mają ryzyko stagnacji,
- co blokuje transakcję,
- jaki następny krok warto wykonać.

Największą wartość dla użytkownika dadzą funkcje, które skracają czas reakcji,
zmniejszają liczbę rzeczy do zapamiętania i pomagają agentowi zarobić więcej
bez ręcznego prowadzenia Excela, notatek i komunikatorów.

## Główne obserwacje

### 1. Aplikacja ma dużo danych, ale potrzebuje mocniejszego "next best action"

Obecnie moduły są użyteczne osobno: oferty, klienci, spotkania, zapytania,
raporty. Agent potrzebuje jednak widoku operacyjnego, który odpowiada na pytanie
"co mam zrobić teraz?".

Rekomendacja:

- dodać panel `Dzisiaj` / `Do zrobienia`,
- pokazywać alerty operacyjne:
  - nowe leady bez kontaktu,
  - spotkania dzisiaj,
  - spotkania zakończone bez follow-upu,
  - oferty aktywne bez zdjęć / ceny / prowizji,
  - dokumenty wymagające uzupełnienia,
  - transakcje z terminem w najbliższych dniach.

Efekt dla użytkownika:

- mniej chaosu,
- szybsza reakcja na leady,
- większe poczucie, że aplikacja prowadzi pracę agenta.

### 2. Widoki szczegółów powinny być bardziej kontekstowe

Widoki szczegółowe powinny zawsze pokazywać powiązania i akcje. Przykład:
spotkanie powinno pokazywać klienta, ofertę, adres, telefon, email, notatki i
szybkie akcje kontaktu. Podobnie oferta powinna pokazywać powiązane spotkania,
leady, dokumenty, aktywność i transakcje.

Rekomendacja:

- ujednolicić wzorzec "detail page" dla:
  - oferty,
  - klienta,
  - spotkania,
  - zapytania,
  - transakcji,
- każda strona szczegółów powinna mieć:
  - header z najważniejszym statusem,
  - szybkie akcje,
  - powiązane encje,
  - timeline aktywności,
  - sekcję "następny krok".

Efekt:

- użytkownik mniej klika między modułami,
- szybciej rozumie kontekst sprawy,
- aplikacja staje się bardziej "agent workflow OS" niż zwykłym CRM.

### 3. CRM klientów powinien mocniej wspierać sprzedaż, nie tylko przechowywać dane

Klient w CRM powinien mieć status, preferencje, historię kontaktu i sugestie
ofert. Obecny CRM jest dobrym fundamentem, ale największą wartość da dopasowanie
klientów do ofert i pilnowanie follow-upów.

Rekomendacja:

- dodać sekcję `Pasujące oferty` na profilu klienta,
- dodać sekcję `Pasujący klienci` na stronie oferty,
- dodać szybkie akcje:
  - zaproponuj ofertę klientowi,
  - zaplanuj prezentację,
  - oznacz zainteresowanie,
  - odrzuć jako niedopasowane,
- dodać prosty scoring dopasowania:
  - miasto/dzielnica,
  - typ nieruchomości,
  - budżet,
  - metraż,
  - pokoje,
  - typ transakcji.

Efekt:

- agent widzi, komu może wysłać ofertę,
- nowe oferty szybciej trafiają do właściwych klientów,
- aplikacja daje realną wartość sprzedażową.

### 4. Follow-up po spotkaniu to bardzo mocny quick win

Po prezentacji mieszkania agent zwykle musi wykonać kilka powtarzalnych działań:
zadzwonić do klienta, zebrać feedback, odpisać właścicielowi, zaproponować kolejną
ofertę, zaktualizować status.

Rekomendacja:

- po spotkaniu pokazywać CTA `Dodaj follow-up`,
- automatycznie tworzyć zadanie follow-up po spotkaniu typu `Prezentacja`,
- dodać prosty formularz feedbacku po spotkaniu:
  - zainteresowany / niezainteresowany / do namysłu,
  - powód,
  - następna akcja,
  - data kolejnego kontaktu,
- dodać szablony wiadomości po prezentacji.

Efekt:

- mniej utraconych leadów,
- większa systematyczność pracy,
- agent czuje, że aplikacja realnie pomaga w sprzedaży.

### 5. Raporty powinny przejść z "statystyk" do "decyzji"

Raporty są wartościowe, ale dla agenta najważniejsze są wnioski:

- które źródło leadów działa,
- które oferty stoją zbyt długo,
- jaki typ nieruchomości najlepiej konwertuje,
- gdzie tracę klientów,
- ile potencjalnej prowizji jest w pipeline.

Rekomendacja:

- dodać sekcję `Insight dnia/tygodnia`,
- dodać interpretacje metryk:
  - "Najwięcej spotkań masz dla mieszkań, ale najwięcej zamknięć dla domów",
  - "3 aktywne oferty nie miały aktywności od 14 dni",
  - "Leady z formularza publicznego konwertują lepiej niż ręczne kontakty",
- dodać customowe raporty, opisane w osobnym planie sprintów.

Efekt:

- raporty stają się argumentem sprzedażowym dla planów premium,
- użytkownik wraca, bo widzi praktyczne wnioski, nie tylko liczby.

### 6. Publiczna prezentacja agenta i ofert może być silnym growth loopiem

Agent chce wyglądać profesjonalnie przed klientem. Publiczny profil, oferta,
QR i formularze leadowe to dobry kierunek. Warto go rozbudować o funkcje, które
agent może pokazać właścicielowi nieruchomości.

Rekomendacja:

- raport dla właściciela oferty:
  - liczba wyświetleń,
  - liczba zapytań,
  - liczba prezentacji,
  - status działań,
  - rekomendacje agenta,
- publiczny/udostępniany link `Raport oferty dla właściciela`,
- PDF / share link do podsumowania działań,
- branded profile agenta w planie premium.

Efekt:

- agent ma argument przy pozyskiwaniu ofert,
- właściciel widzi pracę agenta,
- EstateFlow staje się narzędziem do budowania zaufania.

## Priorytetowe usprawnienia UX

### P0 UX - szybkie poprawki jakości odczucia

1. Ujednolicić layout kart w szczegółach encji.
2. Ujednolicić formaty dat, godzin, telefonów i cen.
3. Wszędzie, gdzie pokazujemy email/telefon/adres:
   - email powinien mieć `mailto`,
   - telefon powinien mieć `tel`,
   - adres powinien otwierać mapę,
   - wartości powinny dać się skopiować.
4. Dodać lepsze empty states:
   - co oznacza brak danych,
   - co użytkownik powinien zrobić dalej,
   - link do akcji.
5. Dodać więcej inline feedbacku po akcjach:
   - skopiowano,
   - zapisano,
   - utworzono follow-up,
   - wysłano / przygotowano wiadomość.

### P1 UX - centrum pracy agenta

1. Widok `Dzisiaj`:
   - spotkania dzisiaj,
   - nowe leady,
   - zadania po terminie,
   - follow-upy,
   - dokumenty do uzupełnienia.
2. Timeline aktywności na profilu klienta i oferty.
3. Automatyczne zadania po zdarzeniach:
   - nowy lead,
   - zakończone spotkanie,
   - brak aktywności na ofercie,
   - zmiana statusu transakcji.
4. Szybkie akcje kontaktu:
   - zadzwoń,
   - email,
   - kopiuj wiadomość,
   - zaplanuj spotkanie.

### P2 UX - funkcje wyróżniające produkt

1. Dopasowanie klientów do ofert i ofert do klientów.
2. Raport właściciela oferty.
3. Custom report builder.
4. Szablony wiadomości i follow-upów.
5. Automatyczne rekomendacje działań.

## Funkcje, które mogą zwiększyć atrakcyjność aplikacji

### 1. Asystent follow-upu

Opis:
Po spotkaniu aplikacja proponuje gotowe następne kroki i szablony wiadomości.

Przykład:

- "Wyślij podsumowanie prezentacji do klienta"
- "Poproś właściciela o zgodę na negocjację ceny"
- "Zaplanuj kontakt za 2 dni"

Wartość:

- bardzo praktyczne,
- łatwe do zrozumienia dla agenta,
- mocny element premium.

### 2. Matching klient-oferta

Opis:
Aplikacja pokazuje listę klientów pasujących do oferty i ofert pasujących do
klienta.

Wartość:

- agent szybciej wykorzystuje bazę CRM,
- mniej martwych leadów,
- większa szansa na zamknięcie.

### 3. Raport aktywności oferty dla właściciela

Opis:
Agent może wygenerować profesjonalne podsumowanie działań dla właściciela.

Zakres:

- wyświetlenia,
- zapytania,
- prezentacje,
- status publikacji,
- rekomendacje,
- notatka agenta.

Wartość:

- agent może pokazać pracę,
- właściciel ma poczucie kontroli,
- aplikacja pomaga w utrzymaniu relacji z właścicielem.

### 4. Biblioteka szablonów wiadomości

Opis:
Gotowe szablony dla typowych sytuacji:

- odpowiedź na lead,
- potwierdzenie spotkania,
- follow-up po prezentacji,
- prośba o dokumenty,
- informacja o zmianie ceny,
- podsumowanie oferty dla klienta.

Wartość:

- oszczędność czasu,
- lepsza jakość komunikacji,
- łatwy upsell do planu premium.

### 5. Customowe raporty

Opis:
Użytkownik sam wybiera dane, filtry i układ raportu.

Wartość:

- mocna funkcja premium,
- przydatna dla małych biur i managerów,
- naturalne rozszerzenie istniejącego modułu raportów.

## Plan sprintów wykonawczych

Poniższe sprinty rozbijają rekomendacje na zadania możliwe do wdrożenia etapami.
Każdy sprint powinien kończyć się aktualizacją dokumentacji, weryfikacją
`type-check`, `lint`, testami adekwatnymi do ryzyka oraz krótkim wpisem statusu
w tym dokumencie.

### Sprint UX-0: Fundament porządku UX i komponentów

Cel:
Przygotować spójny fundament pod kolejne usprawnienia, żeby nie dokładać
każdego widoku własnym stylem i własnymi helperami.

Dlaczego ten sprint jest potrzebny:

- wiele kolejnych funkcji będzie używać tych samych wzorców: karta szczegółów,
  dane kontaktowe, adres, quick action, empty state, status badge,
- bez wspólnych komponentów kod zacznie się rozjeżdżać,
- szybkie usprawnienia UX powinny powstawać na reużywalnych elementach.

Zadania produktowe:

1. Zdefiniować wzorzec `DetailPage`:
   - header,
   - status badges,
   - akcje główne,
   - siatka kart,
   - sekcja powiązań,
   - timeline / aktywność,
   - empty state.
2. Zdefiniować minimalny katalog komponentów:
   - `DetailCard`,
   - `InfoTile`,
   - `ContactAction`,
   - `AddressLink`,
   - `CopyButton`,
   - `RelationCard`,
   - `ActionEmptyState`.
3. Ustalić standardy formatów:
   - data `DD-MM-YYYY` w szczegółach,
   - godzina `HH:mm`,
   - zakres czasu `HH:mm - HH:mm`,
   - cena z walutą,
   - telefon klikalny i kopiowalny,
   - adres klikalny do map.

Zadania techniczne:

1. Przejrzeć istniejące komponenty `ui`, `common`, `layout`.
2. Dodać nowe komponenty tylko tam, gdzie są realnie reużywalne.
3. Wydzielić helpery formatowania, jeśli są używane w więcej niż jednym module.
4. Nie mieszać refaktoru wszystkich widoków w jednym PR; zacząć od jednego
   wzorca i stosować go przy kolejnych sprintach.

Kryteria akceptacji:

- istnieje wspólny komponent do kopiowania wartości,
- istnieje wspólny komponent/link dla adresu,
- istnieje wzorzec karty szczegółów możliwy do użycia w kilku modułach,
- nowe komponenty mają stabilne propsy i nie znają specyfiki jednego widoku,
- `web lint` i `web type-check` przechodzą.

Ryzyka:

- zbyt wczesna abstrakcja może utrudnić pracę; komponenty tworzyć dopiero, gdy
  są użyte minimum w dwóch miejscach albo mają oczywisty wspólny kontrakt.

Status etapu 1, 2026-06-23:

- wykonano pierwszy, ograniczony zakres sprintu UX-0 jako fundament pod kolejne
  iteracje,
- dodano wspólne komponenty `DetailCard`, `InfoTile`, `ContactAction`,
  `AddressLink`, `CopyButton`, `RelationCard` i `ActionEmptyState` w
  `apps/web/src/components/common`,
- dodano helpery `copyTextToClipboard`, `buildGoogleMapsSearchUrl`,
  `buildPhoneHref`, `formatDisplayDateNumeric`, `formatDisplayTime` i
  `formatDisplayTimeRange`,
- przepięto szczegóły spotkania na nowe komponenty wspólne, żeby realnie
  zweryfikować kontrakty komponentów na istniejącym ekranie,
- ujednolicono format zakresu godziny do `HH:mm - HH:mm`,
- nie refaktoryzowano jeszcze wszystkich widoków szczegółowych; to powinno być
  robione etapowo w sprintach UX-1 i kolejnych, żeby nie zwiększać niepotrzebnie
  ryzyka regresji.

Status etapu 2, 2026-06-24:

- UX-0 uznajemy za domknięty dla obecnego zakresu, ponieważ wspólne komponenty i
  helpery istnieją, są używane w realnych widokach i spełniają kryteria
  akceptacji,
- kolejne użycia komponentów wspólnych powinny być realizowane w sprintach
  funkcjonalnych, głównie UX-1, zamiast rozbudowywać fundament bez konkretnego
  przypadku użycia.

### Sprint UX-1: Quick wins w istniejących widokach

Cel:
Poprawić odczucie jakości aplikacji bez dużej przebudowy modelu danych.

Zakres funkcjonalny:

1. Ujednolicenie szczegółów spotkania:
   - równe karty w siatce 2x2,
   - szczegóły / notatki / klient / oferta,
   - data w formacie `DD-MM-YYYY`,
   - klikalny email, telefon, adres.
2. Ujednolicenie szczegółów klienta:
   - karta kontaktu,
   - szybkie akcje: email, telefon, kopiuj dane,
   - lista powiązanych ofert/spotkań,
   - empty state z następną akcją.
3. Ujednolicenie szczegółów oferty:
   - szybka identyfikacja oferty,
   - adres z linkiem do mapy,
   - powiązani klienci, spotkania, leady,
   - podstawowe metryki publiczne, jeśli istnieją.
4. Ujednolicenie szczegółów zapytania:
   - kontakt klikalny,
   - link do oferty,
   - akcja konwersji do klienta,
   - następny krok.

Zadania backend:

1. Zweryfikować, czy endpointy szczegółów zwracają wszystkie relacje potrzebne
   do widoku:
   - spotkanie -> klient, oferta,
   - klient -> spotkania, aktywność,
   - oferta -> leady, spotkania, dokumenty,
   - zapytanie -> oferta, klient po konwersji.
2. Dodać brakujące relacje tylko do endpointów szczegółów, nie do list, żeby nie
   pogorszyć wydajności.
3. Upewnić się, że relacje respektują scope agenta/agencji.
4. Dodać testy regresji dla przypadków, w których ID relacji istnieje, ale
   relacja wcześniej nie ładowała się poprawnie.

Zadania frontend:

1. Wdrożyć wspólne komponenty z `UX-0` w pierwszych 2-3 widokach.
2. Dodać klikalne:
   - `mailto`,
   - `tel`,
   - Google Maps,
   - kopiowanie do schowka.
3. Zastąpić puste teksty typu "brak danych" lepszymi empty states.
4. Dopilnować responsywności:
   - desktop: 2 kolumny,
   - mobile: 1 kolumna,
   - brak nachodzenia tekstu na akcje.

Kryteria akceptacji:

- użytkownik może z poziomu szczegółów kliknąć email, telefon i adres,
- nie ma fałszywych komunikatów "nie przypisano", jeśli istnieje ID relacji,
- widoki szczegółowe są spójne wizualnie,
- `web lint`, `web type-check`, `api lint`, `api type-check` przechodzą,
- testy backendu przechodzą, jeśli zmieniono endpointy.

Kolejność implementacji:

1. Spotkanie.
2. Klient.
3. Oferta.
4. Zapytanie.

Status etapu 1, 2026-06-23:

- wykorzystano komponenty z UX-0 w widoku szczegółów klienta,
- dodano kartę kontaktu klienta z klikalnym `mailto`, `tel` oraz kopiowaniem
  wartości do schowka,
- dodano szybkie CTA "Spotkanie" z widoku klienta, które otwiera formularz
  spotkania z przypisanym klientem,
- dodano obsługę prefill `clientId`, `listingId`, etykiet i lokalizacji w
  formularzu nowego spotkania,
- ujednolicono format dat w metadanych klienta i oferty do `DD-MM-YYYY`,
- dodano klikalny adres oferty prowadzący do Google Maps,
- dodano szybkie CTA "Spotkanie" z widoku oferty, które otwiera formularz
  spotkania z przypisaną ofertą i lokalizacją,
- poprawiono zawijanie akcji w nagłówkach klienta i oferty na mniejszych
  szerokościach,
- nie rozszerzano jeszcze endpointów szczegółów o pełne listy relacji; to
  zostaje na kolejny etap UX-1, razem z widokiem zapytań i testami backendu.

Status etapu 2, 2026-06-24:

- ujednolicono kartę zapytania publicznego z komponentami `ContactAction` i
  `RelationCard`,
- email i telefon w zapytaniu są klikalne oraz możliwe do skopiowania,
- dodano jasny link do oferty powiązanej z zapytaniem w CRM,
- dla zapytań już przekonwertowanych do klienta dodano szybkie CTA
  "Spotkanie", które otwiera formularz spotkania z przypisanym klientem i
  ofertą,
- dla zapytań bez klienta CRM dodano CTA "Utwórz klienta", które otwiera
  formularz klienta z uzupełnionym imieniem, nazwiskiem, emailem, telefonem i
  notatką z treści zapytania,
- dodano obsługę prefill formularza nowego klienta z parametrów URL,
- backend nie był zmieniany w tym etapie, ponieważ lista zapytań już zwraca
  powiązaną ofertę i klienta po konwersji; pełne listy relacji klient/oferta
  nadal zostają na osobną iterację UX-1.

Status etapu 3, 2026-06-24:

- dodano w szczegółach klienta realną listę najbliższych spotkań filtrowaną po
  `clientId`,
- zastąpiono ogólny empty state powiązań klienta konkretną sekcją z CTA
  "Zaplanuj spotkanie" oraz listą nadchodzących spotkań,
- dodano w szczegółach oferty sekcję "Spotkania oferty" filtrowaną po
  `listingId`,
- dodano w szczegółach oferty sekcję "Zapytania z oferty" filtrowaną po
  `listingId`,
- linki z sekcji zapytań oferty prowadzą do widoku zapytań publicznych z
  aktywnym filtrem `listingId`,
- widok zapytań publicznych obsługuje teraz inicjalne filtry z URL dla
  `listingId` i bezpiecznie walidowanego `status`,
- backend nadal nie wymagał zmian, ponieważ istniejące endpointy obsługują
  potrzebne filtry; osobna iteracja może rozszerzyć endpoint szczegółów klienta
  o historię relacji, jeśli będziemy chcieli zejść z dodatkowych requestów na
  ekranie.

Status etapu 4, 2026-06-24:

- dodano test regresji dla mapowania relacji `Appointment`,
- test sprawdza, że `agentId`, `clientId` i `listingId` są mapowane na kolumny
  `agent_id`, `client_id` i `listing_id`,
- test sprawdza, że `@JoinColumn` dla relacji `agent`, `client` i `listing`
  jest zgodny z kolumnami ID relacji,
- podczas testowania wykryto i poprawiono brakujące mapowanie `agentId` na
  kolumnę `agent_id`,
- test zabezpiecza przypadek, który powodował fałszywy komunikat "nie
  przypisano", gdy ID relacji istniało w bazie, ale mapowanie encji nie było
  zgodne z nazwą kolumny.

### Sprint UX-2: Widok "Dzisiaj"

Cel:
Dać agentowi operacyjne centrum pracy po wejściu do dashboardu.

Zakres MVP:

1. Sekcja `Dzisiaj` na dashboardzie:
   - spotkania dzisiaj,
   - nowe leady z ostatnich 24 godzin,
   - leady bez kontaktu,
   - follow-upy do wykonania,
   - dokumenty wymagające akcji,
   - oferty bez aktywności.
2. Każda pozycja powinna mieć:
   - nazwę,
   - powód, dlaczego jest na liście,
   - priorytet,
   - link do encji,
   - jedną szybką akcję.

Zadania backend:

1. Utworzyć endpoint `GET /api/dashboard/today`.
2. Zwracać ujednolicony model `TodayItem`:
   - `id`,
   - `type`,
   - `priority`,
   - `title`,
   - `description`,
   - `entityType`,
   - `entityId`,
   - `href`,
   - `dueAt`,
   - `action`.
3. Dane MVP:
   - appointmenty z dzisiejszą datą,
   - public leads/new inquiries wymagające obsługi,
   - dokumenty z `needs_correction`, `missing`, `overdue`,
   - oferty aktywne bez aktywności od X dni, jeśli mamy dane aktywności.
4. Wymusić scope danych po stronie backendu.
5. Dodać testy service:
   - solo agent,
   - agency scope,
   - brak danych,
   - sortowanie priorytetów,
   - limit wyników.

Zadania frontend:

1. Dodać sekcję `Dzisiaj` na głównym dashboardzie.
2. Dodać stany:
   - loading,
   - error,
   - empty state,
   - partial data.
3. Dodać krótkie CTA:
   - `Otwórz spotkanie`,
   - `Obsłuż lead`,
   - `Uzupełnij dokument`,
   - `Sprawdź ofertę`.
4. Zapewnić dobrą gęstość informacji: to ma być panel operacyjny, nie marketing.

Kryteria akceptacji:

- agent po wejściu na dashboard widzi najważniejsze akcje na dziś,
- lista nie pokazuje danych spoza jego scope,
- empty state mówi, że nie ma pilnych działań,
- endpoint ma testy,
- dashboard nadal szybko się ładuje.

Ryzyka:

- zbyt dużo pozycji może przytłoczyć użytkownika; MVP powinno mieć limit i
  sortowanie priorytetów.

Status etapu 1, 2026-06-24:

- dodano endpoint `GET /api/dashboard/today` zwracający ujednolicony model
  `TodayItem`,
- MVP agreguje spotkania zaplanowane na dziś, nowe zapytania publiczne z
  ostatnich 24 godzin oraz dokumenty wymagające akcji,
- endpoint limituje wynik do 10 pozycji i sortuje je po priorytecie oraz
  terminie,
- dane są filtrowane przez `agentId` rozwiązywany z aktualnego użytkownika,
- dodano testy backendowe dla pustego wyniku, scope agenta, sortowania
  priorytetów i limitu wyników,
- dodano frontendowy hook `useDashboardToday`,
- dodano panel `Dzisiaj` w przeglądzie dashboardu z loading, error, empty state
  oraz pojedynczym CTA dla każdej pozycji,
- nie dodawano jeszcze ofert bez aktywności ani follow-upów, bo wymagają
  kolejnych modeli lub doprecyzowania heurystyki aktywności.

Status etapu 2, 2026-06-24:

- dodano do `GET /api/dashboard/today` pozycje typu `listing` dla aktywnych
  ofert bez aktualizacji przez co najmniej 14 dni,
- aktywne oferty bez aktywności są filtrowane po `agentId`, statusie `ACTIVE`
  i `updatedAt <= teraz - 14 dni`,
- pozycja ma CTA `Sprawdź ofertę` prowadzące do szczegółów oferty,
- oferty bez aktywności mają priorytet `low`, a po 30 dniach `medium`,
- dodano test backendowy sprawdzający scope, próg 14 dni i mapowanie pozycji
  oferty do `TodayItem`,
- frontend panelu `Dzisiaj` obsługuje nowy typ `listing` z ikoną oferty,
- nadal nie dodano follow-upów, ponieważ to należy do sprintu UX-3 i wymaga
  modelu zadań.

### Sprint UX-3: Model zadań i follow-up po spotkaniu

Cel:
Zamienić kalendarz i CRM w narzędzie sprzedażowe, które pilnuje następnych
kroków.

Zakres MVP:

1. Model `Task`:
   - tytuł,
   - opis,
   - status,
   - priorytet,
   - termin,
   - typ,
   - powiązana encja.
2. Automatyczne zadanie follow-up po spotkaniu:
   - jeśli spotkanie ma typ `Prezentacja`,
   - jeśli status zmienia się na `Zakończone`,
   - domyślny termin: następny dzień roboczy albo +24h.
3. Manualne dodanie follow-upu ze szczegółów spotkania.
4. Prosty feedback po spotkaniu:
   - zainteresowany,
   - do namysłu,
   - niezainteresowany,
   - powód,
   - następna akcja.

Zadania backend:

1. Dodać migrację `tasks`.
2. Dodać encję `Task`.
3. Dodać moduł `TasksModule`.
4. Endpointy:
   - `GET /api/tasks`,
   - `POST /api/tasks`,
   - `PATCH /api/tasks/:id`,
   - `POST /api/appointments/:id/follow-up`.
5. Dodać generowanie zadania po zmianie statusu spotkania.
6. Dodać testy:
   - tworzenie taska,
   - scope,
   - automatyczny follow-up,
   - idempotencja, żeby nie tworzyć duplikatów.

Zadania frontend:

1. CTA `Dodaj follow-up` w szczegółach spotkania.
2. Lista zadań na dashboardzie i/lub w widoku `Dzisiaj`.
3. Mały formularz follow-up:
   - tytuł,
   - termin,
   - notatka,
   - powiązanie ze spotkaniem/klientem/ofertą.
4. Akcja `Oznacz jako wykonane`.
5. Toasty i optimistic update tylko tam, gdzie ryzyko jest niskie.

Kryteria akceptacji:

- po zakończeniu prezentacji agent dostaje jasny następny krok,
- nie powstają duplikaty automatycznych tasków,
- taski są widoczne w `Dzisiaj`,
- zadania respektują scope agenta/agencji.

Status etapu 1, 2026-06-24:

- UX-2 uznajemy za domknięty dla obecnego MVP, ponieważ panel `Dzisiaj`
  agreguje już spotkania, leady, dokumenty wymagające akcji i aktywne oferty
  bez aktualizacji,
- rozpoczęto UX-3 od backendowego fundamentu modelu zadań, bez mieszania go z
  istniejącą checklistą zadań transakcyjnych,
- dodano enumy `TaskStatus`, `TaskPriority`, `TaskType` i
  `TaskRelatedEntityType`,
- dodano encję `Task` oraz migrację `apps/api/migrations/20260624_tasks.sql`
  dla tabeli `tasks`,
- dodano moduł `TasksModule` z endpointami `GET /api/tasks`, `POST /api/tasks`
  i `PATCH /api/tasks/:id`,
- zadania są scope'owane przez aktualnego agenta i mogą być powiązane ze
  spotkaniem, klientem albo ofertą,
- serwis waliduje, czy powiązane spotkanie, klient lub oferta należy do tego
  samego agenta, żeby nie dopuścić do podpinania zadań pod cudze dane,
- `POST /api/tasks` tworzy manualne zadanie albo follow-up i automatycznie
  ustawia `completedAt`, jeśli zadanie startuje jako wykonane,
- `PATCH /api/tasks/:id` pozwala aktualizować status, priorytet, termin,
  opis i powiązania oraz ustawia lub czyści `completedAt` zgodnie ze statusem,
- dodano testy serwisu dla tworzenia zadania, scope relacji, filtrowanej listy
  i oznaczania zadania jako wykonane,
- nie dodano jeszcze automatycznego follow-upu po zmianie statusu spotkania ani
  UI w szczegółach spotkania; to zostaje na kolejną iterację UX-3, bo wymaga
  idempotencji i integracji z aktualizacją appointmentów.

Status etapu 2, 2026-06-24:

- dodano DTO `CreateAppointmentFollowUpDto` oraz endpoint
  `POST /api/appointments/:id/follow-up`,
- endpoint tworzy albo zwraca istniejący otwarty follow-up powiązany ze
  spotkaniem, dzięki czemu wielokrotne kliknięcie nie tworzy duplikatów,
- dodano reusable metodę `TasksService.createAppointmentFollowUp`, która
  buduje zadanie typu `follow_up`, przypina spotkanie, klienta i ofertę oraz
  ustawia `relatedEntityType = appointment`,
- domyślny termin follow-upu jest wyliczany na kolejny dzień po spotkaniu, z
  przesunięciem weekendu na poniedziałek,
- automatyczny follow-up jest tworzony po zmianie statusu spotkania typu
  `viewing` z innego statusu na `completed`,
- automatyczne tworzenie wykorzystuje tę samą idempotentną metodę w
  `TasksService`, więc nie powstają duplikaty otwartych follow-upów dla tego
  samego spotkania,
- dodano testy dla idempotencji, domyślnego terminu follow-upu, ręcznego
  endpointu serwisowego oraz automatycznego wywołania po zakończeniu
  prezentacji,
- nie dodano jeszcze UI `Dodaj follow-up`, listy tasków w panelu `Dzisiaj` ani
  akcji `Oznacz jako wykonane`; to zostaje na kolejną iterację UX-3, ponieważ
  kontrakt backendowy jest już gotowy do podpięcia frontendu.

### Sprint UX-4: Timeline aktywności klienta i oferty

Cel:
Dać agentowi pełny kontekst pracy bez przeskakiwania między modułami.

Zakres MVP:

1. Timeline na profilu klienta:
   - notatki,
   - spotkania,
   - follow-upy,
   - zapytania publiczne,
   - zmiany statusu.
2. Timeline na ofercie:
   - publikacja,
   - zapytania,
   - spotkania,
   - dokumenty,
   - zmiany statusu,
   - aktywność publiczna, jeśli dostępna.

Zadania backend:

1. Sprawdzić istniejący `ActivityService`.
2. Ustalić, które eventy już są zapisywane.
3. Dodać endpointy:
   - `GET /api/clients/:id/activity`,
   - `GET /api/listings/:id/activity`.
4. Dodać normalizację eventów do wspólnego modelu:
   - `type`,
   - `title`,
   - `description`,
   - `createdAt`,
   - `actor`,
   - `metadata`,
   - `href`.
5. Dodać paginację.

Zadania frontend:

1. Komponent `ActivityTimeline`.
2. Sekcja na profilu klienta.
3. Sekcja na profilu oferty.
4. Empty state: "Brak aktywności, dodaj notatkę albo zaplanuj spotkanie".
5. Linki z timeline do encji.

Kryteria akceptacji:

- agent widzi historię kontaktu i działań w jednym miejscu,
- timeline nie miesza danych innych agentów,
- paginacja chroni przed ciężkim ładowaniem,
- widok jest czytelny na mobile.

### Sprint UX-5: Szybkie akcje kontaktu i szablony wiadomości MVP

Cel:
Zmniejszyć czas potrzebny na kontakt z klientem i poprawić jakość komunikacji.

Zakres MVP:

1. Szablony wiadomości:
   - odpowiedź na lead,
   - potwierdzenie spotkania,
   - follow-up po prezentacji,
   - prośba o dokumenty,
   - informacja o zmianie ceny.
2. Szybkie kopiowanie wiadomości.
3. Prefill danych:
   - imię klienta,
   - tytuł oferty,
   - adres,
   - termin spotkania,
   - dane agenta.

Zadania backend:

1. Zacząć od statycznego katalogu szablonów w kodzie albo konfiguracji.
2. Dodać endpoint `GET /api/message-templates`.
3. Dodać endpoint `POST /api/message-templates/render`.
4. Walidować typ szablonu i kontekst.
5. Nie wysyłać wiadomości w MVP; tylko render i copy.

Zadania frontend:

1. Dodać menu `Wiadomość` przy kliencie, spotkaniu, ofercie.
2. Modal wyboru szablonu.
3. Podgląd treści.
4. Przycisk `Kopiuj wiadomość`.
5. Toast po skopiowaniu.

Kryteria akceptacji:

- agent może przygotować gotową wiadomość w mniej niż 15 sekund,
- treść nie zawiera pustych placeholderów,
- funkcja nie wysyła wiadomości bez wiedzy użytkownika,
- copy i preview działają bez integracji email/SMS.

Ryzyka:

- treści muszą być neutralne prawnie; unikać obietnic, gwarancji i niepewnych
  informacji.

### Sprint UX-6: Matching klient-oferta

Cel:
Wykorzystać dane CRM do realnej sprzedaży: komu zaproponować daną ofertę i jakie
oferty pokazać klientowi.

Zakres MVP:

1. Matching klient -> oferty.
2. Matching oferta -> klienci.
3. Prosty scoring 0-100.
4. Wyjaśnienie dopasowania:
   - budżet,
   - miasto/dzielnica,
   - typ nieruchomości,
   - metraż,
   - pokoje.
5. Akcja:
   - zaplanuj prezentację,
   - skopiuj wiadomość z ofertą,
   - oznacz jako niedopasowane.

Zadania backend:

1. Uporządkować model preferencji klienta:
   - sprawdzić pola `ClientPreference`,
   - dodać brakujące pole typu transakcji, jeśli potrzebne,
   - dodać opcjonalne preferencje dzielnicy.
2. Dodać `MatchingService`.
3. Endpointy:
   - `GET /api/clients/:id/matching-listings`,
   - `GET /api/listings/:id/matching-clients`.
4. Dodać scoring:
   - twarde wykluczenia,
   - punkty pozytywne,
   - powody dopasowania.
5. Testy scoringu:
   - idealne dopasowanie,
   - częściowe dopasowanie,
   - budżet poza zakresem,
   - brak preferencji,
   - scope danych.

Zadania frontend:

1. Sekcja `Pasujące oferty` na profilu klienta.
2. Sekcja `Pasujący klienci` na ofercie.
3. Pokazywać score i 2-3 powody dopasowania.
4. Dodać szybkie akcje:
   - `Zaproponuj ofertę`,
   - `Zaplanuj prezentację`,
   - `Ukryj dopasowanie`.
5. Dodać empty state:
   - brak preferencji,
   - brak aktywnych ofert,
   - brak dopasowań.

Kryteria akceptacji:

- agent widzi użyteczne dopasowania, nie losową listę,
- scoring jest deterministyczny i testowalny,
- brak preferencji nie psuje widoku,
- użytkownik rozumie, dlaczego system coś rekomenduje.

### Sprint UX-7: Raport właściciela oferty

Cel:
Dać agentowi profesjonalny materiał, który może pokazać właścicielowi
nieruchomości i udowodnić wykonaną pracę.

Zakres MVP:

1. Raport dla jednej oferty.
2. Dane:
   - status oferty,
   - okres raportu,
   - liczba wyświetleń publicznych,
   - liczba zapytań,
   - liczba spotkań,
   - ostatnie działania,
   - rekomendacja/notatka agenta.
3. Widok drukowalny.
4. Eksport PDF jako etap późniejszy, jeśli brak gotowej infrastruktury PDF.

Zadania backend:

1. Endpoint `GET /api/listings/:id/owner-report`.
2. Dane agregowane w scope agenta/agencji.
3. Filtrowanie zakresu dat.
4. Zwrócić model:
   - `listing`,
   - `period`,
   - `metrics`,
   - `activity`,
   - `recommendation`.
5. Dodać testy:
   - scope,
   - brak publicznych metryk,
   - brak leadów,
   - oferta bez spotkań.

Zadania frontend:

1. Przycisk `Raport dla właściciela` na szczegółach oferty.
2. Widok `/dashboard/listings/:id/owner-report`.
3. Layout:
   - header z brandingiem,
   - karta oferty,
   - KPI,
   - timeline działań,
   - notatka agenta,
   - print styles.
4. Dodać akcje:
   - drukuj,
   - kopiuj link wewnętrzny,
   - wróć do oferty.

Kryteria akceptacji:

- raport wygląda profesjonalnie bez dodatkowej obróbki,
- agent może go wydrukować lub pokazać na spotkaniu,
- nie pokazuje danych osobowych leadów bez potrzeby,
- metryki są opisane zrozumiałym językiem.

### Sprint UX-8: Insighty i rekomendacje działań

Cel:
Przejść z raportowania liczb do rekomendacji decyzji.

Zakres MVP:

1. Insighty na dashboardzie:
   - oferta bez aktywności,
   - spadek liczby leadów,
   - dużo anulowanych spotkań,
   - leady bez kontaktu,
   - wysoki potencjał prowizji w pipeline.
2. Insighty w raportach:
   - krótkie interpretacje,
   - link do danych źródłowych,
   - rekomendowana akcja.

Zadania backend:

1. Dodać `InsightsService`.
2. Zacząć od reguł deterministycznych, bez AI:
   - progi,
   - porównania okres do okresu,
   - brak aktywności,
   - zaległe zadania.
3. Endpoint `GET /api/insights`.
4. Model `Insight`:
   - `id`,
   - `severity`,
   - `title`,
   - `description`,
   - `entityType`,
   - `entityId`,
   - `actionHref`,
   - `createdAt`.
5. Testy reguł.

Zadania frontend:

1. Sekcja insightów na dashboardzie.
2. Sekcja insightów w raportach.
3. CTA przy insightach:
   - otwórz ofertę,
   - obsłuż lead,
   - zaplanuj follow-up,
   - zobacz raport.
4. Możliwość ukrycia insightu na późniejszym etapie.

Kryteria akceptacji:

- insighty są konkretne i akcjonalne,
- nie generują szumu,
- użytkownik może przejść bezpośrednio do działania,
- reguły są testowalne.

### Sprint UX-9: Automatyzacje i powiadomienia operacyjne

Cel:
Zamknąć pętlę pracy: aplikacja nie tylko pokazuje problemy, ale pilnuje
terminów i przypomina o działaniach.

Zakres MVP:

1. Powiadomienia o:
   - nowym leadzie,
   - spotkaniu dzisiaj,
   - follow-upie po terminie,
   - brakującym dokumencie,
   - ofercie bez aktywności.
2. Konfiguracja podstawowa:
   - włącz/wyłącz typ powiadomienia,
   - próg opóźnienia follow-upu,
   - próg braku aktywności.

Zadania backend:

1. Rozszerzyć istniejący moduł powiadomień, jeśli pasuje do obecnego kontraktu.
2. Dodać schedulery/reguły generowania powiadomień.
3. Zapewnić idempotencję, żeby nie tworzyć duplikatów.
4. Dodać testy:
   - generowanie,
   - brak duplikatów,
   - oznaczanie jako przeczytane,
   - scope.

Zadania frontend:

1. Uporządkować centrum powiadomień.
2. Grupować powiadomienia operacyjne.
3. Dodać bezpośrednie CTA.
4. Dodać ustawienia powiadomień w settings.

Kryteria akceptacji:

- powiadomienia pomagają, a nie przeszkadzają,
- użytkownik może przejść do działania jednym kliknięciem,
- scheduler nie generuje duplikatów,
- testy obejmują idempotencję.

### Sprint UX-10: Polishing, mierzenie efektu i rollout

Cel:
Upewnić się, że nowe funkcje rzeczywiście poprawiają doświadczenie użytkownika i
nie zwiększają chaosu.

Zakres:

1. Instrumentacja analytics:
   - kliknięcia quick actions,
   - wykonane follow-upy,
   - użycie szablonów,
   - otwarcia widoku `Dzisiaj`,
   - użycie matchingu,
   - wygenerowane raporty właściciela.
2. Metryki sukcesu:
   - czas do pierwszego kontaktu z leadem,
   - liczba follow-upów wykonanych w terminie,
   - liczba spotkań z feedbackiem,
   - aktywność użytkownika w dashboardzie,
   - retencja tygodniowa.
3. UX cleanup:
   - usunąć niespójne empty states,
   - skontrolować mobile,
   - skontrolować dostępność,
   - skrócić teksty, które są zbyt instruktażowe.
4. Release checklist:
   - feature flags,
   - migracje,
   - rollback,
   - monitoring błędów.

Kryteria akceptacji:

- mamy dane, czy funkcje są używane,
- nie ma regresji w podstawowych flow,
- nowe funkcje są opisane w dokumentacji,
- można włączyć rollout etapami.

## Ryzyka i zależności

1. Część bardziej zaawansowanych raportów wymaga historii zdarzeń.
2. Matching klient-oferta wymaga uporządkowania preferencji klienta.
3. Raport właściciela wymaga stabilnych metryk publicznych ofert.
4. Automatyzacje wymagają modelu zadań albo rozszerzenia istniejących checklist.
5. Funkcje komunikacyjne wymagają ostrożności prawnej i zgód marketingowych.

## Najbardziej opłacalny następny krok

Najlepszy kolejny krok produktowy to `Widok Dzisiaj` oraz `Follow-up po spotkaniu`.

Powód:

- bazują na istniejących danych,
- rozwiązują codzienny problem agenta,
- są łatwe do pokazania w demo,
- zwiększają retencję, bo użytkownik ma powód wracać codziennie.
