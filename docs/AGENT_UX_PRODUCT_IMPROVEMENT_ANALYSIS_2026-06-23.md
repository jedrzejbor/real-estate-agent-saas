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

Status etapu 3, 2026-06-24:

- dodano otwarte zadania CRM i follow-upy do endpointu
  `GET /api/dashboard/today`,
- panel `Dzisiaj` pobiera zadania o statusie `todo`, których termin jest do
  końca bieżącego dnia albo nie mają ustawionego terminu,
- zadania w `Dzisiaj` są filtrowane po `agentId`, sortowane po `dueAt` i
  `createdAt` oraz limitowane do 8 rekordów przed wspólnym sortowaniem listy
  operacyjnej,
- zadania mapują się do `TodayItem` typu `task`, z priorytetem `high` dla
  przeterminowanych zadań i `medium` dla pozostałych,
- karta taska prowadzi do najlepszego dostępnego kontekstu: spotkania, klienta,
  oferty albo dashboardu,
- frontend panelu `Dzisiaj` obsługuje typ `task` z ikoną zadania,
- dodano akcję `Oznacz jako wykonane`, która wywołuje `PATCH /api/tasks/:id`
  ze statusem `done` i po sukcesie odświeża panel,
- dodano test backendowy sprawdzający mapowanie otwartych tasków do
  `TodayItem`,
- nie dodano jeszcze formularza `Dodaj follow-up` w szczegółach spotkania ani
  pełnego widoku listy zadań; to zostaje na kolejną iterację UX-3.

Status etapu 4, 2026-06-24:

- dodano funkcję frontendową `createAppointmentFollowUp`, która wywołuje
  `POST /api/appointments/:id/follow-up`,
- w szczegółach spotkania dodano kartę `Follow-up` z polami: tytuł, termin i
  notatka,
- formularz ustawia domyślny tytuł `Follow-up: {tytuł spotkania}`, domyślną
  notatkę oraz termin na kolejny dzień roboczy po zakończeniu spotkania,
- akcja `Dodaj follow-up` korzysta z backendowej idempotencji, więc ponowne
  kliknięcie nie tworzy duplikatu otwartego zadania dla tego spotkania,
- po sukcesie użytkownik dostaje toast z informacją, że zadanie pojawi się w
  panelu `Dzisiaj`, gdy będzie wymagało działania,
- obsłużono stan ładowania i błąd tworzenia follow-upu,
- nie dodano jeszcze pełnego widoku listy zadań; to może być ostatnia iteracja
  UX-3 przed przejściem do UX-4.

Status etapu 5, 2026-06-24:

- dodano frontendowy moduł `apps/web/src/lib/tasks.ts` z typami tasków,
  pobieraniem listy i aktualizacją statusu,
- dodano widok `/dashboard/tasks` jako pełną listę zadań CRM i follow-upów,
- widok zadań ma filtry `Do zrobienia`, `Wykonane` i `Wszystkie`,
- każdy task pokazuje status, typ, priorytet, termin, opis oraz link do
  najlepszego dostępnego kontekstu: spotkania, klienta, oferty albo dashboardu,
- dodano akcję `Oznacz wykonane` oraz `Przywróć`, wykorzystującą
  `PATCH /api/tasks/:id`,
- dodano pozycję `Zadania` w głównej nawigacji dashboardu,
- UX-3 spełnia obecne kryteria akceptacji MVP: model zadań istnieje, follow-upy
  tworzą się ręcznie i automatycznie, nie powstają duplikaty, zadania są
  widoczne w `Dzisiaj`, można je wykonać, a pełna lista zadań jest dostępna w
  osobnym widoku,
- prosty feedback po spotkaniu w postaci statusu zainteresowania, powodu i
  następnej akcji pozostaje poza zakresem obecnego MVP i powinien wrócić jako
  osobny etap, najlepiej razem z timeline z UX-4.

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

Status UX-4 / iteracja 1:

Zrobione:

1. Sprawdzono istniejący `ActivityService` i zostawiono obecny endpoint historii
   zmian bez zmian, ponieważ jest używany do audit logu oraz cofania statusu.
2. Dodano endpoint `GET /api/clients/:id/activity` z paginacją `page`/`limit`.
3. Endpoint normalizuje aktywność klienta do wspólnego modelu:
   - `type`,
   - `title`,
   - `description`,
   - `createdAt`,
   - `actor`,
   - `metadata`,
   - `href`.
4. Timeline klienta agreguje obecnie:
   - wpisy audit logu klienta,
   - notatki klienta,
   - spotkania przypisane do klienta,
   - follow-upy i zadania przypisane do klienta,
   - zapytania publiczne skonwertowane do tego klienta.
5. Dodano filtrowanie po właścicielu klienta oraz `agentId` na zapytaniach
   pomocniczych, aby timeline nie mieszał danych innych agentów.
6. Dodano test jednostkowy backendu dla sortowania, normalizacji i filtrowania
   po agencie.
7. Dodano frontendowy model API `fetchClientActivity`.
8. Dodano komponent `ActivityTimeline` z:
   - czytelnym empty state,
   - typami zdarzeń,
   - datą i godziną,
   - linkami do powiązanych spotkań/ofert, jeśli są dostępne,
   - ręcznym odświeżaniem.
9. Dodano sekcję aktywności na profilu klienta i odświeżanie jej po zmianie
   statusu, cofnięciu statusu oraz dodaniu/usunięciu notatki.

Do kolejnej iteracji UX-4:

1. Dodać analogiczny endpoint `GET /api/listings/:id/activity`.
2. Dodać sekcję timeline na profilu oferty.
3. Rozważyć wyciągnięcie wspólnego normalizatora timeline po stronie backendu,
   gdy timeline klienta i oferty będą miały wspólne mapery.
4. Dodać paginację "pokaż więcej" po stronie UI, jeśli w testach użytkowych
   okaże się, że 30 wpisów na start to za mało.

Status UX-4 / iteracja 2:

Zrobione:

1. Dodano endpoint `GET /api/listings/:id/activity` z paginacją `page`/`limit`.
2. Endpoint normalizuje aktywność oferty do tego samego modelu timeline, który
   jest używany na profilu klienta.
3. Timeline oferty agreguje obecnie:
   - wpisy audit logu oferty,
   - spotkania przypisane do oferty,
   - zadania i follow-upy przypisane do oferty,
   - zapytania publiczne dotyczące oferty,
   - eventy dokumentów oferty,
   - aktywność publiczną z analytics: wyświetlenia, kliknięcia, galerię,
     kopiowanie linku i zgłoszenia.
4. Dodano filtrowanie po właścicielu oferty oraz `agentId`/`listingId` na
   zapytaniach pomocniczych, aby timeline nie mieszał danych innych agentów.
5. Rozszerzono wspólny komponent `ActivityTimeline`, aby obsługiwał aktywność
   klientów i ofert bez duplikacji UI.
6. Dodano sekcję "Aktywność oferty" w zakładce historii profilu oferty, nad
   techniczną historią zmian.
7. Dodano test jednostkowy backendu dla sortowania, normalizacji i filtrowania
   timeline oferty.

Do kolejnej iteracji UX-4:

1. Wyciągnąć wspólne mapery timeline po stronie backendu, jeśli dojdą kolejne
   źródła aktywności.
2. Dodać "pokaż więcej" w komponencie `ActivityTimeline`, jeżeli 30 wpisów
   startowych nie wystarczy w realnym użyciu.
3. Rozważyć automatyczne odświeżenie timeline po akcjach w panelu dokumentów,
   jeśli użytkownicy często wracają od razu do zakładki historii.

Status UX-4 / iteracja 3:

Zrobione:

1. Dodano wspólny hook `useActivityTimeline`, który obsługuje:
   - pierwsze ładowanie aktywności,
   - ręczne odświeżenie,
   - doładowanie kolejnej strony,
   - ochronę przed duplikatami przy dokładaniu wpisów.
2. Rozszerzono komponent `ActivityTimeline` o:
   - przycisk "Pokaż więcej",
   - stan ładowania kolejnej strony,
   - informację "Pokazano X z Y wpisów",
   - zachowanie istniejącego empty state i refresh.
3. Podłączono paginację aktywności na profilu klienta.
4. Podłączono paginację aktywności na profilu oferty.
5. Usunięto lokalnie zdublowaną logikę ładowania timeline z widoków klienta i
   oferty na rzecz jednego hooka.

Do kolejnej iteracji UX-4:

1. Rozważyć automatyczne odświeżenie timeline po akcjach w panelu dokumentów.
2. Wyciągnąć wspólne mapery timeline po stronie backendu, jeśli dojdą kolejne
   źródła aktywności lub zacznie rosnąć koszt utrzymania mapowania klient/oferta.
3. Jeżeli realne dane przekroczą typowe zakresy timeline, zastąpić agregację
   per-source pełniejszym mechanizmem cursor-based pagination.

Status UX-4 / iteracja 4:

Zrobione:

1. Dodano opcjonalny callback `onActivityChanged` do panelu dokumentów oferty.
2. Timeline oferty odświeża się automatycznie po akcjach dokumentów:
   - dodaniu dokumentu,
   - zmianie statusu dokumentu,
   - pobraniu dokumentu,
   - usunięciu dokumentu.
3. Callback jest podłączony z poziomu profilu oferty bez uzależniania panelu
   dokumentów od konkretnej implementacji timeline.

Do kolejnej iteracji UX-4:

1. Wyciągnąć wspólne mapery timeline po stronie backendu, jeśli dojdą kolejne
   źródła aktywności lub zacznie rosnąć koszt utrzymania mapowania klient/oferta.
2. Jeżeli realne dane przekroczą typowe zakresy timeline, zastąpić agregację
   per-source pełniejszym mechanizmem cursor-based pagination.
3. Rozważyć małe filtry typów aktywności w `ActivityTimeline`, jeśli timeline
   zacznie być zbyt gęsty dla agentów z dużą liczbą leadów i dokumentów.

Status UX-4 / iteracja 5:

Zrobione:

1. Dodano lokalne filtry typów aktywności w komponencie `ActivityTimeline`.
2. Filtry pokazują tylko typy dostępne w aktualnie załadowanych wpisach oraz
   licznik wpisów dla każdego typu.
3. Dodano filtr "Wszystko" z liczbą załadowanych wpisów.
4. Dodano empty state dla sytuacji, gdy wybrany typ nie ma wpisów w aktualnie
   załadowanej aktywności.
5. Dodano ochronę przed pozostaniem na filtrze, który zniknął po odświeżeniu
   lub zmianie danych.

Do kolejnej iteracji UX-4:

1. Wyciągnąć wspólne mapery timeline po stronie backendu, jeśli dojdą kolejne
   źródła aktywności lub zacznie rosnąć koszt utrzymania mapowania klient/oferta.
2. Jeżeli realne dane przekroczą typowe zakresy timeline, zastąpić agregację
   per-source pełniejszym mechanizmem cursor-based pagination.
3. Jeżeli lokalne filtry okażą się niewystarczające przy dużych timeline,
   przenieść filtrowanie typów do endpointów aktywności.

Status UX-4 / iteracja 6 - zamknięcie MVP:

Zrobione:

1. Wyciągnięto wspólny backendowy kontrakt timeline do
   `apps/api/src/activity/activity-timeline.ts`.
2. Ujednolicono mapowanie wpisów audit logu klienta i oferty przez wspólny
   helper `mapActivityHistoryToTimelineItem`.
3. Ujednolicono formatowanie akcji aktywności, aktora i dat ISO dla timeline.
4. Usunięto powtarzające się helpery z `ClientsService` i `ListingsService`,
   zostawiając w serwisach tylko mapowanie zdarzeń specyficznych dla danej
   domeny.
5. Potwierdzono, że UX-4 MVP obejmuje:
   - timeline klienta,
   - timeline oferty,
   - paginację i "Pokaż więcej",
   - filtry typów aktywności,
   - odświeżanie po akcjach statusu, notatek, publikacji i dokumentów,
   - testy backendowe dla timeline klienta i oferty.

Status sprintu:

UX-4 MVP uznajemy za zakończony. Cursor-based pagination oraz filtrowanie po
stronie endpointu zostają jako przyszła optymalizacja, jeśli realny wolumen
aktywności przekroczy obecne założenia.

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

Status UX-5 / iteracja 1:

Zrobione:

1. Dodano backendowy moduł `message-templates`.
2. Dodano statyczny katalog pięciu szablonów:
   - odpowiedź na lead,
   - potwierdzenie spotkania,
   - follow-up po prezentacji,
   - prośba o dokumenty,
   - informacja o zmianie ceny.
3. Dodano endpoint `GET /api/message-templates`.
4. Dodano endpoint `POST /api/message-templates/render`.
5. Render szablonów stosuje kontrolowane fallbacki, aby wiadomość nie zawierała
   pustych placeholderów.
6. Dodano testy backendowe dla renderowania szablonu, fallbacków i odrzucenia
   nieznanego typu.
7. Dodano frontendowy klient API `message-templates`.
8. Dodano komponent `MessageTemplateDialog` z:
   - wyborem szablonu,
   - podglądem tematu,
   - podglądem treści,
   - przyciskiem "Kopiuj wiadomość",
   - toastem po skopiowaniu.
9. Podłączono pierwsze użycie na kartach zapytań publicznych przez przycisk
   "Wiadomość" z kontekstem klienta, oferty i treści leada.

Do kolejnej iteracji UX-5:

1. Podłączyć menu wiadomości na profilu klienta.
2. Podłączyć menu wiadomości na szczegółach spotkania.
3. Podłączyć menu wiadomości na profilu oferty, szczególnie dla szablonów
   dokumentów i zmiany ceny.
4. Rozważyć dodanie danych agenta do kontekstu renderowania, jeśli będą
   dostępne w istniejącym endpointzie profilu użytkownika.

Status UX-5 / iteracja 2:

Zrobione:

1. Podłączono przycisk `Wiadomość` na profilu klienta.
2. Przycisk otwiera wspólny `MessageTemplateDialog`.
3. Kontekst wiadomości klienta jest wstępnie uzupełniany danymi klienta oraz
   najbliższego spotkania, jeśli istnieje:
   - imię i nazwisko klienta,
   - tytuł oferty,
   - adres lub lokalizacja spotkania,
   - data spotkania,
   - godzina spotkania.
4. Dla klientów z nadchodzącym spotkaniem domyślnym szablonem jest
   `Potwierdzenie spotkania`; w pozostałych przypadkach agent może szybko
   wybrać follow-up albo prośbę o dokumenty.
5. Dodano bezpieczny fallback listy dokumentów dla szablonu prośby o dokumenty.

Do kolejnej iteracji UX-5:

1. Podłączyć menu wiadomości na szczegółach spotkania.
2. Podłączyć menu wiadomości na profilu oferty, szczególnie dla szablonów
   dokumentów i zmiany ceny.
3. Rozważyć dodanie danych agenta do kontekstu renderowania, jeśli będą
   dostępne w istniejącym endpointzie profilu użytkownika.

Status UX-5 / iteracja 3:

Zrobione:

1. Podłączono przycisk `Wiadomość` na szczegółach spotkania.
2. Przycisk otwiera wspólny `MessageTemplateDialog`.
3. Kontekst wiadomości spotkania jest wstępnie uzupełniany z danych spotkania:
   - klient,
   - tytuł oferty albo tytuł spotkania,
   - adres oferty albo lokalizacja spotkania,
   - data spotkania,
   - godzina spotkania.
4. Dla spotkań zaplanowanych domyślnym szablonem jest `Potwierdzenie spotkania`.
5. Dla spotkań po terminie lub w innym statusie domyślnym szablonem jest
   `Follow-up po prezentacji`.

Do kolejnej iteracji UX-5:

1. Podłączyć menu wiadomości na profilu oferty, szczególnie dla szablonów
   dokumentów i zmiany ceny.
2. Rozważyć dodanie danych agenta do kontekstu renderowania, jeśli będą
   dostępne w istniejącym endpointzie profilu użytkownika.

Status UX-5 / iteracja 4:

Zrobione:

1. Podłączono przycisk `Wiadomość` na profilu oferty.
2. Przycisk otwiera wspólny `MessageTemplateDialog`, tak samo jak lead, klient
   i spotkanie.
3. Domyślnym szablonem dla oferty jest `Prośba o dokumenty`, bo to najbardziej
   naturalny kontekst pracy na profilu oferty.
4. Kontekst wiadomości oferty jest wstępnie uzupełniany danymi oferty:
   - tytuł oferty,
   - adres oferty,
   - aktualna cena,
   - bezpieczna lista dokumentów do uzupełnienia.
5. Kontekst przekazywany do dialogu jest memoizowany, żeby uniknąć zbędnego
   ponownego renderowania szablonu podczas pracy w modalu.

Do kolejnej iteracji UX-5:

1. Rozważyć dodanie danych agenta do kontekstu renderowania, jeśli będą
   dostępne w istniejącym endpointzie profilu użytkownika.
2. Rozważyć wskazanie odbiorcy wiadomości na profilu oferty, jeśli oferta ma
   przypisanego właściciela albo preferowanego klienta kontaktowego.
3. Rozważyć osobną akcję `Zmiana ceny`, jeśli proces zmiany ceny dostanie
   dedykowany widok albo historię poprzedniej ceny.

Status UX-5 / iteracja 5:

Zrobione:

1. Dodano wspólny helper `buildAgentMessageTemplateContext` dla danych agenta.
2. Helper pobiera dane z istniejącego profilu użytkownika:
   - imię i nazwisko agenta,
   - email konta,
   - telefon agenta, jeśli jest uzupełniony.
3. Podłączono dane agenta do szablonów wiadomości na:
   - liście zapytań publicznych,
   - profilu klienta,
   - szczegółach spotkania,
   - profilu oferty.
4. Ujednolicono sposób budowania kontekstu wiadomości, żeby szablony korzystały
   z jednego kontraktu `MessageTemplateContext`.
5. Ustabilizowano konteksty wiadomości przez `useMemo` tam, gdzie dialog mógłby
   niepotrzebnie ponownie renderować szablon przy zmianie stanu modalu.

Do kolejnej iteracji UX-5:

1. Rozważyć wskazanie odbiorcy wiadomości na profilu oferty, jeśli oferta ma
   przypisanego właściciela albo preferowanego klienta kontaktowego.
2. Rozważyć osobną akcję `Zmiana ceny`, jeśli proces zmiany ceny dostanie
   dedykowany widok albo historię poprzedniej ceny.
3. Rozważyć pokazanie w podglądzie szablonu informacji, które pola zostały
   uzupełnione fallbackiem, ale tylko jeśli nie zwiększy to szumu w UI.

Status UX-5 / iteracja 6:

Zrobione:

1. Dodano osobną akcję `Zmiana ceny` na profilu oferty.
2. Akcja otwiera ten sam bezpieczny `MessageTemplateDialog`, ale startuje od
   szablonu `Informacja o zmianie ceny`.
3. Główna akcja `Wiadomość` na profilu oferty nadal startuje od szablonu
   `Prośba o dokumenty`, więc agent ma dwa szybkie wejścia do najczęstszych
   scenariuszy pracy z ofertą.
4. Szablon zmiany ceny korzysta z istniejącego kontekstu oferty:
   - tytuł oferty,
   - aktualna cena,
   - dane agenta.
5. Nie dodano automatycznego odbiorcy na profilu oferty, ponieważ obecny
   frontendowy kontrakt `Listing` nie zawiera danych kontaktowych właściciela
   ani preferowanego klienta. To wymaga osobnej decyzji modelowej/API, zamiast
   zgadywania odbiorcy po stronie UI.

Do kolejnej iteracji UX-5:

1. Jeśli chcemy wskazywać odbiorcę na profilu oferty, rozszerzyć backendowy i
   frontendowy kontrakt oferty o bezpieczne dane kontaktowe właściciela albo
   relację do preferowanego klienta.
2. Rozważyć dodanie historii poprzedniej ceny, żeby szablon `Zmiana ceny`
   mógł automatycznie uzupełniać również `previousPrice`.
3. Rozważyć pokazanie w podglądzie szablonu informacji, które pola zostały
   uzupełnione fallbackiem, ale tylko jeśli nie zwiększy to szumu w UI.

Status UX-5 / iteracja 7:

Zrobione:

1. Szablon `Zmiana ceny` na profilu oferty automatycznie uzupełnia teraz
   `previousPrice`, jeśli historia oferty zawiera wcześniejszą zmianę pola
   `price`.
2. Poprzednia cena jest wyciągana z istniejącej historii aktywności oferty,
   bez dodawania nowego endpointu i bez duplikowania danych.
3. Dodano defensywną walidację wartości historycznej ceny:
   - akceptowane są dodatnie liczby,
   - akceptowane są stringi możliwe do sparsowania do dodatniej liczby,
   - puste, zerowe i niepoprawne wartości są ignorowane.
4. Poprzednia cena jest formatowana tą samą funkcją `formatPrice`, co aktualna
   cena oferty, więc wiadomość zachowuje spójny format kwoty i waluty.
5. Jeśli historia ceny nie istnieje, szablon działa jak dotychczas i nie
   pokazuje linii z poprzednią ceną.

Do kolejnej iteracji UX-5:

1. Jeśli chcemy wskazywać odbiorcę na profilu oferty, rozszerzyć backendowy i
   frontendowy kontrakt oferty o bezpieczne dane kontaktowe właściciela albo
   relację do preferowanego klienta.
2. Rozważyć pokazanie w podglądzie szablonu informacji, które pola zostały
   uzupełnione fallbackiem, ale tylko jeśli nie zwiększy to szumu w UI.
3. Rozważyć test komponentowy dla profilu oferty, gdy w projekcie zostanie
   ustalony standard testów komponentów dla widoków dashboardu.

Status UX-5 / iteracja 8:

Zrobione:

1. Dodano subtelną informację w `MessageTemplateDialog`, gdy wybrany szablon
   nie ma wszystkich wymaganych danych kontekstowych.
2. Dialog pokazuje czytelne etykiety pól zamiast technicznych nazw z kontraktu,
   np. `Klient`, `Oferta`, `Aktualna cena`, `Lista dokumentów`.
3. Komunikat pojawia się tylko wtedy, gdy realnie brakuje wymaganego pola dla
   aktualnie wybranego szablonu.
4. Brakujące pola nadal są obsługiwane przez istniejące neutralne fallbacki po
   stronie backendu, więc użytkownik nie jest blokowany.
5. Rozwiązanie jest wspólne dla wszystkich miejsc użycia dialogu:
   - zapytania publiczne,
   - profil klienta,
   - szczegóły spotkania,
   - profil oferty.

Status UX-5 / iteracja 9:

Zrobione:

1. Rozszerzono dashboardowy kontrakt `GET /api/listings/:id` o opcjonalne
   `messageRecipient`.
2. `messageRecipient` jest budowany wyłącznie z istniejącej relacji
   `ownerUserId` i zwraca minimalny snapshot:
   - typ odbiorcy,
   - id,
   - nazwę,
   - email,
   - telefon.
3. Backend nie zwraca pełnej relacji `ownerUser` w payloadzie dashboardowym.
4. Publiczne mapowania ofert nie zwracają `messageRecipient` ani `ownerUser`.
5. Dodano testy dla:
   - budowania minimalnego snapshotu odbiorcy,
   - braku odbiorcy,
   - ignorowania pustych pól kontaktowych,
   - braku wycieku odbiorcy w publicznych payloadach.
6. Frontendowy typ `Listing` obsługuje `messageRecipient`.
7. Profil oferty pokazuje odbiorcę wiadomości przy akcjach komunikacyjnych:
   - nazwę,
   - typ `Właściciel`,
   - email,
   - telefon.
8. Jeśli odbiorca nie jest przypisany, UI pokazuje krótki neutralny komunikat
   i nie blokuje dialogu wiadomości.
9. Szablony wiadomości z profilu oferty dostają `messageRecipient.name` jako
   `clientName`, więc treść ma poprawnie uzupełnionego adresata, jeśli
   właściciel jest przypisany.

Ocena po iteracji 9:

1. Wskazywanie odbiorcy na profilu oferty zostało wdrożone w pierwszym etapie
   dla właściciela powiązanego przez istniejące `ownerUserId`.
2. Testy komponentowe dla profilu oferty i dialogu wiadomości warto dodać
   dopiero wtedy, gdy projekt będzie miał ustalony standard testów komponentów
   dla widoków dashboardu.
3. Rozszerzenia CRM, wielu odbiorców i wysyłki wiadomości traktujemy jako
   przyszły zakres techniczny poza UX-5 MVP.
4. UX-5 nie wymaga kolejnej iteracji przed rozpoczęciem UX-6.

Status UX-5 / zamknięcie MVP:

Decyzja:
UX-5 MVP uznajemy za zakończony. Wszystkie elementy z pierwotnego zakresu MVP
zostały zrealizowane w wystarczającym zakresie, aby przejść do UX-6.

Zakres MVP pokryty:

1. Backend:
   - statyczny katalog pięciu szablonów,
   - endpoint `GET /api/message-templates`,
   - endpoint `POST /api/message-templates/render`,
   - walidacja typu szablonu,
   - render bez pustych placeholderów,
   - brak automatycznej wysyłki wiadomości.
2. Frontend:
   - wspólny `MessageTemplateDialog`,
   - wybór szablonu,
   - podgląd tematu i treści,
   - kopiowanie wiadomości,
   - toast po skopiowaniu,
   - informacja o brakujących danych uzupełnianych fallbackiem.
3. Miejsca użycia:
   - zapytania publiczne,
   - profil klienta,
   - szczegóły spotkania,
   - profil oferty.
4. Prefill danych:
   - klient,
   - tytuł oferty,
   - adres oferty albo lokalizacja spotkania,
   - termin spotkania,
   - dane agenta,
   - aktualna cena,
   - poprzednia cena, jeśli wynika z historii oferty,
   - lista dokumentów.
5. Kryteria bezpieczeństwa MVP:
   - funkcja tylko renderuje i kopiuje treść,
   - użytkownik sam decyduje, gdzie wklei wiadomość,
   - brak integracji email/SMS w MVP,
   - treści są neutralne i bez obietnic sprzedażowych.

Świadomie przeniesione poza UX-5 MVP:

1. Odbiorca wiadomości oparty o klienta CRM albo wielu odbiorców na ofercie.
   Powód: wymaga decyzji domenowej, czy oferta może mieć klienta kontaktowego
   niezależnie od właściciela użytkownika.
2. Integracja z wysyłką email/SMS.
   Powód: wymaga osobnego zakresu zgód, logowania wysyłek, statusów doręczeń i
   obsługi błędów dostawcy.
3. Edytowalne lub personalizowane szablony przez użytkownika.
   Powód: wymaga modelu zapisu szablonów, uprawnień, wersjonowania i
   walidacji treści.
4. Testy komponentowe dla dialogu i profilu oferty.
   Powód: warto je dodać, gdy ustalimy standard testów komponentów dla widoków
   dashboardu.

Backlog techniczny: dalszy rozwój odbiorcy wiadomości na profilu oferty:

Cel:
Agent powinien móc otworzyć wiadomość z profilu oferty i od razu widzieć, do
kogo jest przygotowywana treść, bez ręcznego szukania właściciela albo klienta
w innych widokach.

Status:
Pierwszy etap jest wdrożony dla właściciela powiązanego przez `ownerUserId`.
Poniższy backlog dotyczy dalszego rozwoju: klient CRM, wielu odbiorców,
trwały wybór preferowanego odbiorcy i ewentualne kanały wysyłki.

Proponowany model danych:

1. Wariant właścicielski:
   - wykorzystać istniejące `ownerUserId` w modelu oferty, jeśli właściciel
     jest użytkownikiem systemu,
   - expose'ować tylko minimalny bezpieczny snapshot kontaktu właściciela:
     `name`, `email`, `phone`,
   - nie zwracać pól administracyjnych użytkownika, ról, planu, flag ani
     historii konta.
2. Wariant CRM:
   - dodać opcjonalne powiązanie oferty z klientem kontaktowym, np.
     `primaryContactClientId`,
   - użyć istniejącego modelu klienta jako źródła danych kontaktowych,
   - pozwolić agentowi wybrać klienta kontaktowego tylko spośród klientów
     dostępnych w jego scope.
3. Wariant mieszany:
   - oferta może mieć właściciela użytkownika albo klienta kontaktowego,
   - frontend pokazuje jasny typ odbiorcy: `Właściciel` albo `Klient CRM`,
   - jeśli oba źródła istnieją, UI wymaga jawnego wyboru odbiorcy przed
     skopiowaniem wiadomości.

Zadania backend:

1. Doprecyzować decyzję domenową:
   - czy właściciel oferty ma być zawsze użytkownikiem,
   - czy właściciel może być zwykłym klientem CRM,
   - czy oferta może mieć kilku odbiorców kontaktowych.
2. Rozszerzyć odpowiedź `GET /api/listings/:id` o minimalne pole kontaktowe,
   np.:
   - `messageRecipient.type`,
   - `messageRecipient.id`,
   - `messageRecipient.name`,
   - `messageRecipient.email`,
   - `messageRecipient.phone`.
3. Dodać kontrolę scope:
   - agent widzi tylko odbiorców z własnej agencji albo własnego profilu,
   - viewer/prywatny sprzedający nie może dostać danych klienta CRM,
   - brak relacji nie zwraca żadnych danych kontaktowych.
4. Dodać walidację przy ustawianiu odbiorcy:
   - klient musi istnieć,
   - klient musi należeć do tego samego scope,
   - nie można przypisać odbiorcy z innej agencji.
5. Dodać testy:
   - listing z właścicielem użytkownikiem zwraca tylko minimalny snapshot,
   - listing z klientem kontaktowym zwraca klienta tylko w tym samym scope,
   - brak odbiorcy nie psuje widoku,
   - próba przypisania klienta spoza scope jest odrzucana,
   - dane w publicznych endpointach ofert nie ujawniają odbiorcy wiadomości.

Zadania frontend:

1. Rozszerzyć typ `Listing` o opcjonalne `messageRecipient`.
2. Na profilu oferty pokazać mały, czytelny blok przy akcji `Wiadomość`:
   - nazwa odbiorcy,
   - typ odbiorcy,
   - email/telefon, jeśli są dostępne.
3. Przekazywać `messageRecipient.name` jako `clientName` do
   `MessageTemplateContext`, ponieważ obecne szablony używają pola
   `clientName` jako adresata wiadomości.
4. Jeśli odbiorcy nie ma:
   - nie blokować dialogu,
   - zostawić neutralny fallback `Pani/Panie`,
   - pokazać krótką informację, że odbiorca nie jest przypisany.
5. Jeśli będzie więcej niż jeden możliwy odbiorca:
   - dodać wybór odbiorcy przed renderowaniem szablonu,
   - zapamiętać wybór tylko lokalnie w dialogu, dopóki nie powstanie trwały
     model preferowanego odbiorcy.

Zasady bezpieczeństwa i prywatności:

1. Dane odbiorcy z profilu oferty są dostępne tylko w dashboardzie.
2. Publiczne endpointy ofert nie mogą zwracać `messageRecipient`.
3. Nie logować pełnej treści wiadomości ani danych kontaktowych w analytics.
4. Nie wysyłać wiadomości automatycznie; użytkownik nadal tylko kopiuje treść.
5. W razie braku zgód marketingowych unikać automatycznego sugerowania kanałów
   marketingowych. Samo przygotowanie treści pozostaje neutralne.

Kryteria akceptacji:

1. Na profilu oferty agent widzi, do kogo jest przygotowywana wiadomość.
2. Szablony z profilu oferty mają poprawnie uzupełnione pole adresata, jeśli
   odbiorca jest przypisany.
3. Brak odbiorcy nie powoduje błędu ani pustych placeholderów.
4. Dane kontaktowe nie wyciekają do publicznych endpointów.
5. Testy obejmują scope, brak odbiorcy i minimalny payload kontaktowy.

Rekomendacja:
Nie rozwijać dalej UX-5 w tej serii iteracji. Następny najbardziej wartościowy
krok to rozpoczęcie UX-6: matching klient-oferta.

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

Status UX-6 / iteracja 1:

Zrobione:

1. Sprawdzono obecny model preferencji klienta:
   - `propertyType`,
   - `minArea`,
   - `maxPrice`,
   - `preferredCity`,
   - `minRooms`.
2. Potwierdzono, że w modelu preferencji brakuje jeszcze:
   - preferowanego typu transakcji,
   - preferowanej dzielnicy,
   - trwałego oznaczania dopasowań jako ukryte/niedopasowane.
3. Dodano backendowy moduł `MatchingModule`.
4. Dodano `MatchingService` z deterministycznym scoringiem klient -> oferta.
5. Scoring w pierwszym etapie korzysta wyłącznie z istniejących danych:
   - status oferty,
   - budżet klienta,
   - maksymalna cena z preferencji,
   - typ nieruchomości,
   - preferowane miasto,
   - minimalny metraż,
   - minimalna liczba pokoi.
6. Dodano twarde wykluczenia:
   - oferta nieaktywna,
   - cena oferty powyżej budżetu klienta albo maksymalnej ceny z preferencji.
7. Dodano powody dopasowania w typach:
   - pozytywne,
   - neutralne,
   - negatywne.
8. Dodano testy scoringu:
   - idealne dopasowanie,
   - częściowe dopasowanie,
   - budżet poza zakresem,
   - brak preferencji klienta,
   - nieaktywna oferta.

Decyzje techniczne:

1. Nie dodano jeszcze migracji pod typ transakcji i preferowaną dzielnicę,
   ponieważ pierwszy etap ma ustabilizować scoring na istniejącym modelu.
2. Nie dodano jeszcze endpointów matchingowych, żeby nie wystawiać kontraktu API
   przed zatwierdzeniem zasad scoringu.
3. Nie dodano jeszcze UI, bo frontend powinien konsumować gotowy kontrakt
   endpointów z powodami dopasowania.

Do kolejnej iteracji UX-6:

1. Dodać endpoint `GET /api/clients/:id/matching-listings`.
2. Pobrać aktywne oferty w scope agenta/agencji.
3. Zastosować `MatchingService` do kandydatów i zwrócić posortowaną listę.
4. Ograniczyć payload do danych potrzebnych UI:
   - oferta,
   - score,
   - 2-3 główne powody,
   - flaga `isExcluded` tylko diagnostycznie albo w ogóle jej nie zwracać dla
     odrzuconych kandydatów.
5. Dodać testy endpointu dla scope danych i braku preferencji.

Status UX-6 / iteracja 2:

Zrobione:

1. Dodano endpoint `GET /api/clients/:id/matching-listings`.
2. Endpoint działa po stronie `ClientsController`, czyli naturalnie startuje z
   profilu klienta.
3. `ClientsService.findMatchingListings`:
   - pobiera klienta z preferencjami,
   - sprawdza ownership klienta,
   - pobiera aktywne oferty z tego samego `agentId`,
   - używa `MatchingService` do wyliczenia score,
   - odrzuca kandydatów oznaczonych jako `isExcluded`,
   - sortuje wyniki malejąco po score,
   - zwraca maksymalnie 10 najlepszych ofert.
4. Payload endpointu jest ograniczony do danych potrzebnych UI:
   - podstawowe dane oferty,
   - adres w zakresie `city` i `district`,
   - score,
   - maksymalnie 3 powody dopasowania.
5. Dodano testy dla:
   - pobierania tylko aktywnych ofert z właściwego scope,
   - sortowania po score,
   - odrzucenia oferty ponad budżetem,
   - blokady dostępu do klienta spoza scope.

Decyzje techniczne:

1. Endpoint nie zwraca pełnej encji `Listing`, żeby nie mieszać UI matchingu z
   prywatnymi polami oferty.
2. Endpoint nie zwraca odrzuconych kandydatów, bo MVP ma pokazywać agentowi
   użyteczne dopasowania, a nie listę diagnostyczną.
3. Scope jest na razie zgodny z obecnym modelem klientów i ofert, czyli
   `agentId`. Rozszerzenie na pełny scope agencji można dodać później razem z
   decyzją o multi-user workflow.

Do kolejnej iteracji UX-6:

1. Dodać frontendowy klient API dla `matching-listings`.
2. Dodać sekcję `Pasujące oferty` na profilu klienta.
3. Pokazać score, 2-3 powody i podstawowe dane oferty.
4. Dodać akcję `Zaplanuj prezentację` z prefill klienta i oferty.
5. Dodać empty states:
   - brak preferencji,
   - brak aktywnych ofert,
   - brak dopasowań.

Status UX-6 / iteracja 3:

Zrobione:

1. Dodano frontendowy kontrakt API dla endpointu
   `GET /api/clients/:id/matching-listings`.
2. Dodano typy dla:
   - podstawowego podsumowania dopasowanej oferty,
   - score,
   - powodów dopasowania.
3. Dodano sekcję `Pasujące oferty` na profilu klienta.
4. Sekcja pokazuje:
   - tytuł oferty z linkiem do profilu oferty,
   - score dopasowania,
   - cenę,
   - typ nieruchomości,
   - typ transakcji,
   - miasto i dzielnicę,
   - metraż,
   - liczbę pokoi,
   - powody dopasowania.
5. Dodano akcję `Zaplanuj prezentację`, która otwiera formularz spotkania z
   prefill klienta i oferty.
6. Dodano stany UI:
   - ładowanie dopasowań,
   - błąd pobierania,
   - brak preferencji klienta,
   - brak pasujących aktywnych ofert.
7. Widok pokazuje maksymalnie 5 najlepszych dopasowań, mimo że backend zwraca do
   10 wyników. Dzięki temu profil klienta pozostaje czytelny.

Decyzje techniczne:

1. UI nie wyświetla dopasowań, jeśli klient nie ma żadnych preferencji
   matchingowych. Agent dostaje wtedy jasną akcję uzupełnienia preferencji,
   zamiast neutralnej listy o niskiej wartości sprzedażowej.
2. Kontrakt w `lib/clients.ts` pozostaje ograniczony do payloadu endpointu i
   nie importuje pełnej encji oferty.
3. Formatowanie ceny i etykiet oferty korzysta z istniejących helperów
   listingowych, żeby nie duplikować logiki prezentacji.
4. Pobieranie dopasowań jest niezależne od pobierania profilu klienta, więc
   chwilowy błąd matchingu nie blokuje całego widoku klienta.

Do kolejnej iteracji UX-6:

1. Dodać backendowy endpoint `GET /api/listings/:id/matching-clients`.
2. Dodać sekcję `Pasujący klienci` na profilu oferty.
3. Użyć tego samego `MatchingService`, ale odwrócić perspektywę na oferta ->
   klienci.
4. Dodać szybkie akcje z profilu oferty:
   - `Zaproponuj ofertę`,
   - `Zaplanuj prezentację`.
5. Rozważyć trwałe ukrywanie dopasowań dopiero po zdefiniowaniu modelu
   `dismissed match`, żeby nie mieszać tego z samym MVP scoringu.

Status UX-6 / iteracja 4:

Zrobione:

1. Dodano backendowy endpoint `GET /api/listings/:id/matching-clients`.
2. Endpoint działa z poziomu `ListingsController`, przed generyczną trasą
   `GET /api/listings/:id`, żeby nie było kolizji routingu.
3. `ListingsService.findMatchingClients`:
   - pobiera ofertę z relacją adresu,
   - sprawdza ownership oferty,
   - pobiera klientów CRM z tego samego `agentId`,
   - ogranicza kandydatów do roboczych statusów sprzedażowych,
   - używa tego samego `MatchingService` co widok klient -> oferty,
   - odrzuca kandydatów oznaczonych jako `isExcluded`,
   - sortuje wyniki malejąco po score,
   - zwraca maksymalnie 10 najlepszych klientów.
4. Payload endpointu jest ograniczony do danych potrzebnych UI:
   - podstawowe dane klienta,
   - minimalne dane kontaktowe,
   - status i źródło,
   - budżet,
   - preferencje klienta,
   - score,
   - maksymalnie 3 powody dopasowania.
5. Dodano testy dla:
   - pobierania klientów tylko z właściwego scope,
   - sortowania po score,
   - odrzucenia klienta z budżetem niższym niż cena oferty,
   - blokady dostępu do oferty spoza scope.

Decyzje techniczne:

1. Endpoint nie zwraca pełnej encji `Client`, żeby nie wystawiać notatek,
   historii ani pól niewymaganych w module matchingu.
2. Kandydaci są ograniczeni do statusów:
   - `new`,
   - `contacted`,
   - `qualified`,
   - `active`,
   - `negotiating`.
3. Klienci `closed_won`, `closed_lost` i `inactive` są pomijani, bo w kontekście
   propozycji oferty generowaliby niski sygnał sprzedażowy.
4. `ListingsService` dostał zależności do repozytorium klientów i
   `MatchingService`, a `ListingsModule` importuje `MatchingModule`.
5. Nowe zależności w serwisie zostały dopięte bez naruszania publicznych
   endpointów ofert.

Do kolejnej iteracji UX-6:

1. Dodać frontendowy kontrakt API dla
   `GET /api/listings/:id/matching-clients`.
2. Dodać sekcję `Pasujący klienci` na profilu oferty.
3. Pokazać score, 2-3 powody, status klienta, budżet i podstawowy kontakt.
4. Dodać akcję `Zaproponuj ofertę`, która otworzy dialog szablonu wiadomości z
   kontekstem oferty i klienta.
5. Dodać akcję `Zaplanuj prezentację` z prefill oferty i klienta.

Status UX-6 / iteracja 5:

Zrobione:

1. Dodano frontendowy kontrakt API dla endpointu
   `GET /api/listings/:id/matching-clients`.
2. Dodano typy dla:
   - podsumowania klienta z matchingu,
   - score,
   - powodów dopasowania.
3. Dodano pobieranie pasujących klientów na profilu oferty.
4. Dodano sekcję `Pasujący klienci` w zakładce `Przegląd` profilu oferty.
5. Sekcja pokazuje:
   - imię i nazwisko klienta z linkiem do profilu klienta,
   - score dopasowania,
   - status klienta,
   - źródło klienta,
   - budżet,
   - email i telefon, jeśli są dostępne,
   - powody dopasowania.
6. Dodano akcję `Zaproponuj ofertę`, która otwiera dialog szablonu wiadomości z
   kontekstem wybranego klienta i oferty.
7. Dodano akcję `Zaplanuj prezentację`, która otwiera formularz spotkania z
   prefill oferty, klienta i lokalizacji.
8. Dodano stany UI:
   - oferta nieaktywna,
   - ładowanie dopasowań,
   - błąd pobierania,
   - brak pasujących klientów.

Decyzje techniczne:

1. Dialog wiadomości dla pasującego klienta jest oddzielony od głównego dialogu
   wiadomości oferty, który nadal używa odbiorcy właścicielskiego.
2. `Zaproponuj ofertę` korzysta z istniejącego `MessageTemplateDialog`, żeby nie
   tworzyć drugiego mechanizmu renderowania treści.
3. UI pokazuje maksymalnie 5 najlepszych klientów, mimo że backend zwraca do 10
   wyników, aby prawa kolumna profilu oferty pozostała skanowalna.
4. Karta ukrywa właściwe dopasowania dla nieaktywnej oferty i pokazuje jasny
   komunikat, że matching ma sens po aktywacji oferty.
5. Dane kontaktowe klienta są używane tylko w dashboardzie i pochodzą z
   ograniczonego payloadu endpointu matchingowego.

Do kolejnej iteracji UX-6:

1. Zweryfikować kompletność MVP UX-6 po obu kierunkach:
   - klient -> oferty,
   - oferta -> klienci.
2. Rozważyć model `dismissed match` dla akcji `Ukryj dopasowanie`.
3. Rozważyć rozszerzenie `ClientPreference` o:
   - typ transakcji,
   - preferowaną dzielnicę.
4. Dodać test komponentowy dla sekcji matchingowych, jeśli utrzymamy standard
   testów komponentów dla dashboardu.
5. Jeśli MVP UX-6 jest wystarczające, zamknąć sprint i przejść do UX-7.

Status UX-6 / iteracja 6:

Zrobione:

1. Dodano backendowy model `MatchingDismissal` dla trwałego ukrywania pary
   klient-oferta.
2. Model zapisuje:
   - `agentId`,
   - `clientId`,
   - `listingId`,
   - opcjonalny `reason`,
   - datę utworzenia.
3. Dodano unikalność na parze `agentId + clientId + listingId`, żeby ukrycie
   było idempotentne i odporne na wieloklik.
4. Dodano endpoint:
   `POST /api/clients/:id/matching-listings/:listingId/dismiss`.
5. Dodano endpoint:
   `POST /api/listings/:id/matching-clients/:clientId/dismiss`.
6. `ClientsService.findMatchingListings` filtruje ukryte oferty dla danego
   klienta.
7. `ListingsService.findMatchingClients` filtruje ukrytych klientów dla danej
   oferty.
8. Dodano frontendowe funkcje API:
   - `dismissClientMatchingListing`,
   - `dismissListingMatchingClient`.
9. Dodano testy dla:
   - filtrowania ukrytych ofert na profilu klienta,
   - filtrowania ukrytych klientów na profilu oferty,
   - zapisu ukrycia z kontrolą scope klienta,
   - zapisu ukrycia z kontrolą scope oferty.

Decyzje techniczne:

1. Ukrycie dotyczy pary klient-oferta, a nie osobnego kierunku widoku. Jeśli
   agent ukryje dopasowanie na profilu klienta, ta sama para nie pojawi się też
   jako pasujący klient na profilu oferty.
2. Endpointy zapisu nie zwracają payloadu i używają `204 No Content`.
3. Zapis ukrycia sprawdza scope po `agentId`, żeby nie dało się ukryć relacji
   klienta albo oferty z innego konta agenta.
4. Odczyt ukryć jest wykonywany przed scoringiem, żeby nie liczyć punktów dla
   kandydatów, których agent już odrzucił.
5. W tej iteracji nie dodano jeszcze przycisków `Ukryj` w UI. Najpierw
   ustabilizowano backend, endpointy, filtrowanie i kontrakty frontendowe.

Do kolejnej iteracji UX-6:

1. Dodać przycisk `Ukryj` w sekcji `Pasujące oferty` na profilu klienta.
2. Dodać przycisk `Ukryj` w sekcji `Pasujący klienci` na profilu oferty.
3. Po udanym ukryciu usuwać pozycję lokalnie z listy bez pełnego przeładowania
   profilu.
4. Dodać toast potwierdzający ukrycie.
5. Rozważyć małą akcję `Cofnij` tylko lokalnie w toaście, jeśli system toastów
   będzie wspierał akcje. Trwałe przywracanie można zrobić osobnym endpointem,
   jeśli agent będzie tego realnie potrzebował.

Status UX-6 / iteracja 7:

Zrobione:

1. Dodano przycisk `Ukryj` w sekcji `Pasujące oferty` na profilu klienta.
2. Dodano przycisk `Ukryj` w sekcji `Pasujący klienci` na profilu oferty.
3. Obie akcje korzystają z endpointów dodanych w iteracji 6:
   - `POST /api/clients/:id/matching-listings/:listingId/dismiss`,
   - `POST /api/listings/:id/matching-clients/:clientId/dismiss`.
4. Po udanym ukryciu element jest usuwany lokalnie z listy bez przeładowania
   całego profilu.
5. Dodano stan blokady przycisku dla aktualnie ukrywanego dopasowania, żeby
   uniknąć podwójnych kliknięć.
6. Dodano toast sukcesu po ukryciu dopasowania.
7. Dodano toast błędu, jeśli zapis ukrycia się nie powiedzie.

Decyzje techniczne:

1. Nie dodano confirm-dialogu dla `Ukryj`, bo akcja porządkuje listę
   rekomendacji i nie usuwa klienta ani oferty.
2. UI nie wykonuje pełnego refetch profilu po ukryciu. Lokalna aktualizacja
   listy jest wystarczająca, bo backend zapisuje trwałe ukrycie, a kolejne
   wejście na profil pobierze już przefiltrowane wyniki.
3. Nie dodano jeszcze `Cofnij`, ponieważ obecny system toastów nie ma
   ustandaryzowanej akcji inline. Przywracanie ukrytego dopasowania powinno być
   osobnym zakresem, jeśli pojawi się realna potrzeba użytkowników.

Status UX-6 / zamknięcie MVP:

Decyzja:
UX-6 MVP można uznać za zakończony.

Zakres MVP pokryty:

1. Matching klient -> oferty:
   - backend,
   - frontend,
   - score,
   - powody dopasowania,
   - akcja `Zaplanuj prezentację`,
   - akcja `Ukryj`.
2. Matching oferta -> klienci:
   - backend,
   - frontend,
   - score,
   - powody dopasowania,
   - akcja `Zaproponuj ofertę`,
   - akcja `Zaplanuj prezentację`,
   - akcja `Ukryj`.
3. Scoring:
   - deterministyczny,
   - testowany,
   - oparty o istniejące preferencje klienta,
   - odporny na brak części danych.
4. Bezpieczeństwo:
   - endpointy sprawdzają scope po `agentId`,
   - payloady są ograniczone do danych potrzebnych UI,
   - ukrycie dopasowania nie pozwala operować na kliencie albo ofercie spoza
     scope agenta.

Świadomie przeniesione poza UX-6 MVP:

1. Preferowany typ transakcji w `ClientPreference`.
2. Preferowana dzielnica w `ClientPreference`.
3. Cofanie ukrytego dopasowania.
4. Testy komponentowe sekcji matchingowych.
5. Rozszerzenie scope z pojedynczego `agentId` na pełny model multi-agent
   agencji, jeśli produktowo zdecydujemy się na współdzielenie klientów i ofert
   w zespole.

Następny krok:
Przejść do UX-7: raport właściciela oferty.

Status UX-6 / iteracja 8 - rozszerzenie po MVP:

Zrobione:

1. Rozszerzono model `ClientPreference` o:
   - `transactionType`,
   - `preferredDistrict`.
2. Rozszerzono DTO tworzenia i edycji klienta o walidację nowych pól.
3. Rozszerzono `MatchingService` o dodatkowe sygnały score:
   - dopasowanie typu transakcji,
   - dopasowanie dzielnicy.
4. Zmieniono wagi score tak, aby wynik nadal mieścił się w zakresie 0-100:
   - budżet,
   - typ nieruchomości,
   - typ transakcji,
   - miasto,
   - dzielnica,
   - metraż,
   - pokoje.
5. Brak typu transakcji albo dzielnicy w preferencjach klienta daje powód
   neutralny, a nie błąd ani twarde odrzucenie.
6. Rozszerzono formularz klienta o pola:
   - `Typ transakcji`,
   - `Preferowana dzielnica`.
7. Rozszerzono kartę preferencji klienta, aby pokazywała nowe pola.
8. Rozszerzono import CSV klientów o mapowanie nowych kolumn:
   - `transactiontype`,
   - `transaction_type`,
   - `typtransakcji`,
   - `preferreddistrict`,
   - `preferred_district`,
   - `preferowanadzielnica`.
9. Rozszerzono etykiety historii aktywności klienta o nowe pola preferencji.
10. Zaktualizowano testy scoringu i endpointów matchingowych.

Decyzje techniczne:

1. Typ transakcji i dzielnica nie są twardymi wykluczeniami. Na tym etapie są
   sygnałami rankingowymi, bo część agentów może chcieć świadomie pokazać
   klientowi ofertę bliską, ale nie idealną.
2. `preferredDistrict` jest zwykłym polem tekstowym, spójnym z obecnym
   `preferredCity`. Nie wprowadzamy jeszcze słownika dzielnic, żeby nie mieszać
   UX-6 z większym modułem lokalizacji.
3. Pola są opcjonalne i kompatybilne wstecz z klientami utworzonymi przed tą
   iteracją.
4. Rozszerzenie zostało wykonane po zamknięciu MVP, bo zwiększa jakość
   rekomendacji, ale nie blokowało podstawowego przepływu matchingu.

Do przyszłego backlogu:

1. Dodać słownik dzielnic zależny od miasta, jeśli formularz preferencji zacznie
   generować zbyt dużo wariantów tekstowych.
2. Rozważyć osobne wagi dla sprzedaży i najmu, jeśli dane z użytkowania pokażą,
   że typ transakcji powinien być sygnałem krytycznym.
3. Rozważyć testy komponentowe formularza klienta i kart matchingowych, gdy
   standard testów komponentów dashboardu zostanie ustalony.

Status UX-6 / iteracja 9 - migracja schematu:

Zrobione:

1. Dodano ręczną migrację SQL:
   `apps/api/migrations/20260628_matching_preferences_and_dismissals.sql`.
2. Migracja dodaje typ enum:
   - `client_preference_transaction_type`.
3. Migracja dodaje kolumny w `client_preferences`:
   - `transaction_type`,
   - `preferred_district`.
4. Migracja tworzy tabelę `matching_dismissals` dla trwałego ukrywania
   dopasowań klient-oferta.
5. Migracja dodaje unikalność:
   - `agent_id`,
   - `client_id`,
   - `listing_id`.
6. Migracja dodaje indeksy pod odczyt ukryć:
   - po agencie,
   - po kliencie,
   - po ofercie,
   - po parach `agent + client`,
   - po parach `agent + listing`.
7. Migracja zawiera kompatybilność dla lokalnych środowisk, w których
   `TYPEORM_SYNCHRONIZE=true` mogło wcześniej utworzyć kolumny camelCase:
   - `transactionType`,
   - `preferredDistrict`.
8. Dopasowano encje backendowe do docelowych nazw kolumn snake_case:
   - `ClientPreference.transactionType -> transaction_type`,
   - `ClientPreference.preferredDistrict -> preferred_district`,
   - `MatchingDismissal.agentId -> agent_id`,
   - `MatchingDismissal.clientId -> client_id`,
   - `MatchingDismissal.listingId -> listing_id`.
9. Po uruchomieniu migracji lokalnie poprawiono mapowanie daty utworzenia
   ukrycia dopasowania:
   - `MatchingDismissal.createdAt -> created_at`.
     Bez tego endpoint `dismiss` odpytywał nieistniejącą kolumnę `"createdAt"`
     i zwracał błąd 500.

Decyzje techniczne:

1. Dla nowych pól preferencji używamy snake_case w bazie, zgodnie z ręcznymi
   migracjami projektu.
2. Migracja jest idempotentna i może być uruchomiona ponownie bez niszczenia
   danych.
3. `matching_dismissals` ma osobną tabelę zamiast pola JSON przy kliencie albo
   ofercie, ponieważ ukrycie jest relacją pary klient-oferta i wymaga szybkiego
   filtrowania z obu kierunków.

Status:
UX-6 pozostaje zamknięty funkcjonalnie. Iteracja 9 domyka ryzyko wdrożenia
schematu bazy danych po rozszerzeniach z iteracji 6 i 8 oraz naprawia
regresję endpointu `dismiss` po przejściu tabeli ukryć na snake_case.

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

Status UX-7 / iteracja 1 - MVP raportu właściciela:

Zrobione:

1. Dodano prywatny endpoint:
   - `GET /api/listings/:id/owner-report`.
2. Endpoint zwraca raport dla jednej oferty w scope zalogowanego agenta:
   - dane oferty,
   - okres raportu,
   - metryki,
   - ostatnią aktywność,
   - rekomendację agenta.
3. Dodano filtrowanie zakresu dat:
   - `from`,
   - `to`,
   - domyślnie ostatnie 30 dni.
4. Dodano agregowane metryki:
   - wyświetlenia publicznej oferty,
   - zapytania publiczne,
   - spotkania w okresie,
   - zakończone spotkania,
   - przyszłe zaplanowane spotkania.
5. Aktywność raportu jest ograniczona do danych bezpiecznych dla właściciela:
   - nie pokazujemy imion, emaili ani telefonów leadów,
   - zapytania są opisane neutralnie jako aktywność,
   - publiczne wyświetlenia są agregowane i pokazywane bez danych technicznych.
6. Dodano widok:
   - `/dashboard/listings/:id/owner-report`.
7. Widok zawiera:
   - nagłówek raportu,
   - dane oferty,
   - KPI,
   - rekomendację,
   - ostatnie działania,
   - akcje `Drukuj`, `Kopiuj link`, `Wróć do oferty`.
8. Dodano przycisk `Raport właściciela` na profilu oferty.
9. Dodano testy backendowe:
   - raport działa tylko w scope agenta,
   - metryki są agregowane poprawnie,
   - raport nie ujawnia danych osobowych leadów.

Decyzje techniczne:

1. PDF zostaje poza MVP tej iteracji. Widok jest przygotowany do drukowania z
   przeglądarki, bez dokładania infrastruktury renderowania PDF po stronie
   serwera.
2. Endpoint znajduje się pod domeną ofert, ponieważ raport dotyczy jednej
   oferty i korzysta z istniejących repozytoriów `Listing`, `PublicLead`,
   `Appointment`, `AnalyticsEvent` oraz historii aktywności.
3. Rekomendacja jest deterministyczna i bazuje na metrykach, bez generowania AI,
   aby MVP było szybkie, testowalne i przewidywalne.

Do kolejnej iteracji UX-7:

1. Rozważyć eksport PDF, jeśli ustalimy infrastrukturę generowania dokumentów.
2. Dodać branding agencji, gdy potwierdzimy stabilny kontrakt danych agencji w
   raporcie.

Status UX-7 / iteracja 2 - zakres dat i porównanie:

Zrobione:

1. Rozszerzono endpoint `GET /api/listings/:id/owner-report` o sekcję
   `comparison`.
2. Backend wylicza poprzedni okres tej samej długości co aktualny raport.
3. Dodano delty dla metryk:
   - wyświetlenia publiczne,
   - zapytania,
   - spotkania,
   - zakończone spotkania.
4. Każda delta zawiera:
   - wartość aktualną,
   - wartość poprzednią,
   - zmianę liczbową,
   - zmianę procentową, jeśli poprzedni okres ma bazę do porównania,
   - kierunek `up`, `down` albo `flat`.
5. Widok raportu dostał wybór zakresu dat:
   - pole `Od`,
   - pole `Do`,
   - automatyczne odświeżenie raportu po zmianie zakresu.
6. KPI pokazują krótką informację o zmianie względem poprzedniego okresu.
7. Dodano osobną sekcję `Porównanie z poprzednim okresem`.
8. Test raportu właścicielskiego sprawdza delty oraz przypadek zmiany
   procentowej przy poprzedniej wartości równej zero.

Decyzje techniczne:

1. Porównanie jest liczone po stronie backendu, żeby frontend nie musiał znać
   reguł okresów ani powielać logiki metryk.
2. Dla poprzedniej wartości `0` zwracamy `changePct: null`, bo procentowa
   zmiana z zera byłaby myląca.
3. Widok używa natywnych pól `date`, bez dodatkowej biblioteki kalendarza, żeby
   nie zwiększać zależności i utrzymać prosty, testowalny zakres.

Do kolejnej iteracji UX-7:

1. Rozważyć eksport PDF, jeśli ustalimy infrastrukturę generowania dokumentów.
2. Rozważyć rozszerzenie komentarzy tekstowych o bardziej domenowe insighty,
   np. osobny komentarz dla wysokiego ruchu bez zapytań.

Status UX-7 / iteracja 3 - branding i komentarze:

Zrobione:

1. Rozszerzono payload raportu o sekcję `brand`.
2. Backend zwraca minimalny bezpieczny snapshot:
   - nazwa agencji,
   - logo agencji,
   - adres agencji,
   - imię i nazwisko agenta,
   - telefon agenta.
3. Backend nie zwraca pól administracyjnych agencji:
   - planu,
   - danych billingowych,
   - statusu subskrypcji,
   - konfiguracji limitów.
4. Widok raportu pokazuje branding agencji w nagłówku:
   - logo, jeśli jest dostępne,
   - inicjały nazwy agencji jako fallback,
   - nazwę agencji,
   - dane agenta i adres agencji.
5. Logo jest renderowane przez `next/image` z `unoptimized`, żeby wspierać
   dowolny URL logo bez dokładania konfiguracji domen i bez nowych ostrzeżeń
   lint dla zwykłego `<img>`.
6. Sekcja porównania dostała krótkie komentarze tekstowe, np. czy wynik jest
   lepszy, słabszy albo bez zmian względem poprzedniego okresu.
7. Test raportu właścicielskiego sprawdza, że branding zwraca tylko minimalny
   payload i nie ujawnia pól planu ani billingowych.

Decyzje techniczne:

1. Branding jest częścią prywatnego raportu dashboardowego, nie publicznego
   endpointu oferty.
2. Snapshot brandingu jest jawnie mapowany w serwisie, zamiast zwracać encję
   `Agency`, żeby ograniczyć ryzyko wycieku pól administracyjnych.
3. Komentarze porównawcze są na razie proste i deterministyczne. Bardziej
   domenowe insighty zostają na kolejną iterację albo sprint UX-8.

Do kolejnej iteracji UX-7:

1. Rozważyć eksport PDF, jeśli ustalimy infrastrukturę generowania dokumentów.
2. Rozważyć bardziej rozbudowany eksport/share flow raportu, jeśli raport ma
   być przekazywany właścicielowi poza spotkaniem.

Status UX-7 / iteracja 4 - insighty raportu:

Zrobione:

1. Rozszerzono payload raportu o tablicę `insights`.
2. Insighty są generowane deterministycznie po stronie backendu na podstawie
   metryk i porównania z poprzednim okresem.
3. Dodano reguły:
   - brak aktywności w okresie raportu,
   - dużo wyświetleń bez zapytań,
   - zapytania bez spotkań,
   - spadek wyświetleń względem poprzedniego okresu,
   - zdrowy rytm oferty, gdy są wyświetlenia, zapytania i spotkania.
4. Każdy insight zawiera:
   - kod,
   - poziom `info`, `warning` albo `success`,
   - tytuł,
   - opis,
   - sugerowaną akcję.
5. Widok raportu dostał sekcję `Insight agenta`.
6. Insighty są neutralne i nie pokazują danych osobowych leadów.
7. Test raportu właścicielskiego sprawdza generowanie insightu oraz nadal
   pilnuje braku wycieku danych kontaktowych i administracyjnych.

Decyzje techniczne:

1. Insighty raportowe pozostają w domenie raportu UX-7, bez tworzenia jeszcze
   osobnego `InsightsService`. Wydzielenie serwisu ma sens dopiero przy UX-8,
   gdy insighty będą współdzielone przez dashboard, raporty i powiadomienia.
2. Reguły są deterministyczne, krótkie i testowalne. Nie używamy AI ani
   promptów do generowania treści raportu.
3. Backend zwraca maksymalnie trzy insighty, żeby raport pozostał czytelny dla
   właściciela.

Do kolejnej iteracji UX-7:

1. Rozważyć eksport PDF, jeśli ustalimy infrastrukturę generowania dokumentów.
2. Rozważyć automatyczne logowanie wysłania raportu jako aktywności oferty,
   jeśli wprowadzimy docelową wysyłkę email/SMS.

Status UX-7 / iteracja 5 - share flow bez PDF:

Zrobione:

1. Usprawniono akcję `Kopiuj link`.
2. Kopiowany link zawiera teraz wybrany zakres dat:
   - `from`,
   - `to`.
3. Widok raportu potrafi odczytać zakres dat z URL, więc link odtwarza ten sam
   okres raportu po otwarciu.
4. Dodano akcję `Kopiuj podsumowanie`.
5. Kopiowane podsumowanie zawiera:
   - tytuł oferty,
   - okres raportu,
   - najważniejsze KPI,
   - rekomendację,
   - maksymalnie dwa najważniejsze insighty,
   - link do raportu z wybranym zakresem dat.
6. Podsumowanie nie zawiera danych osobowych leadów ani danych technicznych
   analityki.

Decyzje techniczne:

1. Nie dodajemy jeszcze eksportu PDF, ponieważ obecny raport jest drukowalny, a
   wygenerowanie PDF wymaga osobnej decyzji o silniku renderowania dokumentów.
2. Share flow opiera się na schowku i linku wewnętrznym, bez automatycznej
   wysyłki. Dzięki temu nie wchodzimy jeszcze w zgody, statusy doręczeń,
   logowanie wysyłek ani błędy dostawców.
3. Zakres dat w URL używa prostych parametrów `YYYY-MM-DD`, które są walidowane
   po stronie UI przed użyciem.

Do kolejnej iteracji UX-7:

1. Rozważyć eksport PDF, jeśli ustalimy infrastrukturę generowania dokumentów.
2. Rozważyć automatyczne logowanie wysłania raportu jako aktywności oferty,
   jeśli wprowadzimy docelową wysyłkę email/SMS.

Status UX-7 / iteracja 6 - print polish i nota prywatności:

Zrobione:

1. Doprecyzowano widok drukowalny raportu bez dokładania eksportu PDF.
2. Sekcje raportu dostały `break-inside-avoid`, żeby ograniczyć nieczytelne
   rozcinanie kart między stronami podczas drukowania.
3. Dodano stopkę raportu z krótką notą:
   - raport bazuje na danych operacyjnych z EstateFlow,
   - liczby mają charakter informacyjny,
   - raport wspiera rozmowę o dalszych działaniach sprzedażowych.
4. Dodano jasną notę prywatności:
   - raport nie zawiera danych osobowych leadów,
   - raport nie pokazuje technicznych danych analitycznych,
   - szczegółowe dane kontaktowe pozostają w prywatnym CRM agenta.

Decyzje techniczne:

1. Nie dodajemy PDF w tej iteracji. Aktualny zakres daje agentowi działający
   raport do pokazania, wydrukowania, skopiowania i omówienia z właścicielem.
2. Print polish jest rozwiązany w UI, bez osobnego silnika renderowania
   dokumentów i bez dodatkowych zależności.
3. Nota prywatności jest częścią raportu, ponieważ raport może być pokazany
   osobie spoza CRM i powinien jasno komunikować zakres danych.

Status UX-7:

UX-7 można uznać za funkcjonalnie zamknięty w zakresie MVP. Pozostałe tematy,
takie jak automatyczny PDF, logowanie wysyłki raportu lub wysyłka email/SMS,
powinny zostać potraktowane jako osobny zakres techniczny albo przyszła
iteracja po decyzji o infrastrukturze dokumentów i komunikacji.

Do przyszłego backlogu:

1. Eksport PDF po wyborze silnika renderowania dokumentów.
2. Automatyczne logowanie wysłania raportu jako aktywności oferty.
3. Opcjonalna wysyłka email/SMS z obsługą zgód, statusów doręczeń i błędów
   dostawcy.

Status UX-7 / stabilizacja lokalnego generowania raportów:

Zrobione:

1. Sprawdzono lokalny schemat bazy w Dockerze przed odpalaniem migracji.
   Wymagane tabele i kolumny dla raportu właściciela były dostępne, więc
   problem nie wynikał z brakującej migracji.
2. Naprawiono generowanie aktywności raportu właściciela:
   - historia aktywności używa teraz `userId` z requestu,
   - raport nie zakłada już, że relacja `listing.agent` zawsze jest wczytana,
   - brak relacji agenta przy ofercie nie powinien kończyć się błędem 500.
3. Naprawiono raport przychodów:
   - status `closed_won` w breakdownie przychodów jest wybierany jako stały
     literał SQL,
   - unikamy konfliktu parametrów Postgresa, w którym ten sam parametr był
     interpretowany jednocześnie jako tekstowy klucz i status transakcji.
4. Dodano test regresyjny dla raportu właściciela bez relacji `agent`.

Decyzja:

Nie uruchamiano migracji, ponieważ lokalny schemat zawierał wymagane elementy.
Poprawka dotyczyła błędów runtime w zapytaniach i defensywności raportu.

Status UX-7 / polish akcji na profilu oferty:

Zrobione:

1. Uporządkowano akcje w nagłówku profilu oferty, żeby nie układały się w
   przypadkowy zawijany ciąg przy dłuższym tytule.
2. Podzielono działania na dwa czytelne rzędy:
   - komunikacja i raportowanie: `Wiadomość`, `Raport właściciela`,
     `Zmiana ceny`,
   - działania operacyjne i administracyjne: `Spotkanie`,
     `Utwórz transakcję`, `Edytuj`, `Usuń`.
3. Na mobile akcje układają się w przewidywalną siatkę dwóch kolumn.
4. Główna akcja `Wiadomość` dostała większy priorytet wizualny, a destrukcyjne
   `Usuń` pozostaje odseparowane w drugim rzędzie.
5. Tytuł i badge statusów zawijają się spokojniej, bez wypychania akcji poza
   czytelny obszar.

Decyzja:

Nie dodawano dropdown menu ani nowej zależności UI. Obecny zakres poprawia
dostępność i skanowalność akcji, zachowując prosty, jawny zestaw przycisków.

Status UX-7 / stabilizacja tworzenia spotkania z profilu oferty:

Zrobione:

1. Zdiagnozowano błąd 500 przy zapisie spotkania.
2. Przyczyną była niespójność lokalnego schematu `appointments` po migracji na
   kolumny relacyjne snake_case:
   - aktualny kod zapisuje `Appointment.agentId` do kolumny `agent_id`,
   - w bazie pozostała legacy kolumna `agentId` z ograniczeniem `NOT NULL`,
   - nowy insert miał poprawne `agent_id`, ale padał na pustym legacy
     `agentId`.
3. Dodano migrację:
   `apps/api/migrations/20260629_appointment_agent_relation_cleanup.sql`.
4. Migracja:
   - dodaje `agent_id`, jeśli go brakuje,
   - kopiuje wartości z legacy `agentId` do `agent_id`,
   - zdejmuje `NOT NULL` ze starego `agentId`,
   - zakłada FK `agent_id -> agents(id)`,
   - ustawia `agent_id NOT NULL`,
   - dodaje indeks `idx_appointments_agent_id`.

Decyzja:

Nie zmieniano formularza spotkania, ponieważ payload był poprawny. Problem był
po stronie schematu bazy i został rozwiązany migracją naprawczą.

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

Status UX-8 / iteracja 1 - fundament insightów dashboardowych:

Zrobione:

1. Dodano backendowy moduł `InsightsModule`.
2. Dodano `InsightsService` z deterministycznymi regułami bez AI.
3. Dodano endpoint:
   - `GET /api/insights`.
4. Endpoint zwraca maksymalnie cztery insighty dla aktualnego workspace:
   - lead publiczny nieobsłużony ponad 24 godziny,
   - aktywna oferta bez świeżej aktualizacji ponad 14 dni,
   - wysoki odsetek anulowanych spotkań z ostatnich 30 dni,
   - aktywna oferta z wysokim potencjałem prowizji.
5. Każdy insight zawiera:
   - `id`,
   - `severity`,
   - `title`,
   - `description`,
   - `entityType`,
   - `entityId`,
   - `actionLabel`,
   - `actionHref`,
   - `createdAt`.
6. Dodano testy backendowe reguł:
   - generowanie insightów,
   - ograniczenie szumu, gdy progi nie są spełnione,
   - brak danych osobowych leada w payloadzie insightu.
7. Dodano frontendowy kontrakt i hook:
   - `fetchDashboardInsights`,
   - `useDashboardInsights`.
8. Dodano sekcję `Insight dnia` na głównym przeglądzie dashboardu:
   - loading state,
   - error state,
   - empty state,
   - karty insightów z CTA.

Decyzje techniczne:

1. Nie dodano jeszcze zapisu ukrywania insightów. To wymaga osobnego modelu
   trwałości i decyzji, czy ukrycie jest per agent, per workspace, czy per
   encja.
2. Reguły są progowe i deterministyczne, żeby były testowalne i przewidywalne.
3. Payload insightów nie zawiera danych osobowych leadów; CTA prowadzi do
   prywatnego widoku zapytań.
4. Pierwsza iteracja używa istniejących danych i nie wymaga migracji bazy.

Do kolejnej iteracji UX-8:

1. Dodać linki do danych źródłowych w raportach właściciela.
2. Rozszerzyć insighty o zaległe zadania.
3. Rozważyć dedykowany `InsightsService` dla raportów, jeśli reguły zaczną być
   współdzielone między dashboardem i raportem właściciela.

Status UX-8 / iteracja 2 - spadek leadów okres do okresu:

Zrobione:

1. Rozszerzono backendowy `InsightsService` o deterministyczną regułę spadku
   leadów tydzień do tygodnia.
2. Reguła porównuje:
   - liczbę leadów z ostatnich 7 dni,
   - liczbę leadów z poprzednich 7 dni.
3. Insight pojawia się tylko wtedy, gdy:
   - poprzedni okres miał co najmniej 5 leadów,
   - spadek wynosi co najmniej 40%.
4. Zwiększono limit dashboardowych insightów z 4 do 5, żeby cały zakres MVP
   mógł być pokazany bez ucinania jednego z typów sygnałów.
5. Dodano CTA `Zobacz zapytania`, prowadzące do prywatnego widoku zapytań.
6. Rozszerzono testy `InsightsService` o:
   - generowanie insightu spadku leadów,
   - brak insightu, gdy próg spadku nie jest spełniony.

Decyzje techniczne:

1. Reguła liczy wszystkie leady publiczne w scope agencji, niezależnie od
   statusu, ponieważ celem jest pomiar popytu i skuteczności ekspozycji, a nie
   tylko operacyjna obsługa zapytań.
2. Endpoint nadal nie zwraca danych osobowych leadów.
3. Nie dodano migracji ani trwałości ukrywania insightów; to nadal osobny temat
   na późniejszą iterację.

Do kolejnej iteracji UX-8:

1. Dodać linki do danych źródłowych w raportach właściciela.
2. Rozszerzyć insighty o zaległe zadania.
3. Rozważyć trwałe ukrywanie/odkładanie insightów po decyzji, czy ma działać
   per agent, per workspace, czy per encja.

Status UX-8 / iteracja 3 - linki źródłowe w raportach właściciela:

Zrobione:

1. Rozszerzono backendowy kontrakt insightów raportu właściciela o pola:
   - `sourceLabel`,
   - `sourceHref`.
2. Każdy insight raportu ma teraz link do miejsca, w którym agent może
   zweryfikować dane źródłowe albo przejść do działania:
   - profil oferty,
   - lista zapytań przefiltrowana po ofercie,
   - raport właściciela.
3. Zaktualizowano frontendowy typ `ListingOwnerReportInsight`.
4. Na karcie insightu w raporcie właściciela dodano osobny link źródłowy pod
   rekomendowaną akcją.
5. Rozszerzono test raportu właściciela o sprawdzenie `sourceLabel` i
   `sourceHref`.

Decyzje techniczne:

1. Link źródłowy jest częścią prywatnego dashboardu, nie publicznego raportu.
2. Nie dodano danych osobowych leadów do payloadu raportu.
3. Nie zmieniano modelu bazy; rozszerzenie jest kontraktowe i bazuje na
   istniejących widokach dashboardu.

Do kolejnej iteracji UX-8:

1. Rozważyć trwałe ukrywanie/odkładanie insightów po decyzji, czy ma działać
   per agent, per workspace, czy per encja.
2. Jeśli raport właściciela będzie udostępniany publicznie, rozdzielić linki
   źródłowe dashboardu od wersji publicznej raportu.

Status UX-8 / iteracja 4 - zaległe zadania jako insight:

Zrobione:

1. Rozszerzono backendowy `InsightsService` o regułę zaległych zadań CRM.
2. Reguła wykrywa zadania:
   - w statusie `todo`,
   - z terminem `dueAt` wcześniejszym albo równym aktualnej dacie,
   - należące do scope aktualnej agencji.
3. Insight pokazuje:
   - liczbę zaległych zadań,
   - najstarsze zadanie po terminie,
   - CTA `Otwórz zadania`.
4. Rozszerzono model `InsightEntityType` o `task`.
5. Zwiększono limit dashboardowych insightów z 5 do 6, żeby zachować pełny
   zestaw sygnałów MVP.
6. Zsynchronizowano frontendowy kontrakt `DashboardInsightEntityType`.
7. Rozszerzono testy `InsightsService` o generowanie insightu zaległych zadań.

Decyzje techniczne:

1. Wykorzystano istniejący moduł zadań i widok `/dashboard/tasks`; nie dodano
   równoległego mechanizmu follow-upów.
2. Reguła nie tworzy nowych zadań ani powiadomień, tylko interpretuje obecny
   stan pracy agenta.
3. Nie dodano migracji bazy.

Status UX-8 / zamknięcie zakresu MVP:

UX-8 MVP można uznać za domknięty funkcjonalnie:

1. Dashboard ma deterministyczne insighty:
   - lead bez obsługi,
   - spadek liczby leadów,
   - zaległe zadania,
   - oferta bez świeżej aktywności,
   - wysoki odsetek anulowanych spotkań,
   - wysoki potencjał prowizji.
2. Raport właściciela ma insighty i linki źródłowe.
3. Reguły są testowalne, progowe i bez AI.
4. Endpointy nie wymagają dodatkowej migracji.

Poza UX-8 MVP zostają:

1. Personalizacja progów insightów.
2. Oddzielna publiczna wersja raportu właściciela, jeśli raport będzie
   udostępniany poza dashboardem.

Status UX-8 / iteracja 5 - trwałe ukrywanie insightów:

Zrobione:

1. Dodano model `InsightDismissal` dla trwałego ukrywania insightów.
2. Dodano migrację:
   - `apps/api/migrations/20260630_insight_dismissals.sql`.
3. Migracja tworzy tabelę `insight_dismissals` z:
   - `user_id`,
   - `insight_id`,
   - `created_at`,
   - unikalnością `(user_id, insight_id)`.
4. Dodano endpoint:
   - `POST /api/insights/:id/dismiss`.
5. `GET /api/insights` filtruje insighty ukryte przez aktualnego użytkownika.
6. Ukrywanie jest idempotentne dzięki `upsert`.
7. Frontend dostał:
   - `dismissDashboardInsight`,
   - `dismissInsight` w `useDashboardInsights`,
   - przycisk `Ukryj insight` na karcie insightu.
8. Ukrycie działa optymistycznie w UI, a przy błędzie przywraca poprzedni stan.
9. Rozszerzono testy `InsightsService` o:
   - filtrowanie ukrytych insightów,
   - idempotentny zapis ukrycia.

Decyzje techniczne:

1. Ukrycie działa per użytkownik, nie globalnie dla całej agencji.
2. Id insightu ma limit 160 znaków i jest walidowany przed zapisem.
3. Nie dodano jeszcze cofania ukrycia z UI. To warto dodać dopiero razem z
   widokiem zarządzania ukrytymi insightami albo krótkim toastem `Cofnij`.
4. Nie dodano personalizacji progów; to nadal osobny zakres.

Do kolejnej iteracji UX-8 albo osobnego sprintu:

1. Dodać widok/listę ukrytych insightów w ustawieniach.
2. Rozważyć personalizację progów insightów.

Status UX-8 / iteracja 6 - cofanie ukrycia insightu:

Zrobione:

1. Dodano backendowy endpoint:
   - `DELETE /api/insights/:id/dismiss`.
2. Dodano metodę `restoreDashboardInsight` w `InsightsService`.
3. Ujednolicono walidację `insightId` dla ukrywania i przywracania.
4. Rozszerzono testy `InsightsService` o przywracanie ukrytego insightu.
5. Dodano frontendową funkcję:
   - `restoreDashboardInsight`.
6. Rozszerzono hook `useDashboardInsights` o `restoreInsight`.
7. Panel insightów pokazuje teraz po ukryciu krótki banner z przyciskiem
   `Cofnij`.
8. Cofnięcie usuwa wpis z `insight_dismissals` i przywraca kartę insightu w UI.

Decyzje techniczne:

1. Cofnięcie działa bez globalnego systemu akcji w toastach, żeby nie rozszerzać
   komponentu powiadomień tylko dla jednego workflow.
2. Przywrócony insight jest dodawany lokalnie na początek listy; pełne
   odświeżenie nadal pobierze kanoniczny porządek z backendu.
3. Nie dodano jeszcze stałego widoku ukrytych insightów.

Do kolejnej iteracji UX-8 albo osobnego sprintu:

1. Rozważyć personalizację progów insightów.

Status UX-8 / iteracja 7 - lista ukrytych insightów w ustawieniach:

Zrobione:

1. Dodano backendowy endpoint:
   - `GET /api/insights/dismissed`.
2. Endpoint zwraca ukryte insighty aktualnego użytkownika wraz z:
   - `insightId`,
   - `dismissedAt`,
   - aktualnymi danymi insightu, jeśli reguła nadal jest aktywna.
3. Jeśli insight nie jest już aktywny, endpoint zwraca wpis z `insight: null`,
   dzięki czemu użytkownik nadal może usunąć blokadę na przyszłość.
4. Dodano frontendowy kontrakt:
   - `DismissedDashboardInsight`,
   - `DismissedDashboardInsightsResponse`,
   - `fetchDismissedDashboardInsights`.
5. W ustawieniach dodano sekcję `Ukryte insighty`:
   - loading state,
   - error state,
   - empty state,
   - status `Aktywny` / `Nieaktywny`,
   - datę ukrycia,
   - akcję `Przywróć`.
6. Przywrócenie w ustawieniach używa istniejącego endpointu:
   - `DELETE /api/insights/:id/dismiss`.
7. Rozszerzono testy `InsightsService` o listowanie ukrytych insightów z
   aktywnymi danymi oraz fallbackiem dla insightu nieaktywnego.

Decyzje techniczne:

1. Nie dodano kolejnych kolumn do `insight_dismissals`; lista opiera się na
   zapisanym `insightId` i bieżącym przeliczeniu reguł.
2. Nieaktywne insighty są nadal widoczne w ustawieniach, bo użytkownik może
   chcieć odblokować regułę na przyszłość.
3. Widok jest w ustawieniach konta, ponieważ ukrycie działa per użytkownik.

Do kolejnej iteracji UX-8 albo osobnego sprintu:

1. Rozważyć personalizację progów insightów.

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

Status UX-9 / iteracja 1 - zaległe follow-upy w centrum powiadomień:

Zrobione:

1. Rozszerzono istniejący `NotificationsService`, zamiast tworzyć nowy system
   powiadomień.
2. Dodano regułę powiadomień dla zadań:
   - `type = follow_up`,
   - `status = todo`,
   - `dueAt` wcześniejsze niż aktualny czas,
   - w scope aktualnego agenta.
3. Powiadomienie ma stabilne id:
   - `task-overdue-follow-up-{taskId}`.
4. Stabilne id pozwala zachować idempotencję istniejącego mechanizmu
   `notification_reads`.
5. Powiadomienie prowadzi bezpośrednio do najlepszego kontekstu zadania:
   - spotkanie,
   - klient,
   - oferta,
   - lista zadań jako fallback.
6. Rozszerzono kategorię powiadomień o `task` po stronie backendu i frontendu.
7. Dropdown powiadomień dostał ikonę dla kategorii `task`.
8. Dodano test `NotificationsService` sprawdzający:
   - generowanie powiadomienia follow-up po terminie,
   - stabilne id,
   - bezpośredni link do klienta,
   - respektowanie statusu przeczytania.

Decyzje techniczne:

1. Nie dodano migracji, ponieważ wykorzystano istniejące tabele `tasks` i
   `notification_reads`.
2. Nie dodano schedulerów w tej iteracji. Obecny moduł generuje powiadomienia
   deterministycznie przy odczycie, a idempotencja wynika ze stabilnych id i
   tabeli przeczytanych powiadomień.
3. Reguła obejmuje tylko follow-upy, nie wszystkie zadania, żeby nie tworzyć
   szumu operacyjnego w centrum powiadomień.

Do kolejnej iteracji UX-9:

1. Dodać podstawowe ustawienia typów powiadomień w settings.

Status UX-9 / iteracja 2 - aktywne oferty bez świeżej aktywności:

Zrobione:

1. Rozszerzono `NotificationsService` o regułę aktywnych ofert bez świeżej
   aktualizacji.
2. Reguła wykrywa oferty:
   - w statusie `active`,
   - z `updatedAt` starszym niż 14 dni,
   - należące do aktualnego agenta.
3. Powiadomienie ma stabilne id:
   - `listing-stale-active-{listingId}`.
4. Powiadomienie prowadzi bezpośrednio do profilu oferty.
5. Ustalono priorytet niższy niż zaległe spotkania i follow-upy, ale wyższy niż
   stare szkice ofert.
6. Dodano test `NotificationsService` sprawdzający:
   - generowanie powiadomienia,
   - stabilne id,
   - link do profilu oferty,
   - status nieprzeczytany, gdy nie ma wpisu w `notification_reads`.

Decyzje techniczne:

1. Wykorzystano `updatedAt`, ponieważ jest dostępne bez migracji i odzwierciedla
   ostatnią zmianę oferty.
2. Nie dodano powiadomienia dla każdej nieaktywnej oferty bez limitu; reguła
   pobiera maksymalnie trzy najstarsze aktywne oferty, żeby nie generować szumu.
3. Stabilne id zachowuje idempotencję oznaczania jako przeczytane.

Do kolejnej iteracji UX-9:

1. Dodać podstawowe ustawienia typów powiadomień w settings.

Status UX-9 / iteracja 3 - grupowanie centrum powiadomień:

Zrobione:

1. Uporządkowano dropdown powiadomień po stronie frontendu.
2. Dodano grupy operacyjne:
   - `Pilne działania` dla spotkań i zadań,
   - `Leady i klienci` dla leadów publicznych i klientów,
   - `Oferty i dokumenty` dla ofert i dokumentów.
3. Każda grupa pokazuje:
   - nazwę,
   - krótki opis,
   - liczbę elementów w grupie.
4. Zachowano istniejące akcje:
   - przejście do szczegółów,
   - oznaczenie pojedynczego powiadomienia jako przeczytane,
   - oznaczenie wszystkich jako przeczytane.
5. Nie zmieniano backendowego kontraktu `NotificationItem`.

Decyzje techniczne:

1. Grupowanie wykonano w UI na podstawie `category`, ponieważ obecny kontrakt ma
   wystarczające dane i nie wymaga migracji ani nowych endpointów.
2. Nie pokazujemy pustych grup, żeby nie zwiększać szumu w małym dropdownie.
3. Kolejność grup jest stała i operacyjna: najpierw pilne działania, potem
   leady, na końcu portfolio i dokumenty.

Do kolejnej iteracji UX-9:

1. Dodać podstawowe ustawienia typów powiadomień w settings.

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
