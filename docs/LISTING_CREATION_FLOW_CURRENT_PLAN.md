# Plan aktualnego dodawania ogloszenia

Data: 2026-08-20

Cel dokumentu: opisac obecny model dodawania ogloszenia w aplikacji, zeby przed wdrozeniem nowego ekranu startowego typu "Sprzedam / Wynajme + typ nieruchomosci" bylo jasne, ktore sciezki, komponenty, walidacje i kontrakty API sa juz w uzyciu.

Szczegolowa matryca pol dla poszczegolnych typow ogloszen jest opisana w `docs/LISTING_FIELD_MATRIX.md`. Ten plik opisuje przeplyw i punkty integracji, a matryca opisuje, jakie pola maja pojawic sie po wyborze konkretnego typu nieruchomosci.

Kolejnosc bezpiecznego wdrozenia jest rozpisana w `docs/LISTING_CREATION_IMPLEMENTATION_TASKS.md`.

## Zakres

W aplikacji istnieja obecnie dwie glowne sciezki tworzenia ogloszenia:

1. Panel agenta: `/dashboard/listings/new`
2. Publiczny kreator dla wlasciciela/sprzedajacego: `/dodaj-oferte`

Obie sciezki zapisuja ostatecznie dane ogloszenia oparte o te same podstawowe typy:

- `transactionType`: `sale` albo `rent`
- `propertyType`: `apartment`, `house`, `land`, `commercial`, `office`, `garage`

## Wspolne typy i etykiety

Frontend trzyma wspolne definicje w `apps/web/src/lib/listings.ts`:

- `TransactionType.SALE = sale`
- `TransactionType.RENT = rent`
- `PropertyType.APARTMENT = apartment`
- `PropertyType.HOUSE = house`
- `PropertyType.LAND = land`
- `PropertyType.COMMERCIAL = commercial`
- `PropertyType.OFFICE = office`
- `PropertyType.GARAGE = garage`
- `TRANSACTION_TYPE_LABELS`: `Sprzedaz`, `Wynajem`
- `PROPERTY_TYPE_LABELS`: `Mieszkanie`, `Dom`, `Dzialka`, `Lokal uzytkowy`, `Biuro`, `Garaz`

Backend uzywa odpowiadajacych enumow w encji `Listing` oraz DTO tworzenia ogloszenia:

- `apps/api/src/listings/entities/listing.entity.ts`
- `apps/api/src/listings/dto/create-listing.dto.ts`

Wniosek: nowy ekran wyboru nie wymaga nowego modelu danych, jezeli ograniczymy sie do wyboru typu transakcji i typu nieruchomosci. Zmiana dotyczy glownie UX, prefillowania formularzy i przeplywu krokow.

## Sciezka 1: panel agenta

Wejscie:

- Plik strony: `apps/web/src/app/(dashboard)/dashboard/listings/new/page.tsx`
- Komponent formularza: `apps/web/src/components/listings/listing-form.tsx`

Aktualny przebieg:

1. Uzytkownik wchodzi na `/dashboard/listings/new`.
2. Strona renderuje naglowek "Dodaj oferte".
3. Strona od razu renderuje `ListingForm variant="guided"`.
4. Formularz pokazuje sekcje:
   - intro dla pierwszego/ukierunkowanego dodania,
   - panel jakosci oferty,
   - limit aktywnych ofert, jezeli dotyczy,
   - podstawowe dane,
   - prowizje,
   - widocznosc publiczna,
   - zdjecia,
   - opcjonalne szczegoly.
5. W sekcji "Najwazniejsze dane" uzytkownik wybiera obecnie:
   - `propertyType` przez `FormSelect`,
   - `transactionType` przez `FormSelect`.
6. Po submit formularz waliduje dane przez `createListingSchema`.
7. `createListing(data)` wysyla `POST /listings`.
8. Po udanym utworzeniu:
   - opcjonalnie uploadowane sa zdjecia,
   - pokazywany jest toast,
   - uzytkownik jest przekierowany na `/dashboard/listings`.

Minimalne wymagane pola w tej sciezce:

- `title`
- `description`
- `propertyType`
- `transactionType`
- `price`
- `address.city`
- `plotAreaM2` dla domu i dzialki

Pola dynamiczne:

- Widocznosc pol zalezy od `shouldShowListingField(propertyType, field)`.
- Dla domu i dzialki wymagane jest `plotAreaM2`.
- W trybie `guided` szczegoly sa domyslnie schowane, ale czesc pol moze pojawic sie juz w podstawowym kroku, np. `plotAreaM2`.

Istotne ryzyka przy zmianie:

- Jesli nowy ekran startowy przeniesie wybor `propertyType` i `transactionType` poza `ListingForm`, formularz musi dostac wartosci poczatkowe albo odczytac je z URL/state.
- Aktualny `ListingForm` nie ma propsow typu `initialPropertyType` i `initialTransactionType`.
- `transactionType` nie jest obecnie kontrolowanym stanem komponentu tak jak `propertyType`; formularz zapisuje go glownie przez pole formularza.
- Jezeli ukryjemy selekty w formularzu po wyborze startowym, trzeba nadal zapewnic poprawne pola `name="propertyType"` i `name="transactionType"` przy submit.

## Sciezka 2: publiczny kreator

Wejscie:

- Plik strony: `apps/web/src/app/(public)/dodaj-oferte/page.tsx`
- API klienta: `apps/web/src/lib/public-listing-submissions.ts`
- Pola dynamiczne: `apps/web/src/lib/public-listing-form-fields.ts`

Aktualny przebieg:

1. Uzytkownik wchodzi na `/dodaj-oferte`.
2. Jezeli jest zalogowany jako agent, zostaje przekierowany do `/dashboard/listings/new`.
3. Kreator laduje szkic z `localStorage`.
4. Kreator opcjonalnie ustawia miasto z parametru URL.
5. Kreator ma 5 krokow:
   - `Podstawy`
   - `Parametry`
   - `Zdjecia`
   - `Kontakt`
   - `Podsumowanie`
6. Krok `Podstawy` zawiera obecnie:
   - typ transakcji,
   - typ nieruchomosci,
   - tytul,
   - cene/czynsz,
   - miasto,
   - dzielnice,
   - ulice,
   - ustawienie pokazywania dokladnego adresu.
7. Krok `Parametry` dobiera pola po `propertyType` i `transactionType`.
8. Krok `Zdjecia` uploaduje obrazy do endpointu zgłoszen publicznych.
9. Krok `Kontakt` zbiera dane wlasciciela i zgody.
10. Krok `Podsumowanie` pokazuje finalne dane.
11. Submit buduje payload przez `buildSubmissionPayload`.
12. Zapis idzie do:
    - `createPublicListingSubmission` dla niezalogowanego publicznego uzytkownika,
    - `createSellerPublicListingSubmission` dla zalogowanego prywatnego sprzedajacego.
13. Po sukcesie czyszczony jest szkic i uzytkownik trafia na ekran potwierdzenia/sprawdzenia emaila.

Minimalne wymagane pola w kroku `Podstawy`:

- `transactionType`
- `propertyType`
- `title` od 10 do 120 znakow
- `price` wieksze od 0
- `city`

Wymagane pola w kroku `Parametry` zaleza od typu nieruchomosci:

- mieszkanie: `areaM2`, `rooms`
- dom: `areaM2`, `plotAreaM2`, `rooms`
- dzialka: `plotAreaM2`
- lokal uzytkowy: `areaM2`
- biuro: `areaM2`
- garaz: `areaM2`

Dla wynajmu dochodza pola transakcyjne:

- `rentAdministrativeFee`
- `deposit`

Uwaga: pola czynszu administracyjnego i kaucji sa obecnie walidowane jako liczby nieujemne tylko wtedy, gdy sa wypelnione. Nie sa twardo wymagane.

Istotne ryzyka przy zmianie:

- Publiczny kreator juz zawiera wybor transakcji i typu w kroku `Podstawy`, wiec nowy ekran startowy powinien raczej stac sie osobnym krokiem przed obecnym krokiem `Podstawy` albo zastapic pierwsza czesc obecnego kroku.
- `localStorage` przechowuje `transactionType` i `propertyType`; migracja nie jest potrzebna, ale trzeba uwazac, czy powrot do kreatora z zapisanym szkicem nie pomija nowego ekranu wyboru w nieoczekiwany sposob.
- Walidacja `validateStep(0)` zaklada, ze typ transakcji i typ nieruchomosci sa czescia pierwszego kroku.
- `StepParameters`, `StepSummary` i `buildSubmissionPayload` zakladaja, ze typy sa juz ustawione przed przejsciem dalej.

## Obecny model danych przy zapisie

Panel agenta wysyla:

- endpoint: `POST /listings`
- frontend: `createListing(data)`
- walidacja frontend: `createListingSchema`
- walidacja backend: `CreateListingDto`

Publiczny kreator wysyla:

- endpoint publiczny: `POST /public-listing-submissions`
- endpoint sprzedajacego: `POST /public-listing-submissions/seller`
- frontend: `CreatePublicListingSubmissionInput`
- payload zawiera sekcje:
  - `listing`
  - `address`
  - `publicSettings`
  - `images`
  - `agentCollaboration`
  - dane kontaktowe i zgody

## Docelowy kierunek zmiany

Nowy ekran powinien byc inspirowany ukladem:

- kolumna/sekcja `Sprzedam`
- kolumna/sekcja `Wynajme`
- pod kazda sekcja lista typow nieruchomosci
- klikniecie wybiera jednoczesnie:
  - `transactionType`
  - `propertyType`

Proponowane mapowanie przyciskow:

Sprzedam:

- Mieszkanie -> `sale` + `apartment`
- Dom -> `sale` + `house`
- Dzialka -> `sale` + `land`
- Lokal uzytkowy -> `sale` + `commercial`
- Biuro -> `sale` + `office`
- Garaz -> `sale` + `garage`

Wynajme:

- Mieszkanie -> `rent` + `apartment`
- Pokoj -> wymaga decyzji produktowej, bo obecny model nie ma `room`
- Dom -> `rent` + `house`
- Dzialka -> `rent` + `land`
- Lokal uzytkowy -> `rent` + `commercial`
- Biuro -> `rent` + `office`
- Garaz -> `rent` + `garage`

## Decyzja produktowa: Pokoj

W inspiracji z nieruchomosci-online.pl w sekcji `Wynajme` wystepuje `Pokoj`.

Obecny system nie ma typu `room`. Sa dwie mozliwe drogi:

1. Bez zmiany modelu danych: nie pokazujemy `Pokoj` w pierwszej wersji albo mapujemy go tymczasowo na `apartment` z dodatkowa flaga/opisem. To jest szybsze, ale semantycznie slabsze.
2. Pelna zmiana modelu: dodajemy `PropertyType.ROOM` / `room` w frontendzie, backendzie, walidacjach, filtrach, katalogu, formularzach, raportach, matchingach i testach. To jest poprawniejsze, ale ma wiekszy zakres.

Rekomendacja do pierwszego wdrozenia: nie dodawac `Pokoj`, dopoki nie zaplanujemy pelnej obslugi typu `room`. Jezeli ma byc widoczny od razu, potraktowac to jako osobny mini-projekt migracyjny.

## Opcje wdrozenia nowego startu

### Opcja A: wspolny komponent wyboru

Tworzymy wspolny komponent, np. `ListingIntentSelector`, ktory renderuje wybor `Sprzedam/Wynajme + typ nieruchomosci`.

Zastosowanie:

- publiczny kreator: pierwszy ekran przed danymi podstawowymi
- panel agenta: ekran przed `ListingForm` albo gorna sekcja formularza

Zalety:

- jeden UX i jedna konfiguracja opcji
- mniejsze ryzyko rozjazdu etykiet
- latwiejsze testowanie

Wady:

- trzeba dopasowac dwa rozne przeplywy stanu

### Opcja B: tylko publiczny kreator

Nowy ekran dodajemy najpierw tylko na `/dodaj-oferte`.

Zalety:

- mniejszy zakres
- publiczny flow jest najbardziej podobny do inspiracji

Wady:

- panel agenta nadal bedzie mial stary model startu
- pozniej trzeba bedzie ujednolic UX

### Opcja C: tylko dashboard agenta

Nowy ekran dodajemy tylko przed `/dashboard/listings/new`.

Zalety:

- szybka poprawa pracy agentow

Wady:

- nie odpowiada w pelni inspiracji publicznej strony
- publiczny kreator nadal ma selecty w kroku `Podstawy`

## Rekomendowany plan implementacji po akceptacji kierunku

1. Ustalic, czy zmiana dotyczy obu sciezek, czy tylko publicznego kreatora.
2. Ustalic decyzje dla typu `Pokoj`.
3. Dodac wspolna konfiguracje opcji wyboru transakcja + typ nieruchomosci.
4. Dodac komponent startowy wyboru.
5. W publicznym kreatorze:
   - dodac krok wyboru przed obecnym `Podstawy` albo przebudowac `StepBasics`,
   - po kliknieciu zapisac `transactionType` i `propertyType` w `draft`,
   - przejsc do kolejnego kroku,
   - usunac albo zablokowac powtorne selecty w `StepBasics`,
   - zaktualizowac walidacje krokow i pasek postepu.
6. W dashboardzie:
   - dodac stan startowy na stronie `/dashboard/listings/new`,
   - przekazac wybrane wartosci do `ListingForm`,
   - dodac obsluge wartosci poczatkowych w `ListingForm`,
   - zdecydowac, czy selecty maja byc ukryte, czy widoczne jako edytowalne.
7. Zaktualizowac testy i scenariusze reczne.

## Testy i weryfikacja po wdrozeniu

Minimum do sprawdzenia:

- wybor `Sprzedam -> Mieszkanie` uzupelnia `sale + apartment`
- wybor `Wynajme -> Mieszkanie` uzupelnia `rent + apartment`
- dla domu/dzialki nadal wymagana jest powierzchnia dzialki
- dla wynajmu widoczne sa pola `Czynsz administracyjny` i `Kaucja`
- publiczny szkic w `localStorage` zachowuje wybrane typy
- powrot w kreatorze nie kasuje wybranego typu
- submit publiczny buduje poprawny payload
- submit dashboardowy wysyla poprawny `POST /listings`
- edycja istniejacego ogloszenia nie zostaje przypadkowo zmieniona
- agent zalogowany nadal jest przekierowywany z `/dodaj-oferte` do dashboardu

## Otwarte pytania

1. Czy nowy ekran wyboru ma wejsc w obu sciezkach, czy najpierw tylko w publicznym kreatorze?
2. Czy `Pokoj` ma byc obslugiwany w pierwszym wdrozeniu?
3. Czy po wyborze startowym uzytkownik moze pozniej zmienic `Sprzedam/Wynajme` i typ nieruchomosci w formularzu?
4. Czy ekran startowy ma miec dodatkowe CTA dla biur/deweloperow, jak w inspiracji, czy zostawiamy to poza zakresem?
5. Czy ceny/promocje widoczne w inspiracji maja znaczenie dla naszego produktu, czy chodzi tylko o model wyboru?
