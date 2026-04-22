# Integracje Ofert z Portalami Ogłoszeniowymi

Dokument opisuje, jak obecny system EstateFlow może zostać rozszerzony o oficjalne integracje API z portalami ogłoszeniowymi typu Otodom, OLX, Domiporta i podobnymi.

Zakres dokumentu:
- tylko oficjalne integracje API partnerów
- brak wariantów scrapingowych, automatyzacji przeglądarki i półmanualnych obejść
- architektura gotowa na wiele portali, ale niezależna od tego, czy dany partner udostępni już dostęp produkcyjny

---

## 1. Stan obecny systemu

Aktualnie EstateFlow posiada własny, wewnętrzny moduł ofert i traktuje go jako główne źródło prawdy dla danych nieruchomości.

### Obecne elementy systemu

- Backendowy CRUD ofert znajduje się w:
  - `apps/api/src/listings/listings.controller.ts`
  - `apps/api/src/listings/listings.service.ts`
- Główny model danych oferty znajduje się w:
  - `apps/api/src/listings/entities/listing.entity.ts`
  - `apps/api/src/listings/entities/address.entity.ts`
  - `apps/api/src/listings/entities/listing-image.entity.ts`
- Frontend korzysta z obecnego API ofert przez:
  - `apps/web/src/lib/listings.ts`

### Co dziś obsługuje moduł `listings`

- tworzenie oferty
- pobieranie listy ofert
- filtrowanie i paginację
- pobieranie pojedynczej oferty
- edycję oferty
- zmianę statusu i rollback statusu
- usuwanie lub archiwizację

### Czego dziś brakuje

W obecnym systemie nie ma jeszcze:
- encji połączeń z portalami
- encji publikacji oferty na portalu
- zewnętrznych identyfikatorów ofert partnera
- statusów synchronizacji per portal
- logów wymiany z API partnera
- endpointów publikacji, synchronizacji i wycofania z portalu
- warstwy adapterów per portal
- kolejkowania zadań publikacyjnych

Wniosek: obecny moduł `listings` jest dobrym punktem startowym, ale publikacja na portalach powinna zostać dobudowana jako osobna warstwa integracyjna, a nie jako zestaw warunków dopisywanych bezpośrednio do obecnego CRUD.

---

## 2. Założenia architektoniczne

### Główna zasada

`Listing` pozostaje wewnętrznym źródłem prawdy w EstateFlow. Portale zewnętrzne są tylko kanałami dystrybucji oferty.

Oznacza to, że:
- użytkownik zarządza ofertą w EstateFlow
- system buduje payload partnera na podstawie lokalnego modelu
- odpowiedź partnera zapisuje się jako stan publikacji, a nie jako osobna główna wersja oferty
- błędy portalu nie mogą blokować podstawowego działania modułu `listings`

### Docelowy podział odpowiedzialności

Rekomendowana nowa warstwa w API:
- moduł `portal-integrations`

W jego obrębie:
- zarządzanie połączeniami z partnerami
- publikacja i synchronizacja ofert
- walidacja gotowości oferty pod konkretny portal
- translacja lokalnego modelu na payload partnera
- odbiór statusów i błędów z partnera
- logowanie prób synchronizacji

### Adapter per portal

Każdy portal powinien mieć osobny adapter, np.:
- `OtodomAdapter`
- `OlxAdapter`
- `DomiportaAdapter`

Każdy adapter powinien implementować wspólny kontrakt logiczny:
- `publishListing`
- `updateListing`
- `unpublishListing`
- `getPublicationStatus`
- `validateListing`

Taki układ pozwala:
- dodawać nowe portale bez ruszania core logiki
- zachować różnice między partnerami w izolacji
- łatwiej testować każdy portal osobno

### Model asynchroniczny

Publikacja i synchronizacja nie powinny odbywać się bezpośrednio w request-response użytkownika.

Rekomendacja:
- request użytkownika zapisuje intencję publikacji
- system tworzy zadanie synchronizacyjne
- worker wykonuje wywołanie do API partnera
- wynik zapisuje się do tabel publikacji i logów

Korzyści:
- retry przy błędach chwilowych
- lepsza odporność na timeouty partnera
- brak blokowania UI na długie requesty
- możliwość kolejkowania wielu aktualizacji

---

## 3. Docelowy model danych

### 3.1. `PortalConnection`

Encja reprezentująca skonfigurowane połączenie z partnerem dla agencji albo agenta.

Minimalne pola:
- `id`
- `portal`
- `scopeType` (`agency` lub `agent`)
- `scopeId`
- `status`
- `authType`
- `credentialsRef`
- `createdAt`
- `updatedAt`
- `lastValidatedAt`
- `lastError`

Znaczenie:
- `portal` identyfikuje partnera
- `scopeType` i `scopeId` określają, czy integracja jest przypięta do całego biura czy konkretnego agenta
- `credentialsRef` wskazuje bezpieczne miejsce przechowywania sekretów
- `status` opisuje, czy połączenie jest gotowe do użycia

Uwaga:
- tokenów i sekretów nie należy trzymać jawnie w zwykłych kolumnach biznesowych, jeśli da się użyć bezpieczniejszego storage lub szyfrowania

### 3.2. `ListingPublication`

Encja reprezentująca publikację konkretnej oferty na konkretnym portalu.

Minimalne pola:
- `id`
- `listingId`
- `portalConnectionId`
- `portal`
- `externalListingId`
- `syncStatus`
- `publicationStatus`
- `payloadHash`
- `lastSyncAt`
- `lastSuccessAt`
- `lastError`
- `createdAt`
- `updatedAt`

Znaczenie:
- `listingId` wiąże publikację z lokalną ofertą
- `externalListingId` przechowuje identyfikator nadany przez partnera
- `syncStatus` opisuje stan techniczny synchronizacji
- `publicationStatus` opisuje stan biznesowy publikacji
- `payloadHash` pozwala wykrywać, czy dane do wysłania faktycznie się zmieniły

Rekomendowane wartości `syncStatus`:
- `pending`
- `in_progress`
- `synced`
- `failed`
- `retry_scheduled`
- `disabled`

Rekomendowane wartości `publicationStatus`:
- `draft`
- `published`
- `unpublished`
- `archived`
- `rejected`

### 3.3. `PortalSyncLog`

Opcjonalna, ale bardzo zalecana tabela audytowa.

Minimalne pola:
- `id`
- `listingPublicationId`
- `operation`
- `requestId`
- `status`
- `errorCode`
- `errorMessage`
- `startedAt`
- `finishedAt`

Przeznaczenie:
- debugowanie błędów partnera
- historia retry
- audyt wsparcia technicznego
- podstawa do widoku statusów w UI

---

## 4. Mapowanie obecnego modelu `Listing`

Obecna encja `Listing` jest dobrym rdzeniem integracji, ale nie wszystkie pola będą wystarczające dla każdego partnera.

### Pola gotowe do wykorzystania

Z obecnego modelu bezpośrednio nadają się m.in.:
- `title`
- `description`
- `propertyType`
- `transactionType`
- `price`
- `currency`
- `areaM2`
- `rooms`
- `bathrooms`
- `floor`
- `totalFloors`
- `yearBuilt`
- `isPremium`
- `status`
- `publishedAt`

Z encji adresu:
- `city`
- `street`
- `postalCode`
- `district`
- `voivodeship`
- `lat`
- `lng`

Z encji zdjęć:
- `url`
- `order`
- `isPrimary`

### Obszary wymagające warstwy translacji

Różnice per portal zwykle pojawią się w:
- słownikach typów nieruchomości
- słownikach typów transakcji
- wymaganych polach lokalizacyjnych
- zasadach publikacji dokładnego adresu
- zasadach kolejności i liczby zdjęć
- długościach pól tekstowych
- listach pól obowiązkowych zależnych od kategorii

Dlatego potrzebna jest warstwa:
- walidacji kompletności przed publikacją
- translacji enumów lokalnych na enumy partnera
- mapowania opcjonalnych pól do wymogów konkretnego API
- normalizacji zdjęć i metadanych

### Walidacja gotowości oferty

Przed publikacją system powinien sprawdzić dwa poziomy gotowości:

1. Gotowość ogólna w EstateFlow:
- oferta istnieje
- oferta należy do zalogowanego agenta lub jego organizacji
- oferta nie jest zarchiwizowana
- oferta zawiera minimalny komplet danych biznesowych

2. Gotowość portalowa:
- istnieje aktywne `PortalConnection`
- konkretne pole wymagane przez partnera jest uzupełnione
- typ nieruchomości i transakcji da się przetłumaczyć na słowniki partnera
- liczba i jakość zdjęć spełnia wymagania partnera

Jeżeli walidacja portalowa nie przejdzie, system nie powinien wysyłać requestu do partnera. Zamiast tego ma zwrócić listę braków do użytkownika.

---

## 5. Proponowane API wewnętrzne EstateFlow

Poniższe endpointy opisują kontrakt logiczny po stronie EstateFlow. Finalne payloady do partnerów pozostają wewnętrznym szczegółem adapterów.

### `POST /api/portal-connections`

Cel:
- dodać lub zainicjować połączenie z partnerem

Przykładowy zakres danych:
- portal
- scope połączenia
- typ autoryzacji
- dane potrzebne do handshake lub zapisania referencji do credentiali

Odpowiedź:
- stan połączenia
- informacja, czy wymagana jest dodatkowa autoryzacja lub aktywacja biznesowa

### `GET /api/portal-connections`

Cel:
- pobrać listę skonfigurowanych połączeń i ich statusów

Odpowiedź:
- portal
- status połączenia
- data ostatniej walidacji
- ostatni błąd
- zakres obowiązywania połączenia

### `POST /api/listings/:id/publish`

Cel:
- opublikować ofertę na jednym lub wielu portalach

Zachowanie:
- endpoint waliduje gotowość
- tworzy lub aktualizuje rekord `ListingPublication`
- odkłada zadanie do kolejki
- zwraca stan `pending` lub walidacyjne błędy wejściowe

### `POST /api/listings/:id/sync`

Cel:
- wymusić ponowną synchronizację oferty już powiązanej z portalem

Zachowanie:
- używane przy retry ręcznym albo po naprawie danych
- nie powinno dublować publikacji, jeśli istnieje `externalListingId`

### `POST /api/listings/:id/unpublish`

Cel:
- wycofać ofertę z wybranego portalu lub wszystkich portali

Zachowanie:
- zleca deaktywację po stronie partnera
- aktualizuje `publicationStatus`
- zachowuje log historyczny

### `GET /api/listings/:id/publications`

Cel:
- pokazać użytkownikowi statusy publikacji tej oferty

Odpowiedź:
- lista portali
- identyfikator zewnętrzny
- stan publikacji
- stan synchronizacji
- data ostatniego sukcesu
- ostatni błąd

---

## 6. Flow end-to-end

### 6.1. Publikacja nowej oferty

1. Użytkownik zapisuje ofertę w EstateFlow.
2. Użytkownik wybiera publikację na konkretnym portalu.
3. API sprawdza uprawnienia i gotowość danych.
4. System tworzy lub aktualizuje rekord `ListingPublication` ze statusem `pending`.
5. Zadanie trafia do kolejki.
6. Worker pobiera aktualny `Listing`, `Address`, `ListingImage` i `PortalConnection`.
7. Adapter buduje payload zgodny z API partnera.
8. Adapter wywołuje oficjalne API partnera.
9. Wynik jest zapisywany:
   - sukces: `externalListingId`, `syncStatus = synced`, `publicationStatus = published`
   - błąd: `syncStatus = failed`, `lastError`
10. UI prezentuje aktualny stan publikacji.

### 6.2. Synchronizacja zmian

1. Użytkownik edytuje ofertę lokalnie.
2. System wykrywa, że oferta ma aktywne publikacje.
3. Tworzona jest synchronizacja dla portali, których payload uległ zmianie.
4. `payloadHash` pozwala pominąć portale bez faktycznej zmiany danych.
5. Adapter wykonuje aktualizację po stronie partnera.
6. Wynik zapisuje się w `ListingPublication` i `PortalSyncLog`.

### 6.3. Wycofanie oferty

1. Użytkownik ręcznie wycofuje ofertę albo lokalny status przechodzi w stan, który wymaga zdjęcia ogłoszenia.
2. System zleca `unpublish` w adapterze.
3. Po sukcesie `publicationStatus` przechodzi na `unpublished` lub `archived`.
4. Historia wycofania pozostaje w logach.

---

## 7. Obsługa błędów i retry

### Typowe klasy błędów

- brak lub wygaśnięcie autoryzacji partnera
- brak wymaganego pola w ofercie
- odrzucenie payloadu przez walidację partnera
- timeout lub chwilowa niedostępność API
- konflikt wersji lub brak oferty po stronie partnera
- ograniczenia rate limit

### Rekomendowane zachowanie systemu

- błędy walidacyjne lokalne:
  - bez wywołania partnera
  - natychmiastowa informacja dla użytkownika
- błędy chwilowe partnera:
  - automatyczny retry
  - backoff i limit prób
- błędy trwałe:
  - status `failed`
  - czytelny `lastError`
  - możliwość ręcznego `sync`

### Retry policy

Minimalna rekomendacja:
- 3 do 5 prób
- backoff wykładniczy
- osobne oznaczenie, czy błąd nadaje się do retry

Nie należy retryować bez końca:
- błędów autoryzacji
- błędów walidacyjnych payloadu
- odrzuceń biznesowych partnera

---

## 8. Ograniczenia biznesowe i techniczne

### Ograniczenia po stronie partnerów

Każdy portal może mieć inne zasady:
- dostęp tylko dla partnerów biznesowych
- oddzielne środowiska sandbox i production
- konieczność podpisania umowy
- whitelisting IP lub aplikacji
- review aplikacji przed aktywacją
- różne limity requestów i formatów danych

Dlatego system powinien rozdzielać:
- wsparcie architektoniczne dla portalu
- realną gotowość biznesową do uruchomienia integracji

Innymi słowy:
- portal może być wspierany w kodzie
- ale pozostawać nieaktywny dla klientów do momentu uzyskania oficjalnego dostępu

### Ograniczenia po stronie obecnego modelu EstateFlow

Na obecnym etapie może zabraknąć niektórych pól wymaganych przez konkretne portale, np.:
- dodatkowych parametrów nieruchomości
- bardziej szczegółowych kategorii
- pełniejszej klasyfikacji standardu wykończenia
- rozbudowanych metadanych zdjęć

Wniosek:
- pierwsza wersja integracji nie powinna zakładać, że obecny model `Listing` wystarczy dla każdego partnera bez rozszerzeń

---

## 9. Rekomendowana kolejność wdrożenia

### Etap 1. Wspólny model i kontrakt integracji

- dodać moduł `portal-integrations`
- dodać encje `PortalConnection`, `ListingPublication`, `PortalSyncLog`
- dodać interfejs adaptera i podstawowe statusy
- dodać endpointy zarządzające połączeniami i publikacjami

### Etap 2. Jeden portal pilotażowy

- wdrożyć pierwszy adapter dla partnera z realnie dostępnym oficjalnym API
- uruchomić publikację, aktualizację i wycofanie
- zbudować walidację gotowości oferty per portal

### Etap 3. Widoczność statusów w UI

- dodać sekcję publikacji na widoku oferty
- pokazać statusy synchronizacji i ostatnie błędy
- umożliwić ręczne ponowienie synchronizacji

### Etap 4. Rozszerzanie na kolejne portale

- dopisywać kolejne adaptery bez zmian w core logice
- rozszerzać translację enumów i walidację portalową
- rozwijać monitoring i narzędzia supportowe

---

## 10. Testy i scenariusze akceptacyjne

Minimalny zakres testów dla wdrożenia:

1. Publikacja poprawnej oferty na wspierany portal.
2. Próba publikacji oferty z brakującymi polami wymaganymi przez portal.
3. Aktualizacja oferty już opublikowanej.
4. Wycofanie oferty lokalnie i propagacja na portal.
5. Błąd autoryzacji po stronie partnera.
6. Timeout lub chwilowa niedostępność API partnera.
7. Konflikt danych, gdy oferta nie istnieje już po stronie portalu.
8. Retry zakończony sukcesem po błędzie chwilowym.
9. Retry zakończony statusem `failed` z czytelnym komunikatem.
10. Brak ponownej synchronizacji, jeśli `payloadHash` nie wykrywa zmian.

Rekomendowane poziomy testów:
- testy jednostkowe adapterów
- testy serwisu orkiestrującego publikacje
- testy integracyjne endpointów API EstateFlow
- testy kontraktowe lub sandboxowe z oficjalnym API partnera, jeśli partner to umożliwia

---

## 11. Decyzje projektowe

Na potrzeby tej specyfikacji przyjmujemy następujące decyzje:

- `Listing` pozostaje centralnym źródłem prawdy.
- Integracje portalowe są osobnym modułem backendowym.
- Publikacja działa asynchronicznie przez kolejkę zadań.
- Integracja ma wspólny kontrakt i osobny adapter per portal.
- System wspiera tylko oficjalne API partnerów.
- Dostępność biznesowa partnera jest niezależna od gotowości architektury.
- Dokument nie zakłada, że Otodom, OLX i Domiporta mają identyczny model autoryzacji lub publikacji.

---

## 12. Podsumowanie

Najbezpieczniejszy kierunek rozwoju to dobudowanie nad obecnym modułem `listings` osobnej warstwy `portal-integrations`, która:
- przechowuje konfigurację połączeń z partnerami
- utrzymuje publikacje ofert per portal
- tłumaczy model EstateFlow na payloady partnerów
- obsługuje retry, błędy i statusy synchronizacji

Taki model pozwala rozwijać integracje portalowe stopniowo, bez destabilizacji obecnego CRM i bez uzależniania całego systemu od specyfiki jednego partnera.
