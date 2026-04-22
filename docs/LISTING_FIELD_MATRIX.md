# Dynamiczny Formularz Oferty — Matryca Pól

Dokument definiuje, jakie pola powinny być widoczne w formularzu tworzenia i edycji oferty w zależności od wybranego typu nieruchomości.

Cel dokumentu:
- uporządkować logikę dynamicznego formularza ofert
- rozdzielić pola wspólne od pól specyficznych dla typu nieruchomości
- wskazać, które pola istnieją już dziś w systemie, a które są planowane
- stworzyć jedno miejsce aktualizacji wraz z rozwojem aplikacji i przyszłymi integracjami z portalami

Dokument jest żywy i powinien być aktualizowany przy każdej zmianie:
- formularza oferty
- modelu danych `Listing`
- wymagań portalowych
- walidacji backendowej lub frontendowej

---

## 1. Stan obecny

Aktualnie formularz oferty korzysta z jednego, wspólnego zestawu pól dla wszystkich typów nieruchomości.

Powiązane pliki:
- `apps/web/src/components/listings/listing-form.tsx`
- `apps/web/src/lib/listings.ts`
- `apps/api/src/listings/dto/create-listing.dto.ts`
- `apps/api/src/listings/dto/update-listing.dto.ts`
- `apps/api/src/listings/entities/listing.entity.ts`
- `apps/api/src/common/enums/index.ts`

Obecnie dostępne typy nieruchomości:
- `apartment` — mieszkanie
- `house` — dom
- `land` — działka
- `commercial` — lokal użytkowy
- `office` — biuro
- `garage` — garaż

Obecnie wspierane pola ofertowe:
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
- `address.city`
- `address.street`
- `address.postalCode`
- `address.district`
- `address.voivodeship`

Wniosek:
- formularz nie jest jeszcze dynamiczny
- część pól jest dziś pokazywana także tam, gdzie nie ma większego sensu biznesowego
- przed wdrożeniem logiki dynamicznej trzeba jasno zdefiniować matrycę pól per typ nieruchomości

---

## 2. Zasady projektowe

### 2.1. Główna zasada

Formularz powinien składać się z:
- pól wspólnych dla wszystkich ofert
- pól warunkowych zależnych od `propertyType`
- w przyszłości także z pól zależnych od portalu publikacji

### 2.2. Priorytet źródła prawdy

Na poziomie produktu źródłem prawdy dla matrycy jest ten dokument.

Na poziomie technicznym logika musi być spójna w trzech miejscach:
- UI formularza
- walidacja frontendowa
- walidacja backendowa i model danych

### 2.3. Zasada dla integracji portalowych

Dynamiczny formularz w aplikacji powinien najpierw odzwierciedlać sens biznesowy typu nieruchomości, a dopiero później być rozszerzany o wymagania konkretnych portali.

To oznacza:
- nie każdy wymóg portalu musi od razu trafić do podstawowego formularza
- część pól może być oznaczona jako „wymagane tylko do publikacji na wybranych portalach”
- matryca powinna rozróżniać pola bazowe od pól portalowych

---

## 3. Statusy pól

W tym dokumencie stosujemy trzy statusy pól:

- `core` — pole istnieje już dziś w systemie i powinno być uwzględniane w formularzu
- `planned` — pole jeszcze nie istnieje w modelu lub formularzu, ale powinno zostać dodane
- `portal` — pole opcjonalne na poziomie bazowego formularza, ale może być wymagane przy integracjach z portalami

Dodatkowo każde pole powinno mieć jeden z poziomów widoczności:
- `always` — pokazuj zawsze dla danego typu
- `optional` — pokazuj dla danego typu, ale nie wymagaj na poziomie podstawowego formularza
- `hidden` — nie pokazuj dla danego typu

---

## 4. Pola wspólne dla wszystkich typów

Poniższe pola powinny być pokazywane dla wszystkich typów nieruchomości.

| Pole | Status | Widoczność | Uwagi |
|------|--------|------------|-------|
| `title` | `core` | `always` | Tytuł oferty |
| `description` | `core` | `always` | Opis marketingowy oferty |
| `propertyType` | `core` | `always` | Steruje logiką dynamiczną formularza |
| `transactionType` | `core` | `always` | Sprzedaż / wynajem |
| `price` | `core` | `always` | Cena oferty |
| `currency` | `core` | `always` | Domyślnie PLN |
| `address.city` | `core` | `always` | Miasto |
| `address.street` | `core` | `optional` | Ulica może być ukrywana lub ograniczana przy niektórych publikacjach |
| `address.postalCode` | `core` | `optional` | Kod pocztowy |
| `address.district` | `core` | `optional` | Dzielnica / rejon |
| `address.voivodeship` | `core` | `optional` | Województwo |

W przyszłości do grupy wspólnej mogą dojść:
- zdjęcia oferty
- współrzędne `lat` i `lng`
- status wykończenia
- rynek pierwotny / wtórny

---

## 5. Matryca pól per typ nieruchomości

## 5.1. `apartment` — mieszkanie

Pola widoczne:

| Pole | Status | Widoczność | Uwagi |
|------|--------|------------|-------|
| `areaM2` | `core` | `always` | Powierzchnia użytkowa |
| `rooms` | `core` | `always` | Liczba pokoi |
| `bathrooms` | `core` | `optional` | Dopuszczalne jako opcjonalne |
| `floor` | `core` | `always` | Kluczowe dla mieszkania |
| `totalFloors` | `core` | `optional` | Liczba pięter budynku |
| `yearBuilt` | `core` | `optional` | Rok budowy budynku |
| `buildingType` | `planned` | `optional` | Np. blok, kamienica, apartamentowiec |
| `heatingType` | `planned` | `optional` | Może być wymagane przez portale |
| `marketType` | `planned` | `optional` | Pierwotny / wtórny |
| `balcony` | `planned` | `optional` | Cecha użytkowa |
| `elevator` | `planned` | `optional` | Często ważne w filtrach |

Pola ukryte:
- `plotAreaM2`

## 5.2. `house` — dom

Pola widoczne:

| Pole | Status | Widoczność | Uwagi |
|------|--------|------------|-------|
| `areaM2` | `core` | `always` | Powierzchnia domu |
| `rooms` | `core` | `always` | Liczba pokoi |
| `bathrooms` | `core` | `optional` | Liczba łazienek |
| `yearBuilt` | `core` | `optional` | Rok budowy |
| `plotAreaM2` | `planned` | `always` | Wielkość działki, bardzo ważne pole dla domu |
| `buildingFloors` | `planned` | `optional` | Zamiast logiki piętra lokalu |
| `houseType` | `planned` | `optional` | Wolnostojący, bliźniak, szeregowiec |
| `buildingCondition` | `planned` | `optional` | Stan budynku |
| `heatingType` | `planned` | `optional` | Typ ogrzewania |
| `garageSpaces` | `planned` | `optional` | Liczba miejsc garażowych |

Pola ukryte:
- `floor`

Pole do rozważenia:
- `totalFloors`

Uwaga:
- dla domu pole `totalFloors` może mieć sens tylko wtedy, gdy semantycznie oznacza liczbę kondygnacji budynku, a nie liczbę pięter budynku wielorodzinnego
- rekomendacja długoterminowa: zastąpić je bardziej precyzyjnym polem `buildingFloors`

## 5.3. `land` — działka

Pola widoczne:

| Pole | Status | Widoczność | Uwagi |
|------|--------|------------|-------|
| `plotAreaM2` | `planned` | `always` | Główne pole dla działki |
| `plotType` | `planned` | `always` | Budowlana, rolna, inwestycyjna, rekreacyjna |
| `plotWidthM` | `planned` | `optional` | Parametr techniczny |
| `plotLengthM` | `planned` | `optional` | Parametr techniczny |
| `accessRoadType` | `planned` | `optional` | Asfaltowa, utwardzona, polna |
| `utilities` | `planned` | `optional` | Media: prąd, woda, gaz, kanalizacja |
| `localPlanStatus` | `planned` | `optional` | MPZP / WZ |

Pola ukryte:
- `rooms`
- `bathrooms`
- `floor`
- `totalFloors`
- `yearBuilt`

Pole do rozważenia:
- `areaM2`

Uwaga:
- dla działki warto docelowo ujednolicić logikę i pokazywać tylko `plotAreaM2`, zamiast mieszać ją z `areaM2`

## 5.4. `commercial` — lokal użytkowy

Pola widoczne:

| Pole | Status | Widoczność | Uwagi |
|------|--------|------------|-------|
| `areaM2` | `core` | `always` | Powierzchnia lokalu |
| `rooms` | `core` | `optional` | Jeśli lokal ma podział na pomieszczenia |
| `bathrooms` | `core` | `optional` | Sanitariaty |
| `floor` | `core` | `optional` | Istotne w budynkach wielopiętrowych |
| `totalFloors` | `core` | `optional` | Informacja o budynku |
| `yearBuilt` | `core` | `optional` | Rok budowy |
| `commercialType` | `planned` | `always` | Handel, usługi, gastronomia, magazyn itp. |
| `shopWindow` | `planned` | `optional` | Witryna |
| `parkingSpaces` | `planned` | `optional` | Miejsca parkingowe |
| `heatingType` | `planned` | `optional` | Typ ogrzewania |

## 5.5. `office` — biuro

Pola widoczne:

| Pole | Status | Widoczność | Uwagi |
|------|--------|------------|-------|
| `areaM2` | `core` | `always` | Powierzchnia biura |
| `rooms` | `core` | `optional` | Liczba gabinetów / pokoi |
| `bathrooms` | `core` | `optional` | Zaplecze socjalne |
| `floor` | `core` | `optional` | Piętro ma sens |
| `totalFloors` | `core` | `optional` | Liczba pięter budynku |
| `yearBuilt` | `core` | `optional` | Rok budowy |
| `officeClass` | `planned` | `optional` | A / B / C lub odpowiednik biznesowy |
| `meetingRooms` | `planned` | `optional` | Sale konferencyjne |
| `parkingSpaces` | `planned` | `optional` | Parkowanie |
| `airConditioning` | `planned` | `optional` | Często istotne w ofertach biurowych |

## 5.6. `garage` — garaż

Pola widoczne:

| Pole | Status | Widoczność | Uwagi |
|------|--------|------------|-------|
| `areaM2` | `core` | `optional` | Nie zawsze konieczne, ale przydatne |
| `garageType` | `planned` | `always` | Garaż murowany, miejsce postojowe, parking podziemny |
| `floor` | `core` | `optional` | Tylko gdy miejsce jest w budynku lub garażu podziemnym |
| `securityFeatures` | `planned` | `optional` | Monitoring, brama, pilot |

Pola ukryte:
- `rooms`
- `bathrooms`
- `totalFloors`

Pole do rozważenia:
- `yearBuilt`

Uwaga:
- `floor` dla garażu nie powinno być pokazywane bezwarunkowo; docelowo może zależeć od `garageType`

---

## 6. Rekomendowane reguły dynamiczne na teraz

Poniżej zestaw reguł, które mają największy sens biznesowy już na obecnym modelu danych, bez czekania na rozbudowę encji `Listing`.

### Reguły dla istniejących już pól

- `floor`
  - pokazuj dla: `apartment`, `office`, `commercial`
  - ukrywaj dla: `house`, `land`
  - dla `garage`: opcjonalnie, ale tylko po doprecyzowaniu logiki typu garażu

- `totalFloors`
  - pokazuj dla: `apartment`, `office`, `commercial`
  - dla `house`: tymczasowo można ukryć albo zmienić label na bardziej neutralny
  - ukrywaj dla: `land`

- `rooms`
  - pokazuj dla: `apartment`, `house`
  - opcjonalnie pokazuj dla: `office`, `commercial`
  - ukrywaj dla: `land`, `garage`

- `bathrooms`
  - pokazuj dla: `apartment`, `house`
  - opcjonalnie pokazuj dla: `office`, `commercial`
  - ukrywaj dla: `land`, `garage`

- `yearBuilt`
  - pokazuj dla: `apartment`, `house`, `office`, `commercial`
  - ukrywaj dla: `land`
  - dla `garage`: decyzja opcjonalna

- `areaM2`
  - pokazuj dla: `apartment`, `house`, `commercial`, `office`
  - dla `garage`: opcjonalnie
  - dla `land`: docelowo zastąpić `plotAreaM2`

### Najważniejsza rekomendacja produktowa

Pierwszy krok dynamicznego formularza powinien być prosty:
- ukryć `floor` dla domu i działki
- ukryć `rooms` i `bathrooms` dla działki i garażu
- ukryć `yearBuilt` dla działki
- dodać plan dla pola `plotAreaM2` dla domu i działki

To da szybki efekt biznesowy bez dużej przebudowy modelu.

---

## 7. Pola planowane do dodania

Poniższa lista grupuje nowe pola, które mają największy sens w kolejnych iteracjach.

### Priorytet 1

- `plotAreaM2`
- `buildingFloors`
- `houseType`
- `plotType`
- `garageType`
- `commercialType`

### Priorytet 2

- `buildingCondition`
- `heatingType`
- `parkingSpaces`
- `garageSpaces`
- `marketType`
- `utilities`

### Priorytet 3

- `buildingType`
- `officeClass`
- `meetingRooms`
- `airConditioning`
- `shopWindow`
- `accessRoadType`
- `localPlanStatus`

---

## 8. Integracje z portalami

Ten dokument ma być rozwijany również pod kątem publikacji ofert na zewnętrznych portalach.

W praktyce oznacza to, że przy każdym polu warto w przyszłości dopisać:
- czy jest wymagane lokalnie
- czy jest wymagane przez konkretny portal
- czy jest opcjonalne, ale wpływa na jakość publikacji i pozycjonowanie oferty

Docelowo matryca może zostać rozszerzona o kolumny:
- `otodom`
- `olx`
- `domiporta`
- `requiredForPublication`

Na obecnym etapie nie wpisujemy jeszcze wymagań portalowych 1:1, ponieważ:
- nie wszystkie integracje są potwierdzone biznesowo
- partnerzy mogą mieć różne warunki dostępu do API
- model ofert EstateFlow będzie jeszcze rozwijany

---

## 9. Zasady aktualizacji dokumentu

Dokument należy aktualizować, gdy:
- dochodzi nowy typ nieruchomości
- dochodzi nowe pole w `Listing`
- zmienia się logika dynamicznego formularza
- zmienia się walidacja backendowa lub frontendowa
- pojawia się nowe wymaganie z integracji portalowej

Przy każdej zmianie warto dopisać:
- czy pole już istnieje w kodzie
- dla jakich typów ma być widoczne
- czy jest obowiązkowe
- czy wynika z logiki biznesowej, czy z integracji portalowej

---

## 10. Podsumowanie

Docelowy formularz oferty powinien być sterowany przez jasno zdefiniowaną matrycę pól per typ nieruchomości.

Najważniejsze założenia:
- pola wspólne pokazujemy zawsze
- pola techniczne i specyficzne pokazujemy tylko tam, gdzie mają sens
- dom i działka wymagają innego zestawu danych niż mieszkanie
- przyszłe integracje portalowe powinny rozszerzać matrycę, a nie psuć jej czytelność

Najbliższy praktyczny kierunek:
- uprościć obecny formularz przez ukrywanie nietrafionych pól
- dodać pierwsze brakujące pola, przede wszystkim `plotAreaM2`
- utrzymywać ten plik jako produktową specyfikację dynamicznego formularza
