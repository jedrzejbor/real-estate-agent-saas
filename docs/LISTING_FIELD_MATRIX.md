# Dynamiczny Formularz Oferty — Matryca Pól

Data aktualizacji: 2026-08-20

Ten dokument dostosowuje rozpisane wymagania produktowe do aktualnego projektu PodAdresem. Ma być źródłem prawdy dla tego, jakie pola pokazujemy po wyborze typu ogłoszenia w nowym flow dodawania oferty.

Kolejność wdrożenia zmian jest rozpisana w `docs/LISTING_CREATION_IMPLEMENTATION_TASKS.md`.

## 1. Kontekst projektu

Aktualnie projekt obsługuje typy:

- `apartment` — mieszkanie
- `house` — dom
- `land` — działka
- `commercial` — lokal użytkowy
- `office` — biuro
- `garage` — garaż / miejsce postojowe

Aktualnie nie obsługujemy osobnych typów:

- `room` — pokój
- `building` — obiekt / hala / magazyn

Decyzja na pierwsze wdrożenie: nie dodajemy jeszcze `room` ani `building` jako nowych `PropertyType`. Dla obiektów/hali/magazynu używamy tymczasowo `commercial` albo `office`, a pełne `building` traktujemy jako osobny etap migracyjny.

## 2. Jak czytać statusy

Status techniczny pola:

- `core` — pole istnieje już w modelu/formularzach/API
- `public-only` — pole istnieje w publicznym wizardzie lub payloadzie zgłoszeń, ale nie w głównym `Listing`
- `planned` — pole do dodania w pierwszej rozbudowie formularza
- `future` — pole wartościowe, ale nie blokuje pierwszego wdrożenia
- `model-change` — wymaga nowego typu, nowej encji albo większej migracji

Wymagalność:

- `required` — wymagane do zapisania/publikacji oferty
- `recommended` — mocno wpływa na kompletność i filtrowanie
- `optional` — dodatkowa informacja
- `conditional` — wymagane dopiero po wyborze powiązanej opcji
- `auto` — wyliczane lub uzupełniane przez system

## 3. Aktualne źródła w kodzie

Najważniejsze pliki:

- `apps/web/src/lib/listings.ts`
- `apps/web/src/lib/public-listing-form-fields.ts`
- `apps/web/src/components/listings/listing-form.tsx`
- `apps/web/src/app/(public)/dodaj-oferte/page.tsx`
- `apps/api/src/listings/entities/listing.entity.ts`
- `apps/api/src/listings/dto/create-listing.dto.ts`
- `apps/api/src/public-listing-submissions/dto/create-public-listing-submission.dto.ts`

Pola, które już są w głównym `Listing`:

- `title`
- `description`
- `propertyType`
- `transactionType`
- `price`
- `currency`
- `commissionType`
- `commissionValue`
- `areaM2`
- `plotAreaM2`
- `rooms`
- `bathrooms`
- `floor`
- `totalFloors`
- `yearBuilt`
- `showExactAddressOnPublicPage`
- `showPublicViewCount`
- `address.city`
- `address.street`
- `address.postalCode`
- `address.district`
- `address.voivodeship`
- `address.lat`
- `address.lng`
- `images`

Pola, które są już w publicznym wizardzie, ale nie są zapisane jako pełne pola głównego `Listing`:

- `rentAdministrativeFee`
- `deposit`
- `ownerName`
- `email`
- `phone`
- `agencyName`
- `contactConsent`
- `termsConsent`
- `marketingConsent`
- `agentCollaboration`

## 4. Pola wspólne dla wszystkich ogłoszeń

| UI | Field name | Status | Wymagalność | Uwagi |
| --- | --- | --- | --- | --- |
| Rodzaj transakcji | `transactionType` | `core` | `required` | `sale` / `rent`; wybierane na ekranie startowym |
| Rodzaj nieruchomości | `propertyType` | `core` | `required` | steruje dalszym formularzem |
| Cena | `price` | `core` | `required` | dla najmu label: czynsz najmu |
| Waluta | `currency` | `core` | `auto` | domyślnie PLN |
| Cena za m2 | `pricePerM2` | `planned` | `auto` | wyliczana z ceny i powierzchni, nie wpisywana ręcznie |
| Tytuł | `title` | `core` | `recommended` | docelowo generowany automatycznie, z możliwością edycji |
| Opis | `description` | `core` | `required` | docelowo min. 50 znaków w publicznym flow |
| Miasto | `address.city` | `core` | `required` | obecnie wymagane |
| Województwo | `address.voivodeship` | `core` | `auto` | z autocomplete/geokodowania, edytowalne awaryjnie |
| Dzielnica/osiedle | `address.district` | `core` | `recommended` | ważne dla dużych miast |
| Ulica | `address.street` | `core` | `recommended` | może nie być publiczna |
| Kod pocztowy | `address.postalCode` | `core` | `optional` | pomocniczo do geokodowania |
| Punkt mapy | `address.lat`, `address.lng` | `core` | `recommended` | w publicznym flow może pochodzić z miasta/dzielnicy |
| Dokładny adres publiczny | `showExactAddressOnPublicPage` | `core` | `optional` | przełącznik prywatności |
| Zdjęcia | `images` | `core` | `recommended` | docelowo min. 1 do publikacji publicznej |
| Film | `videoUrl` | `future` | `optional` | YouTube/upload |
| Wirtualny spacer | `virtualTourUrl` | `future` | `optional` | Matterport itp. |
| Rzut | `floorPlanImages` | `future` | `optional` | może być też dokumentem oferty |
| Dostępność | `availableFrom` | `planned` | `recommended` | od zaraz / data |
| Cena do negocjacji | `priceNegotiable` | `planned` | `optional` | boolean |
| Typ ogłoszeniodawcy | `ownerType` | `planned` | `auto` | prywatny / agent / deweloper z konta |
| Telefon | `phone` | `public-only` | `required` | dla publicznego zgłoszenia; w panelu z konta agenta |
| E-mail | `email` | `public-only` | `required` | dla publicznego zgłoszenia; w panelu z konta |

## 5. Ekran startowy wyboru typu

Nowy flow powinien zaczynać się od wyboru intencji:

- `Sprzedam`
- `Wynajmę`

Po kliknięciu typu nieruchomości ustawiamy jednocześnie:

- `transactionType`
- `propertyType`

Mapowanie pierwszej wersji:

| Sekcja | Opcja UI | `transactionType` | `propertyType` | Status |
| --- | --- | --- | --- | --- |
| Sprzedam | Mieszkanie | `sale` | `apartment` | wdrażamy |
| Sprzedam | Dom | `sale` | `house` | wdrażamy |
| Sprzedam | Działka | `sale` | `land` | wdrażamy |
| Sprzedam | Lokal użytkowy | `sale` | `commercial` | wdrażamy |
| Sprzedam | Biuro | `sale` | `office` | wdrażamy |
| Sprzedam | Garaż / miejsce | `sale` | `garage` | wdrażamy |
| Wynajmę | Mieszkanie | `rent` | `apartment` | wdrażamy |
| Wynajmę | Pokój | brak | brak | nie wdrażamy bez `room` |
| Wynajmę | Dom | `rent` | `house` | wdrażamy |
| Wynajmę | Działka | `rent` | `land` | wdrażamy |
| Wynajmę | Lokal użytkowy | `rent` | `commercial` | wdrażamy |
| Wynajmę | Biuro | `rent` | `office` | wdrażamy |
| Wynajmę | Garaż / miejsce | `rent` | `garage` | wdrażamy |

## 6. Mieszkanie — `apartment`

### 6.1. Pola podstawowe

| UI | Field name | Status | Sprzedaż | Wynajem | Uwagi |
| --- | --- | --- | --- | --- | --- |
| Powierzchnia | `areaM2` | `core` | `required` | `required` | m2 |
| Liczba pokoi | `rooms` | `core` | `required` | `required` | 1-10+ |
| Piętro | `floor` | `core` | `required` | `required` | docelowo obsłużyć parter/suterena/poddasze |
| Liczba pięter w budynku | `totalFloors` | `core` | `recommended` | `recommended` | |
| Rynek | `marketType` | `planned` | `required` | `optional` | pierwotny / wtórny |
| Stan mieszkania | `condition` | `planned` | `required` | `recommended` | do remontu, dobry, po remoncie itd. |
| Forma własności | `ownershipType` | `planned` | `required` | `optional` | pełna, spółdzielcze, udział, inne |
| Rok budowy | `yearBuilt` | `core` | `recommended` | `recommended` | |
| Typ budynku | `buildingType` | `planned` | `recommended` | `recommended` | blok, kamienica, apartamentowiec |

### 6.2. Układ i standard

| UI | Field name | Status | Wymagalność | Uwagi |
| --- | --- | --- | --- | --- |
| Liczba sypialni | `bedrooms` | `future` | `optional` | |
| Liczba łazienek | `bathrooms` | `core` | `recommended` | już istnieje |
| Osobne WC | `separateWc` | `future` | `optional` | boolean |
| Typ kuchni | `kitchenType` | `planned` | `recommended` | osobna, aneks, otwarta, z jadalnią, brak |
| Liczba poziomów | `levels` | `planned` | `recommended` | 1/2/3 |
| Wysokość pomieszczeń | `ceilingHeightM` | `future` | `optional` | |
| Rozkładowe | `isIndependentLayout` | `future` | `optional` | boolean |
| Ekspozycja okien | `windowExposure` | `future` | `optional` | multi-select |

### 6.3. Powierzchnie dodatkowe

| UI | Field name | Status | Wymagalność | Uwagi |
| --- | --- | --- | --- | --- |
| Balkon | `hasBalcony` | `planned` | `recommended` | boolean |
| Powierzchnia balkonu | `balconyAreaM2` | `planned` | `conditional` | jeśli balkon |
| Loggia | `hasLoggia` | `future` | `optional` | |
| Taras | `hasTerrace` | `planned` | `recommended` | |
| Powierzchnia tarasu | `terraceAreaM2` | `planned` | `conditional` | jeśli taras |
| Ogródek | `hasGarden` | `planned` | `recommended` | ważne przy parterze |
| Powierzchnia ogródka | `gardenAreaM2` | `planned` | `conditional` | jeśli ogródek |
| Piwnica | `hasBasement` | `planned` | `recommended` | |
| Powierzchnia piwnicy | `basementAreaM2` | `future` | `optional` | |
| Komórka lokatorska | `hasStorageRoom` | `planned` | `recommended` | |
| Powierzchnia komórki | `storageRoomAreaM2` | `future` | `optional` | |

### 6.4. Budynek przy mieszkaniu

Docelowo dane budynku mogą zostać wydzielone do `BuildingDetails`, ale w pierwszej wersji mogą być polami szczegółów mieszkania.

| UI | Field name | Status | Wymagalność |
| --- | --- | --- | --- |
| Materiał budynku | `buildingMaterial` | `future` | `optional` |
| Winda | `hasElevator` | `planned` | `recommended` |
| Liczba wind | `elevatorCount` | `future` | `optional` |
| Stan budynku | `buildingCondition` | `future` | `optional` |
| Domofon | `hasIntercom` | `future` | `optional` |
| Monitoring | `hasMonitoring` | `future` | `optional` |
| Ochrona | `hasSecurity` | `future` | `optional` |
| Osiedle zamknięte | `isGatedCommunity` | `future` | `optional` |
| Dostosowane dla niepełnosprawnych | `isAccessible` | `planned` | `recommended` |

### 6.5. Koszty, parking i stan prawny

| UI | Field name | Status | Sprzedaż | Wynajem | Uwagi |
| --- | --- | --- | --- | --- | --- |
| Czynsz administracyjny | `rentAdministrativeFee` | `public-only` | `recommended` | `recommended` | przenieść do głównego modelu |
| Kaucja | `deposit` | `public-only` | `hidden` | `recommended` | tylko najem |
| Ogrzewanie | `heatingType` | `planned` | `recommended` | `recommended` | miejskie, gazowe itd. |
| Ciepła woda | `hotWaterType` | `future` | `optional` | `optional` | |
| Miejsce parkingowe | `hasParking` | `planned` | `recommended` | `recommended` | |
| Rodzaj parkingu | `parkingType` | `planned` | `conditional` | `conditional` | jeśli parking |
| Liczba miejsc | `parkingSpaces` | `planned` | `conditional` | `conditional` | jeśli parking |
| Cena miejsca | `parkingPrice` | `future` | `conditional` | `conditional` | jeśli płatne osobno |
| Obowiązkowy zakup miejsca | `parkingPurchaseRequired` | `future` | `conditional` | `hidden` | głównie sprzedaż |
| Księga wieczysta | `hasLandAndMortgageRegister` | `planned` | `recommended` | `optional` | bez publicznego numeru KW |
| KW bez obciążeń | `landRegisterNoEncumbrance` | `future` | `optional` | `optional` | |
| Hipoteka | `hasMortgage` | `future` | `optional` | `hidden` | |
| Aktualnie wynajmowane | `currentlyRented` | `future` | `optional` | `hidden` | |

## 7. Dom — `house`

### 7.1. Pola podstawowe

| UI | Field name | Status | Sprzedaż | Wynajem | Uwagi |
| --- | --- | --- | --- | --- | --- |
| Powierzchnia użytkowa | `areaM2` | `core` | `required` | `required` | |
| Powierzchnia całkowita | `totalAreaM2` | `future` | `optional` | `optional` | |
| Powierzchnia działki | `plotAreaM2` | `core` | `required` | `required` | już istnieje |
| Liczba pokoi | `rooms` | `core` | `required` | `required` | |
| Liczba sypialni | `bedrooms` | `future` | `recommended` | `recommended` | |
| Liczba łazienek | `bathrooms` | `core` | `recommended` | `recommended` | |
| Liczba kondygnacji | `totalFloors` | `core` | `recommended` | `recommended` | zmienić label z "liczba pięter" |
| Rodzaj domu | `houseType` | `planned` | `required` | `recommended` | wolnostojący, bliźniak, szeregowiec |
| Rynek | `marketType` | `planned` | `required` | `optional` | |
| Rok budowy | `yearBuilt` | `core` | `recommended` | `recommended` | |
| Stan domu | `condition` | `planned` | `required` | `recommended` | |

### 7.2. Konstrukcja i instalacje

| UI | Field name | Status | Wymagalność | Uwagi |
| --- | --- | --- | --- | --- |
| Materiał budynku | `buildingMaterial` | `planned` | `recommended` | |
| Materiał dachu | `roofMaterial` | `future` | `optional` | |
| Rodzaj dachu | `roofType` | `future` | `optional` | |
| Ocieplenie | `hasInsulation` | `future` | `optional` | |
| Okna | `windowType` | `future` | `optional` | |
| Podpiwniczenie | `hasBasement` | `planned` | `recommended` | |
| Poddasze | `hasAttic` | `planned` | `recommended` | |
| Poddasze użytkowe | `hasUsableAttic` | `future` | `conditional` | jeśli poddasze |
| Garaż | `hasGarage` | `planned` | `recommended` | |
| Liczba miejsc garażowych | `garageSpaces` | `planned` | `conditional` | jeśli garaż |
| Ogrzewanie | `heatingType` | `planned` | `required` | |
| Woda | `waterSource` | `planned` | `recommended` | sieć, studnia, brak |
| Kanalizacja | `sewageType` | `planned` | `recommended` | sieć, szambo, oczyszczalnia, brak |
| Prąd | `electricityStatus` | `planned` | `recommended` | |
| Gaz | `gasStatus` | `planned` | `recommended` | |
| Internet / światłowód | `internetStatus` | `future` | `optional` | |
| Fotowoltaika | `hasPhotovoltaics` | `future` | `optional` | |
| Moc instalacji PV | `photovoltaicsPowerKw` | `future` | `conditional` | jeśli PV |
| Pompa ciepła | `hasHeatPump` | `future` | `optional` | |
| Rekuperacja | `hasRecuperation` | `future` | `optional` | |
| Klimatyzacja | `hasAirConditioning` | `future` | `optional` | |
| Kominek | `hasFireplace` | `future` | `optional` | |
| Ogrzewanie podłogowe | `hasFloorHeating` | `future` | `optional` | |

### 7.3. Działka przy domu

| UI | Field name | Status | Wymagalność |
| --- | --- | --- | --- |
| Kształt działki | `plotShape` | `planned` | `optional` |
| Ogrodzenie | `isFenced` | `planned` | `recommended` |
| Rodzaj ogrodzenia | `fenceType` | `future` | `optional` |
| Brama automatyczna | `hasAutomaticGate` | `future` | `optional` |
| Dojazd | `accessRoadType` | `planned` | `recommended` |
| Droga publiczna | `hasPublicRoadAccess` | `future` | `optional` |
| Ogród | `hasGarden` | `future` | `optional` |
| Altana | `hasGazebo` | `future` | `optional` |
| Basen | `hasPool` | `future` | `optional` |
| Budynki gospodarcze | `hasOutbuildings` | `future` | `optional` |

## 8. Działka — `land`

### 8.1. Podstawowe i wymiary

| UI | Field name | Status | Sprzedaż | Wynajem | Uwagi |
| --- | --- | --- | --- | --- | --- |
| Powierzchnia działki | `plotAreaM2` | `core` | `required` | `required` | główne pole dla działki |
| Rodzaj działki | `plotType` | `planned` | `required` | `required` | budowlana, rolna, rekreacyjna itd. |
| Kształt | `plotShape` | `planned` | `recommended` | `recommended` | |
| Szerokość | `plotWidthM` | `planned` | `recommended` | `recommended` | |
| Długość | `plotLengthM` | `planned` | `recommended` | `recommended` | |
| Numer działki ewidencyjnej | `cadastralParcelNumber` | `future` | `optional` | `optional` | nie musi być publiczny |
| Obręb ewidencyjny | `cadastralDistrict` | `future` | `optional` | `optional` | |

Pola ukryte dla działki:

- `areaM2`
- `rooms`
- `bathrooms`
- `floor`
- `totalFloors`
- `yearBuilt`

### 8.2. Zabudowa i planowanie

| UI | Field name | Status | Wymagalność | Uwagi |
| --- | --- | --- | --- | --- |
| MPZP | `localPlanStatus` | `planned` | `recommended` | jest / brak / w trakcie / nie wiem |
| Przeznaczenie w MPZP | `localPlanPurpose` | `future` | `conditional` | jeśli MPZP jest |
| Warunki zabudowy | `developmentConditionsStatus` | `planned` | `recommended` | wydane / w trakcie / brak / nie wiem |
| Rodzaj możliwej zabudowy | `allowedBuildingTypes` | `future` | `optional` | |
| Maks. powierzchnia zabudowy | `maxBuildingCoveragePct` | `future` | `optional` | |
| Maks. wysokość | `maxBuildingHeightM` | `future` | `optional` | |
| Liczba kondygnacji | `allowedFloors` | `future` | `optional` | |
| Min. powierzchnia biologicznie czynna | `minBiologicallyActiveAreaPct` | `future` | `optional` | |

### 8.3. Media i dojazd

Każde medium powinno mieć status, a nie zwykły checkbox.

| UI | Field name | Status | Wymagalność | Wartości |
| --- | --- | --- | --- | --- |
| Prąd | `electricityStatus` | `planned` | `recommended` | na działce / przy granicy / w drodze / brak |
| Woda | `waterStatus` | `planned` | `recommended` | na działce / przy granicy / w drodze / brak |
| Gaz | `gasStatus` | `planned` | `recommended` | na działce / przy granicy / w drodze / brak |
| Kanalizacja | `sewageStatus` | `planned` | `recommended` | na działce / przy granicy / w drodze / brak |
| Światłowód | `fiberStatus` | `future` | `optional` | na działce / w drodze / brak |
| Dostęp do drogi | `roadAccess` | `planned` | `required` | tak / nie / służebność / udział |
| Rodzaj drogi | `accessRoadType` | `planned` | `recommended` | asfaltowa, utwardzona, gruntowa itd. |
| Status drogi | `roadLegalStatus` | `planned` | `recommended` | publiczna, wewnętrzna, udział, służebność |
| Szerokość drogi | `roadWidthM` | `future` | `optional` | |

### 8.4. Charakterystyka i stan prawny

| UI | Field name | Status | Wymagalność |
| --- | --- | --- | --- |
| Ukształtowanie | `terrainShape` | `planned` | `recommended` |
| Ogrodzona | `isFenced` | `planned` | `recommended` |
| Zadrzewienie | `hasTrees` | `future` | `optional` |
| Zabudowana | `hasBuildings` | `future` | `optional` |
| Budynki na działce | `buildingsDescription` | `future` | `conditional` |
| Wjazd od strony | `entryDirection` | `future` | `optional` |
| Sąsiedztwo | `neighborhoodType` | `future` | `optional` |
| Forma własności | `ownershipType` | `planned` | `required` |
| Księga wieczysta | `hasLandAndMortgageRegister` | `planned` | `recommended` |
| Obciążenia | `hasEncumbrances` | `future` | `optional` |
| Służebności | `hasEasements` | `future` | `optional` |
| Klasa gruntu | `landClass` | `future` | `conditional` |
| Ograniczenia obrotu gruntami rolnymi | `hasAgriculturalTradeRestrictions` | `future` | `conditional` |

## 9. Lokal użytkowy — `commercial`

### 9.1. Podstawowe

| UI | Field name | Status | Sprzedaż | Wynajem | Uwagi |
| --- | --- | --- | --- | --- | --- |
| Powierzchnia | `areaM2` | `core` | `required` | `required` | |
| Liczba pomieszczeń | `rooms` | `core` | `required` | `required` | obecne `rooms`, label jako pomieszczenia |
| Piętro | `floor` | `core` | `required` | `recommended` | |
| Przeznaczenie | `commercialPurpose` | `planned` | `required` | `required` | multi-select |
| Rynek | `marketType` | `planned` | `required` | `optional` | |
| Stan | `condition` | `planned` | `required` | `recommended` | |
| Typ budynku | `buildingType` | `planned` | `recommended` | `recommended` | |
| Rok budowy | `yearBuilt` | `core` | `optional` | `optional` | |

Przeznaczenie lokalu:

- biurowe
- handlowe
- usługowe
- gastronomiczne
- medyczne
- magazynowe
- edukacyjne
- hotelowe
- produkcyjne
- inne

### 9.2. Parametry lokalu

| UI | Field name | Status | Wymagalność |
| --- | --- | --- | --- |
| Wejście od ulicy | `hasStreetEntrance` | `planned` | `recommended` |
| Witryna | `hasShopWindow` | `planned` | `recommended` |
| Długość witryny | `shopWindowLengthM` | `future` | `optional` |
| Liczba wejść | `entranceCount` | `future` | `optional` |
| Wysokość lokalu | `ceilingHeightM` | `planned` | `recommended` |
| Open space | `isOpenSpace` | `future` | `optional` |
| Zaplecze socjalne | `hasSocialFacilities` | `future` | `optional` |
| Toaleta | `hasToilet` | `planned` | `recommended` |
| Kuchnia | `hasKitchen` | `future` | `optional` |
| Klimatyzacja | `hasAirConditioning` | `future` | `optional` |
| Wentylacja | `hasVentilation` | `future` | `optional` |
| Siła / 400 V | `hasThreePhasePower` | `future` | `optional` |
| Moc przyłączeniowa | `powerConnectionKw` | `future` | `optional` |
| Internet / światłowód | `internetStatus` | `future` | `optional` |
| Alarm | `hasAlarm` | `future` | `optional` |
| Monitoring | `hasMonitoring` | `future` | `optional` |
| Ochrona | `hasSecurity` | `future` | `optional` |
| Dostęp 24/7 | `has24hAccess` | `future` | `optional` |

### 9.3. Parking i logistyka

| UI | Field name | Status | Wymagalność |
| --- | --- | --- | --- |
| Parking | `hasParking` | `planned` | `recommended` |
| Liczba miejsc | `parkingSpaces` | `planned` | `conditional` |
| Parking dla klientów | `hasCustomerParking` | `future` | `optional` |
| Miejsca przypisane | `hasAssignedParking` | `future` | `optional` |
| Dostawa / rampa | `hasLoadingRamp` | `future` | `optional` |

## 10. Biuro — `office`

`office` zostaje osobnym typem, bo już istnieje w projekcie. Część pól pokrywa się z `commercial`, ale etykiety i kompletność powinny być bardziej biurowe.

| UI | Field name | Status | Sprzedaż | Wynajem | Uwagi |
| --- | --- | --- | --- | --- | --- |
| Powierzchnia | `areaM2` | `core` | `required` | `required` | |
| Liczba pomieszczeń/gabinetów | `rooms` | `core` | `recommended` | `recommended` | |
| Piętro | `floor` | `core` | `recommended` | `recommended` | |
| Liczba pięter w budynku | `totalFloors` | `core` | `optional` | `optional` | |
| Rok budowy | `yearBuilt` | `core` | `optional` | `optional` | |
| Klasa biura | `officeClass` | `planned` | `optional` | `recommended` | A/B/C |
| Sale konferencyjne | `meetingRooms` | `future` | `optional` | `optional` | |
| Open space | `isOpenSpace` | `future` | `optional` | `optional` | |
| Klimatyzacja | `hasAirConditioning` | `future` | `recommended` | `recommended` | |
| Wentylacja | `hasVentilation` | `future` | `optional` | `optional` | |
| Światłowód | `internetStatus` | `future` | `recommended` | `recommended` | |
| Dostęp 24/7 | `has24hAccess` | `future` | `optional` | `optional` | |
| Recepcja | `hasReception` | `future` | `optional` | `optional` | |
| Ochrona | `hasSecurity` | `future` | `optional` | `optional` | |
| Parking | `hasParking` | `planned` | `recommended` | `recommended` | |
| Liczba miejsc | `parkingSpaces` | `planned` | `conditional` | `conditional` | |

## 11. Garaż / miejsce postojowe — `garage`

Formularz dla garażu powinien być krótki.

| UI | Field name | Status | Sprzedaż | Wynajem | Uwagi |
| --- | --- | --- | --- | --- | --- |
| Rodzaj | `garageType` | `planned` | `required` | `required` | indywidualny, podziemny, naziemny, wiata |
| Powierzchnia | `areaM2` | `core` | `required` | `required` | |
| Cena | `price` | `core` | `required` | `required` | wspólne |
| Lokalizacja | `address.city` | `core` | `required` | `required` | wspólne |
| Poziom | `floor` | `core` | `recommended` | `recommended` | tylko dla parkingu/garażu w budynku |
| Typ własności | `ownershipType` | `planned` | `recommended` | `optional` | |
| Zamykany | `isLockable` | `planned` | `recommended` | `recommended` | |
| Brama automatyczna | `hasAutomaticGate` | `future` | `optional` | `optional` | |
| Prąd | `electricityStatus` | `future` | `optional` | `optional` | |
| Oświetlenie | `hasLighting` | `future` | `optional` | `optional` | |
| Monitoring | `hasMonitoring` | `future` | `optional` | `optional` | |
| Ochrona | `hasSecurity` | `future` | `optional` | `optional` | |
| Ogrzewany | `isHeated` | `future` | `optional` | `optional` | |

Pola ukryte dla garażu:

- `rooms`
- `bathrooms`
- `totalFloors`
- `yearBuilt` w pierwszej wersji

## 12. Obiekt / hala / magazyn

To jest wartościowy typ, ale nie istnieje jeszcze w projekcie. Nie dokładamy go do pierwszego wdrożenia wyboru `Sprzedam/Wynajmę`, chyba że zaakceptujemy osobną migrację `PropertyType.BUILDING`.

Docelowy typ:

- `building`

Docelowe szczegóły:

- `buildingType`
- `buildingAreaM2`
- `plotAreaM2`
- `yearBuilt`
- `condition`
- `totalFloors`
- `hallHeightM`
- `storageHeightM`
- `gateCount`
- `gateDimensions`
- `hasLoadingDock`
- `floorLoadCapacity`
- `hasCrane`
- `powerConnectionKw`
- `heatingType`
- `hasVentilation`
- `hasFireProtectionSystem`
- `hasManeuveringArea`
- `hasTruckAccess`
- `hasParking`

Status: `model-change`.

## 13. Pokój

Inspiracja zawiera `Pokój` w sekcji wynajmu. Aktualny projekt nie ma `PropertyType.ROOM`.

Nie rekomenduję mapowania pokoju na `apartment`, bo popsuje filtrowanie, matching i analitykę. Dla pierwszej wersji ekran startowy powinien pominąć `Pokój`.

Jeśli dodamy `room`, minimalny model powinien zawierać:

- `roomAreaM2`
- `apartmentAreaM2`
- `roomsInApartment`
- `floor`
- `totalFloors`
- `availableFrom`
- `deposit`
- `rentAdministrativeFee`
- `sharedKitchen`
- `sharedBathroom`
- `preferredTenant`

Status: `model-change`.

## 14. Świadectwo energetyczne

Dotyczy głównie:

- `apartment`
- `house`
- `commercial`
- częściowo `office`
- potencjalnie `building`, gdy zostanie dodany

Nie dotyczy zwykle:

- `land`
- `garage`, chyba że sprzedajemy samodzielny lokal/budynek wymagający świadectwa

Pola:

| UI | Field name | Status | Wymagalność |
| --- | --- | --- | --- |
| Czy posiada świadectwo | `hasEnergyCertificate` | `planned` | `recommended` |
| Energia użytkowa EU | `energyCertificate.eu` | `planned` | `conditional` |
| Energia końcowa EK | `energyCertificate.ek` | `planned` | `conditional` |
| Energia pierwotna EP | `energyCertificate.ep` | `planned` | `conditional` |
| Udział OZE | `energyCertificate.renewableSharePct` | `planned` | `conditional` |
| Emisja CO2 | `energyCertificate.co2Emission` | `planned` | `conditional` |

Reguła walidacji:

- jeśli `hasEnergyCertificate === true`, pięć parametrów świadectwa jest wymaganych.

Rekomendacja techniczna:

- nie dodawać tych pól bezpośrednio do `Listing`
- utworzyć osobną encję lub obiekt `EnergyCertificate`

## 15. Proponowany wizard

Nowy formularz nie powinien pokazywać 40 pól naraz.

Kroki docelowe:

1. Co chcesz zrobić?
   - `Sprzedam` / `Wynajmę`
   - typ nieruchomości
2. Podstawowe informacje
   - powierzchnia, pokoje/pomieszczenia, piętro/kondygnacje, cena
3. Lokalizacja
   - miasto, dzielnica, ulica, mapa, prywatność adresu
4. Charakterystyka
   - pola zależne od typu nieruchomości
5. Koszty i stan prawny
   - czynsz, kaucja, własność, KW, media
6. Zdjęcia i media
   - zdjęcia, rzut, film, spacer
7. Opis i podsumowanie
   - opis ręczny albo generowany z danych

W panelu agenta można zachować krótszy tryb `guided`, ale powinien korzystać z tej samej matrycy pól.

## 16. Priorytet wdrożenia

### Fala 1 — bez dużej przebudowy bazy

Cel: nowy ekran startowy + poprawne pola obecnego modelu.

- wykorzystać `transactionType` i `propertyType` z ekranu startowego
- `apartment`: `areaM2`, `rooms`, `floor`, `totalFloors`, `bathrooms`, `yearBuilt`
- `house`: `areaM2`, `plotAreaM2`, `rooms`, `bathrooms`, `totalFloors`, `yearBuilt`
- `land`: tylko `plotAreaM2` z obecnych parametrów
- `commercial`: `areaM2`, `rooms` jako liczba pomieszczeń, `floor`, `bathrooms`, `totalFloors`, `yearBuilt`
- `office`: `areaM2`, `rooms`, `floor`, `bathrooms`, `totalFloors`, `yearBuilt`
- `garage`: `areaM2`, opcjonalnie `floor`
- poprawić label `totalFloors` dla domu na `Liczba kondygnacji`
- ukryć pola bez sensu dla danego typu
- zachować `plotAreaM2` jako wymagane dla domu i działki

### Fala 2 — pierwsze nowe pola jakościowe

Cel: zwiększyć kompletność bez tworzenia wielu encji.

- `marketType`
- `condition`
- `ownershipType`
- `buildingType`
- `houseType`
- `plotType`
- `plotShape`
- `accessRoadType`
- `localPlanStatus`
- `developmentConditionsStatus`
- `heatingType`
- `garageType`
- `commercialPurpose`
- `hasBalcony`
- `hasElevator`
- `hasParking`
- `parkingSpaces`
- `rentAdministrativeFee`
- `deposit`
- `availableFrom`
- `priceNegotiable`

### Fala 3 — modele szczegółowe

Cel: nie pakować wszystkiego w jedną tabelę `Listing`.

Proponowane modele:

```text
Listing
 ├── Address
 ├── ListingImage
 ├── ListingDocument
 ├── ApartmentDetails
 ├── HouseDetails
 ├── LandDetails
 ├── CommercialDetails
 ├── OfficeDetails
 ├── GarageDetails
 └── EnergyCertificate
```

Na tym etapie można też dodać:

- `PropertyType.ROOM`
- `PropertyType.BUILDING`

## 17. Wskaźnik kompletności

Nie wszystkie pola powinny być wymagane. Zamiast tego formularz powinien mieć wskaźnik kompletności.

Przykład:

```text
Twoje ogłoszenie: 72% kompletne

✓ podstawowe informacje
✓ lokalizacja
✓ cena
✓ 12 zdjęć
✓ balkon
⚠ brak czynszu administracyjnego
⚠ brak roku budowy
⚠ brak informacji o parkingu
⚠ brak rzutu
```

Pierwsza wersja kompletności może liczyć:

- wymagane pola podstawowe
- zdjęcia
- lokalizację z mapą
- opis
- pola rekomendowane dla danego typu

## 18. Najważniejsze informacje generowane automatycznie

Po uzupełnieniu danych system powinien generować krótki pasek parametrów do listingu i katalogu.

Przykłady:

- mieszkanie: `62 m2 · 3 pokoje · piętro 2/5 · balkon · winda · 2018`
- dom: `146 m2 · działka 823 m2 · 5 pokoi · pompa ciepła · garaż 2 auta`
- działka: `1240 m2 · budowlana · MPZP · 28 x 44 m · prąd i woda · droga asfaltowa`
- lokal: `145 m2 · 6 pomieszczeń · parter · witryna · parking`
- garaż: `18 m2 · garaż podziemny · poziom -1 · monitoring`

To powinno być generowane ze struktury danych, a nie z opisu użytkownika.

## 19. Najbliższe decyzje przed implementacją

1. Czy nowy ekran startowy wdrażamy jednocześnie dla `/dodaj-oferte` i `/dashboard/listings/new`?
2. Czy w pierwszej wersji pomijamy `Pokój`? Rekomendacja: tak.
3. Czy `title` pozostaje wymagany, czy generujemy go automatycznie i pozwalamy edytować? Rekomendacja: generować, ale w Falę 1 można zostawić wymagany.
4. Czy zdjęcia mają być wymagane do publicznej publikacji? Rekomendacja: minimum 1 w publicznym flow, opcjonalne w szkicu agenta.
5. Czy pola z Fali 2 zapisujemy jeszcze w `Listing`, czy od razu tworzymy encje `*Details`? Rekomendacja: jeśli dodajemy więcej niż kilka pól, przejść od razu na modele szczegółowe.
