# Zadania wdrożeniowe: nowy model dodawania ogłoszenia

Data: 2026-08-20

Cel: wdrożyć nowy flow dodawania ogłoszenia z ekranem wyboru `Sprzedam / Wynajmę + typ nieruchomości`, zachowując bezpieczeństwo danych, czystość kodu i możliwość etapowego releasu.

Powiązane dokumenty:

- `docs/LISTING_CREATION_FLOW_CURRENT_PLAN.md`
- `docs/LISTING_FIELD_MATRIX.md`

## Zasady wdrożenia

1. Nie mieszać dużej migracji modelu danych z pierwszym wdrożeniem UX.
2. W Fali 1 używać tylko pól, które już istnieją w `Listing` albo są już obsługiwane przez publiczny wizard.
3. Nie dodawać `room` ani `building` bez osobnej migracji i testów regresji.
4. Wspólne decyzje pól trzymać w jednym miejscu, a nie kopiować logiki między publicznym wizardem i dashboardem.
5. Każdy etap musi zostawić aplikację w stanie działającym.
6. Edycja istniejących ogłoszeń nie może zostać zepsuta przez nowy flow tworzenia.
7. Backend i frontend walidują te same wymagania.

## Etap 0 — przygotowanie i decyzje

- [x] Potwierdzić zakres Fali 1: tylko obecne typy `apartment`, `house`, `land`, `commercial`, `office`, `garage`.
- [x] Potwierdzić, że `Pokój` nie wchodzi do pierwszego wdrożenia.
- [x] Potwierdzić, czy ekran startowy wdrażamy jednocześnie dla `/dodaj-oferte` i `/dashboard/listings/new`.
- [x] Potwierdzić, czy `title` zostaje wymagany w Fali 1.
- [x] Potwierdzić, czy zdjęcia mają być wymagane w publicznym flow, czy tylko rekomendowane.

Kryterium zakończenia: decyzje są zapisane w dokumentach i nie blokują implementacji.

Decyzje zaakceptowane:

- Fala 1 obejmuje tylko obecne typy: `apartment`, `house`, `land`, `commercial`, `office`, `garage`.
- `Pokój` pomijamy w pierwszej wersji i nie mapujemy go tymczasowo na `apartment`.
- Ekran startowy wdrażamy w obu miejscach: `/dodaj-oferte` i `/dashboard/listings/new`.
- Ekran startowy ma korzystać ze wspólnego komponentu i wspólnej konfiguracji.
- `title` zostaje wymagany w Fali 1.
- Zdjęcia są wymagane: minimum 3.
- Fala 1 nie dodaje migracji pól jakościowych; robimy UX i dynamiczne pola na obecnym modelu.

Uwaga wdrożeniowa dla zdjęć: wymóg minimum 3 zdjęć trzeba spiąć z miejscem zapisu. Publiczny wizard może walidować `draft.images.length >= 3` przed wysłaniem zgłoszenia. Dashboardowy `ListingForm` tworzy ofertę i dopiero potem uploaduje zdjęcia, więc w Fali 1 trzeba dodać walidację po stronie formularza przed `createListing`, aby nie tworzyć nowego ogłoszenia bez co najmniej 3 wybranych plików.

## Etap 1 — wspólna konfiguracja wyboru typu

- [x] Dodać wspólną konfigurację opcji, np. `listing-intent-options.ts`.
- [x] Zdefiniować pary `transactionType + propertyType` dla sekcji `Sprzedam`.
- [x] Zdefiniować pary `transactionType + propertyType` dla sekcji `Wynajmę`.
- [x] Pominąć `Pokój` albo oznaczyć jako niedostępny bez mapowania na `apartment`.
- [x] Dodać typ TypeScript dla wyboru startowego, np. `ListingIntentSelection`.
- [x] Dodać helper walidujący, czy para jest dozwolona.

Kryterium zakończenia: konfiguracja jest importowalna przez publiczny wizard i dashboard bez duplikowania tablic.

Wdrożenie:

- `apps/web/src/lib/listing-intent-options.ts`
- `LISTING_INTENT_SECTIONS` zawiera sekcje `Sprzedam` i `Wynajmę`.
- `LISTING_INTENT_OPTIONS` spłaszcza wszystkie dozwolone pary.
- `ListingIntentSelection` opisuje wybór startowy.
- `isAllowedListingIntentSelection` waliduje parę `transactionType + propertyType`.
- `getListingIntentSection` pozwala pobrać konfigurację konkretnej sekcji.
- Eksportowane kolekcje są traktowane jako `readonly`, żeby kolejne komponenty nie mutowały konfiguracji w runtime.
- `Pokój` nie został dodany do konfiguracji Fali 1.

Weryfikacja:

- `pnpm --filter web type-check` — OK.
- `pnpm --filter web lint` — OK, tylko istniejące ostrzeżenia niezwiązane z Etapem 1.

## Etap 2 — komponent ekranu startowego

- [ ] Utworzyć komponent `ListingIntentSelector`.
- [ ] Renderować dwie sekcje: `Sprzedam` i `Wynajmę`.
- [ ] Renderować typy nieruchomości z konfiguracji, nie z ręcznie wpisanych przycisków.
- [ ] Po kliknięciu zwracać `transactionType` i `propertyType`.
- [ ] Dodać stan zaznaczenia, focus, obsługę klawiatury i responsywność.
- [ ] Nie wykonywać zapisu API z poziomu tego komponentu.

Kryterium zakończenia: komponent jest czysty, sterowany propsami i nie zna szczegółów publicznego/dashbordowego flow.

## Etap 3 — integracja w publicznym wizardzie `/dodaj-oferte`

- [ ] Dodać krok startowy przed obecnym krokiem `Podstawy` albo przebudować `StepBasics`.
- [ ] Po wyborze zapisać `transactionType` i `propertyType` w `draft`.
- [ ] Upewnić się, że `localStorage` zachowuje wybór.
- [ ] Zmienić walidację kroków tak, aby typ transakcji i typ nieruchomości były walidowane w kroku startowym.
- [ ] Usunąć albo zamienić selecty `transactionType` i `propertyType` w `StepBasics` na podsumowanie z opcją zmiany.
- [ ] Upewnić się, że `StepParameters` nadal dostaje ustawione typy.
- [ ] Upewnić się, że `buildSubmissionPayload` wysyła te same wartości co przed zmianą.
- [ ] Zachować przekierowanie zalogowanego agenta do `/dashboard/listings/new`.

Kryterium zakończenia: publiczny użytkownik wybiera intencję na starcie, przechodzi przez wizard i wysyła zgłoszenie bez zmiany kontraktu API.

## Etap 4 — integracja w dashboardzie `/dashboard/listings/new`

- [ ] Dodać stan wyboru startowego na stronie `dashboard/listings/new`.
- [ ] Pokazać `ListingIntentSelector` przed formularzem.
- [ ] Po wyborze renderować `ListingForm variant="guided"`.
- [ ] Dodać do `ListingForm` propsy `initialPropertyType` i `initialTransactionType`.
- [ ] Ustawić `propertyType` z propsa początkowego.
- [ ] Dodać kontrolowany stan dla `transactionType`, analogicznie do `propertyType`.
- [ ] Jeżeli selecty zostają widoczne, pozwolić zmienić wybór bez rozjazdu stanu.
- [ ] Jeżeli selecty są ukryte, zapewnić ukryte pola formularza z poprawnymi `name`.
- [ ] Nie zmieniać działania edycji istniejącego ogłoszenia.

Kryterium zakończenia: agent tworzy ogłoszenie z prewybranym typem, a edycja istniejącej oferty działa jak wcześniej.

## Etap 5 — dynamiczne pola Fali 1

- [ ] Uporządkować logikę widoczności pól według `docs/LISTING_FIELD_MATRIX.md`.
- [ ] `apartment`: pokazać `areaM2`, `rooms`, `floor`, `totalFloors`, `bathrooms`, `yearBuilt`.
- [ ] `house`: pokazać `areaM2`, `plotAreaM2`, `rooms`, `bathrooms`, `totalFloors`, `yearBuilt`.
- [ ] `land`: pokazać `plotAreaM2`; ukryć lokalowe pola.
- [ ] `commercial`: pokazać `areaM2`, `rooms`, `floor`, `bathrooms`, `totalFloors`, `yearBuilt`.
- [ ] `office`: pokazać `areaM2`, `rooms`, `floor`, `bathrooms`, `totalFloors`, `yearBuilt`.
- [ ] `garage`: pokazać `areaM2`, opcjonalnie `floor`; ukryć pokoje i łazienki.
- [ ] Zmienić label `totalFloors` dla domu na `Liczba kondygnacji`.
- [ ] Zachować wymaganie `plotAreaM2` dla domu i działki.
- [ ] Ujednolicić reguły między `ListingForm` i publicznym wizardem.

Kryterium zakończenia: formularz nie pokazuje pól bez sensu dla wybranego typu, a istniejące walidacje nadal działają.

## Etap 6 — walidacja frontend i backend

- [ ] Sprawdzić `createListingSchema` dla dashboardu.
- [ ] Sprawdzić `validateStep` w publicznym wizardzie.
- [ ] Sprawdzić `CreateListingDto` w API.
- [ ] Sprawdzić DTO publicznych zgłoszeń.
- [ ] Upewnić się, że wymagane pola Fali 1 są spójne po obu stronach.
- [ ] Upewnić się, że ukryte pola nie wysyłają przypadkowych pustych wartości, które psują walidację.
- [ ] Dodać testy jednostkowe helperów widoczności pól, jeśli zostaną wydzielone.

Kryterium zakończenia: użytkownik nie może wysłać niepoprawnej kombinacji pól, a valid payload przechodzi przez frontend i backend.

## Etap 7 — testy regresji

- [ ] Utworzenie mieszkania na sprzedaż.
- [ ] Utworzenie mieszkania na wynajem.
- [ ] Utworzenie domu z wymaganą powierzchnią działki.
- [ ] Próba utworzenia domu bez `plotAreaM2` kończy się błędem walidacji.
- [ ] Utworzenie działki z `plotAreaM2`.
- [ ] Utworzenie lokalu użytkowego.
- [ ] Utworzenie biura.
- [ ] Utworzenie garażu.
- [ ] Publiczny wizard zapisuje i odczytuje szkic z `localStorage`.
- [ ] Publiczny wizard blokuje wysyłkę, jeśli wybrano mniej niż 3 zdjęcia.
- [ ] Dashboard blokuje utworzenie nowej oferty, jeśli wybrano mniej niż 3 zdjęcia.
- [ ] Publiczny wizard buduje poprawny payload zgłoszenia.
- [ ] Dashboard zapisuje poprawny `POST /listings`.
- [ ] Edycja istniejącej oferty nie wymusza ponownego przejścia przez ekran startowy.
- [ ] Katalog publiczny i szczegóły oferty renderują utworzone ogłoszenia.

Kryterium zakończenia: wszystkie scenariusze krytyczne przechodzą ręcznie albo automatycznie.

## Etap 8 — cleanup i jakość kodu

- [ ] Usunąć duplikaty tablic opcji typów nieruchomości.
- [ ] Upewnić się, że helpery formularza są nazwane domenowo, nie UI-owo.
- [ ] Nie mieszać komponentów publicznego wizarda z komponentami dashboardu, poza wspólnym selektorem i konfiguracją.
- [ ] Sprawdzić importy i dead code.
- [ ] Uruchomić lint/typecheck/testy dostępne dla zmienionych pakietów.
- [ ] Zaktualizować dokumenty, jeśli implementacja wymusi zmianę decyzji.

Kryterium zakończenia: kod jest spójny, bez martwych gałęzi i bez rozjazdu między dokumentacją a implementacją.

## Etap 9 — Fala 2 po stabilizacji

Fala 2 nie powinna być mieszana z pierwszym wdrożeniem ekranu startowego.

- [ ] Zaprojektować miejsce zapisu pól jakościowych: `Listing` kontra osobne `*Details`.
- [ ] Dodać migracje dla zaakceptowanych pól.
- [ ] Dodać enumy i walidacje Zod/DTO.
- [ ] Dodać UI sekcji charakterystyki.
- [ ] Dodać wskaźnik kompletności.
- [ ] Dodać generowanie "Najważniejszych informacji".
- [ ] Dodać testy pod nowe pola i migracje.

Kryterium zakończenia: Fala 2 ma osobny zakres, osobne migracje i nie blokuje releasu Fali 1.
