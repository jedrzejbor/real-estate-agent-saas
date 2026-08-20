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

- [x] Utworzyć komponent `ListingIntentSelector`.
- [x] Renderować dwie sekcje: `Sprzedam` i `Wynajmę`.
- [x] Renderować typy nieruchomości z konfiguracji, nie z ręcznie wpisanych przycisków.
- [x] Po kliknięciu zwracać `transactionType` i `propertyType`.
- [x] Dodać stan zaznaczenia, focus, obsługę klawiatury i responsywność.
- [x] Nie wykonywać zapisu API z poziomu tego komponentu.

Kryterium zakończenia: komponent jest czysty, sterowany propsami i nie zna szczegółów publicznego/dashbordowego flow.

Wdrożenie:

- `apps/web/src/components/listings/listing-intent-selector.tsx`
- `apps/web/src/components/listings/index.ts`
- Komponent jest sterowany przez `value`, `onChange`, `disabled` i `className`.
- Komponent korzysta z `LISTING_INTENT_SECTIONS`, więc nie duplikuje listy typów.
- Komponent zwraca wyłącznie `ListingIntentSelection`; nie zna routera, API ani localStorage.
- Zaznaczenie jest reprezentowane przez `aria-pressed`, wizualny check i style focus.
- Przyciski mają pełniejsze `aria-label` w formacie `Sekcja: typ`, np. `Sprzedam: Mieszkanie`.
- Obsługa klawiatury opiera się o natywne przyciski `button`.
- Layout jest responsywny: jedna kolumna na małych ekranach, dwie kolumny od `lg`.
- `ListingIntentSelectorProps` jest eksportowany z indeksu komponentów listingów, żeby kolejne etapy mogły typować integracje bez importu z pliku implementacji.

Weryfikacja:

- `pnpm --filter web type-check` — OK po pierwszej i drugiej iteracji Etapu 2.
- `pnpm --filter web lint` — OK po pierwszej i drugiej iteracji Etapu 2, tylko istniejące ostrzeżenia niezwiązane z tym etapem.

## Etap 3 — integracja w publicznym wizardzie `/dodaj-oferte`

- [x] Dodać krok startowy przed obecnym krokiem `Podstawy` albo przebudować `StepBasics`.
- [x] Po wyborze zapisać `transactionType` i `propertyType` w `draft`.
- [x] Upewnić się, że `localStorage` zachowuje wybór.
- [x] Zmienić walidację kroków tak, aby typ transakcji i typ nieruchomości były walidowane w kroku startowym.
- [x] Usunąć albo zamienić selecty `transactionType` i `propertyType` w `StepBasics` na podsumowanie z opcją zmiany.
- [x] Upewnić się, że `StepParameters` nadal dostaje ustawione typy.
- [x] Upewnić się, że `buildSubmissionPayload` wysyła te same wartości co przed zmianą.
- [x] Zachować przekierowanie zalogowanego agenta do `/dashboard/listings/new`.

Kryterium zakończenia: publiczny użytkownik wybiera intencję na starcie, przechodzi przez wizard i wysyła zgłoszenie bez zmiany kontraktu API.

Wdrożenie:

- `apps/web/src/app/(public)/dodaj-oferte/page.tsx`
- Dodano krok `Typ oferty` przed `Podstawy`.
- Publiczny wizard ma teraz 6 kroków: `Typ oferty`, `Podstawy`, `Parametry`, `Zdjęcia`, `Kontakt`, `Podsumowanie`.
- Krok startowy używa wspólnego `ListingIntentSelector`.
- Wybór zapisuje `transactionType` i `propertyType` do `draft` jednym update'em.
- Istniejący zapis szkicu w `localStorage` zachowuje wybrane wartości bez dodatkowej migracji.
- `StepBasics` nie pokazuje już dwóch selectów; pokazuje podsumowanie wyboru i przycisk `Zmień`.
- Walidacja kroku 0 sprawdza tylko typ transakcji i typ nieruchomości.
- Walidacja podstaw została przesunięta na krok 1, parametrów na krok 2, kontaktu na kroki 4/5.
- `buildSubmissionPayload` nadal korzysta z `draft.transactionType` i `draft.propertyType`, więc kontrakt API nie został zmieniony.
- Przekierowanie zalogowanego agenta do `/dashboard/listings/new` nie zostało zmienione.

Poza zakresem tej iteracji:

- Walidacja minimum 3 zdjęć zostaje do osobnego kroku walidacyjnego, żeby nie mieszać jej z przebudową indeksów wizardu.

Weryfikacja:

- `pnpm --filter web type-check` — OK.
- `pnpm --filter web lint` — OK, tylko istniejące ostrzeżenia niezwiązane z Etapem 3.

## Etap 4 — integracja w dashboardzie `/dashboard/listings/new`

- [x] Dodać stan wyboru startowego na stronie `dashboard/listings/new`.
- [x] Pokazać `ListingIntentSelector` przed formularzem.
- [x] Po wyborze renderować `ListingForm variant="guided"`.
- [x] Dodać do `ListingForm` propsy `initialPropertyType` i `initialTransactionType`.
- [x] Ustawić `propertyType` z propsa początkowego.
- [x] Dodać kontrolowany stan dla `transactionType`, analogicznie do `propertyType`.
- [x] Jeżeli selecty zostają widoczne, pozwolić zmienić wybór bez rozjazdu stanu.
- [x] Selecty pozostają widoczne; ukryte pola nie są potrzebne w tej wersji.
- [x] Nie zmieniać działania edycji istniejącego ogłoszenia.

Kryterium zakończenia: agent tworzy ogłoszenie z prewybranym typem, a edycja istniejącej oferty działa jak wcześniej.

Wdrożenie:

- `apps/web/src/app/(dashboard)/dashboard/listings/new/page.tsx`
- `apps/web/src/components/listings/listing-form.tsx`
- Strona `dashboard/listings/new` pokazuje najpierw wspólny `ListingIntentSelector`.
- Po wyborze renderuje `ListingForm variant="guided"` z `initialPropertyType` i `initialTransactionType`.
- Na ekranie formularza widoczne jest podsumowanie wyboru i przycisk `Zmień typ`.
- `ListingForm` remountuje się po zmianie intencji przez `key={selectedIntent?.id}`, żeby nie przenosić przypadkowego stanu między typami.
- `ListingForm` przyjmuje nowe propsy tylko dla create mode; edycja nadal używa wartości z `listing`.
- `propertyType` i `transactionType` są kontrolowane w formularzu, więc selecty można nadal zmienić bez rozjazdu stanu.
- Asystent opisu dostaje początkowe `propertyType` i `transactionType`.
- Selecty pozostały widoczne w formularzu, więc nie były potrzebne ukryte inputy.

Weryfikacja:

- `pnpm --filter web type-check` — OK.
- `pnpm --filter web lint` — OK, tylko istniejące ostrzeżenia niezwiązane z Etapem 4.

## Etap 5 — dynamiczne pola Fali 1

- [x] Uporządkować logikę widoczności pól według `docs/LISTING_FIELD_MATRIX.md`.
- [x] `apartment`: pokazać `areaM2`, `rooms`, `floor`, `totalFloors`, `bathrooms`, `yearBuilt`.
- [x] `house`: pokazać `areaM2`, `plotAreaM2`, `rooms`, `bathrooms`, `totalFloors`, `yearBuilt`.
- [x] `land`: pokazać `plotAreaM2`; ukryć lokalowe pola.
- [x] `commercial`: pokazać `areaM2`, `rooms`, `floor`, `bathrooms`, `totalFloors`, `yearBuilt`.
- [x] `office`: pokazać `areaM2`, `rooms`, `floor`, `bathrooms`, `totalFloors`, `yearBuilt`.
- [x] `garage`: pokazać `areaM2`, opcjonalnie `floor`; ukryć pokoje i łazienki.
- [x] Zmienić label `totalFloors` dla domu na `Liczba kondygnacji`.
- [x] Zachować wymaganie `plotAreaM2` dla domu i działki.
- [x] Ujednolicić reguły między `ListingForm` i publicznym wizardem.

Kryterium zakończenia: formularz nie pokazuje pól bez sensu dla wybranego typu, a istniejące walidacje nadal działają.

### Wykonane w Etapie 5

Pliki:

- `apps/web/src/lib/listings.ts`
- `apps/web/src/lib/public-listing-form-fields.ts`
- `apps/web/src/components/listings/listing-form.tsx`

Zmiany:

- `LISTING_FIELD_VISIBILITY` jest kompletną, typowaną konfiguracją wszystkich obsługiwanych `PropertyType` i stanowi jedno źródło prawdy dla obu formularzy oraz publicznego widoku oferty.
- Dodano `getListingDynamicFields`, dzięki któremu publiczny wizard nie utrzymuje już osobnej kopii mapy pól.
- Dodano `getListingDynamicFieldLabel`, aby oba formularze używały tych samych etykiet zależnych od typu nieruchomości.
- Dom otrzymał brakujące pole `totalFloors` z etykietą `Liczba kondygnacji`.
- Garaż otrzymał opcjonalne pole `floor`; pola `rooms` i `bathrooms` pozostają ukryte.
- Dla `commercial` i `office` istniejące pole `rooms` ma etykietę `Liczba pomieszczeń`, bez zmiany kontraktu danych.
- Reguły wymaganych parametrów publicznego wizardu pozostały bez zmian, w tym wymagane `plotAreaM2` dla domu i działki. Pełne ujednolicenie walidacji dashboard/API pozostaje zakresem Etapu 6.

Weryfikacja:

- `pnpm --filter web type-check` — OK.
- `pnpm --filter web lint` — OK, tylko istniejące ostrzeżenia niezwiązane z Etapem 5.

## Etap 6 — walidacja frontend i backend

- [x] Sprawdzić `createListingSchema` dla dashboardu.
- [x] Sprawdzić `validateStep` w publicznym wizardzie.
- [x] Sprawdzić `CreateListingDto` w API.
- [x] Sprawdzić DTO publicznych zgłoszeń.
- [x] Upewnić się, że wymagane pola Fali 1 są spójne po obu stronach.
- [x] Upewnić się, że ukryte pola nie wysyłają przypadkowych pustych wartości, które psują walidację.
- [x] Dodać testy jednostkowe helperów widoczności pól po stronie webowej; helper API i DTO są już pokryte testami.
- [x] Wymusić minimum 3 zdjęcia w publicznym wizardzie i DTO zgłoszenia.
- [x] Zaprojektować bezpieczne minimum 3 zdjęcia w dashboardzie bez pozostawiania oferty po nieudanym uploadzie.

Kryterium zakończenia: użytkownik nie może wysłać niepoprawnej kombinacji pól, a valid payload przechodzi przez frontend i backend.

### Wykonane w Etapie 6 — iteracja 1

Frontend:

- Dodano wspólną mapę `LISTING_REQUIRED_DYNAMIC_FIELDS` oraz helpery wymagalności i komunikatów walidacyjnych.
- `createListingSchema` wymaga teraz pól zgodnych z matrycą: `areaM2` poza działką, `plotAreaM2` dla domu i działki oraz `rooms` dla mieszkania i domu.
- W uproszczonym formularzu dashboardu wymagane parametry są widoczne od razu w sekcji podstawowej; opcjonalne pozostają w rozwijanych szczegółach.
- Wydzielono reużywalny renderer `ListingDynamicFields`, który odpowiada za etykiety, ograniczenia, błędy i oznaczenie pól wymaganych.
- Publiczny wizard waliduje obecność, zakres i całkowitość wszystkich widocznych parametrów, a opis jest wymagany.
- Formularz edycji właściciela korzysta z tej samej konfiguracji pól i walidatora co publiczny wizard.
- Payload dashboardu oraz payloady publicznego create/edit usuwają parametry niewidoczne dla wybranego typu nieruchomości.

API:

- Dodano wspólny helper `apps/api/src/common/listing-field-rules.ts` używany przez oba DTO tworzenia.
- `CreateListingDto` i `PublicSubmissionListingDto` wymagają tych samych parametrów dla każdego `PropertyType`.
- Parametry licznikowe (`rooms`, `bathrooms`, `floor`, `totalFloors`, `yearBuilt`) wymagają liczb całkowitych.
- Publiczne zgłoszenie wymaga niepustego opisu; zabezpieczono również tekst składający się wyłącznie ze spacji.

Testy i weryfikacja:

- Dodano test mapy reguł domenowych API.
- Dodano testy kontraktowe obu DTO dla wszystkich sześciu typów nieruchomości, brakujących pól i wartości niecałkowitych.
- Testy celowane: `44` testy w `4` powiązanych zestawach — OK.
- Pełna regresja API: `371` testów w `65` zestawach — OK.
- `pnpm --filter web type-check` — OK.
- `pnpm --filter web lint` — OK, tylko `13` istniejących ostrzeżeń niezwiązanych z Etapem 6.
- `pnpm --filter api type-check` — OK.
- `pnpm --filter api lint` — OK.

### Wykonane w Etapie 6 — iteracja 2

Reguły i testowalność web:

- Wydzielono czyste reguły pól dynamicznych do `apps/web/src/lib/listing-field-rules.ts`; dotychczasowy moduł `listings.ts` zachowuje kompatybilne re-eksporty.
- Dodano osobny moduł `listing-image-rules.ts` z limitami galerii, komunikatem walidacyjnym i testowalnym procesem `create -> upload -> rollback`.
- Dodano konfigurację Jest dla aplikacji webowej oraz `10` testów jednostkowych reguł pól i zdjęć.

Minimum trzech zdjęć:

- Publiczny wizard blokuje przejście i wysyłkę poniżej trzech zdjęć, pokazując błąd bezpośrednio przy galerii.
- `CreatePublicListingSubmissionDto` wymaga od `3` do `15` zdjęć; aktualizacja zgłoszenia właściciela stosuje ten sam zakres, jeżeli galeria jest przesyłana.
- Edycja zgłoszenia właściciela nie pozwala zapisać galerii zawierającej mniej niż trzy zdjęcia.
- Dashboard sprawdza minimum przed utworzeniem encji. Ponieważ API tworzenia i upload zdjęć są osobnymi żądaniami, błąd uploadu uruchamia kompensujące usunięcie szkicu.
- Jeśli kompensujące usunięcie również się nie powiedzie, użytkownik dostaje jednoznaczny komunikat i zostaje przekierowany do edycji zapisanej oferty. Id rekordu nie jest tracone.
- Usuwanie szkicu po stronie API usuwa również lokalne pliki zdjęć, a częściowo zapisany batch uploadu jest sprzątany po błędzie zapisu kolejnego pliku.
- Limity `3–15` mają wspólne stałe w obrębie każdej aplikacji i są używane przez walidację oraz konfigurację interceptorów uploadu.

Weryfikacja:

- Testy web: `10` testów w `2` zestawach — OK.
- Pełna regresja API: `374` testy w `65` zestawach — OK.
- `pnpm --filter web type-check` oraz `pnpm --filter api type-check` — OK.
- `pnpm --filter web lint` — OK, tylko `13` istniejących ostrzeżeń; `pnpm --filter api lint` — OK bez ostrzeżeń.
- `git diff --check` — OK.

Etap 6 jest zakończony. Walidacja domenowa, payloady oraz ograniczenia galerii są spójne na obsługiwanych ścieżkach tworzenia i edycji. Scenariusze przekrojowe UI/API pozostają zakresem Etapu 7.

## Etap 7 — testy regresji

- [ ] Utworzenie mieszkania na sprzedaż.
- [ ] Utworzenie mieszkania na wynajem.
- [ ] Utworzenie domu z wymaganą powierzchnią działki.
- [x] Próba utworzenia domu bez `plotAreaM2` kończy się błędem walidacji.
- [ ] Utworzenie działki z `plotAreaM2`.
- [ ] Utworzenie lokalu użytkowego.
- [ ] Utworzenie biura.
- [ ] Utworzenie garażu.
- [ ] Publiczny wizard zapisuje i odczytuje szkic z `localStorage`.
- [x] Publiczny wizard blokuje wysyłkę, jeśli wybrano mniej niż 3 zdjęcia.
- [x] Dashboard blokuje utworzenie nowej oferty, jeśli wybrano mniej niż 3 zdjęcia.
- [x] Publiczny wizard buduje poprawny payload zgłoszenia.
- [ ] Dashboard zapisuje poprawny `POST /listings`.
- [ ] Edycja istniejącej oferty nie wymusza ponownego przejścia przez ekran startowy.
- [ ] Katalog publiczny i szczegóły oferty renderują utworzone ogłoszenia.

Kryterium zakończenia: wszystkie scenariusze krytyczne przechodzą ręcznie albo automatycznie.

### Wykonane w Etapie 7 — iteracja 1

Architektura testów:

- Wydzielono model szkicu, wartość początkową, walidację kroków i builder payloadu do `apps/web/src/lib/public-listing-wizard.ts`. Strona kreatora odpowiada teraz za orkiestrację UI, a reguły można testować bez renderowania komponentu Next.js.
- Transformacje formularza współpracy z agentem przeniesiono z komponentu UI do `apps/web/src/lib/agent-collaboration-form.ts`. Komponent zachowuje kompatybilne re-eksporty, więc istniejący kod nie wymaga migracji atomowej.
- Typ `CreatePublicListingSubmissionInput` wymaga tablicy `images`, zgodnie z kontraktem DTO API z Etapu 6.
- Konfiguracja Jest obsługuje alias `@/`, używany przez produkcyjne moduły aplikacji.

Pokryte scenariusze:

- Macierz publicznego payloadu obejmuje wszystkie sześć typów nieruchomości oraz mieszkanie w wariancie sprzedaży i wynajmu.
- Builder usuwa z serializowanego payloadu pola niewidoczne dla danego typu oraz pola czynszowe dla sprzedaży.
- Galeria otrzymuje deterministyczną kolejność i dokładnie jedno zdjęcie główne.
- Walidator publicznego kreatora akceptuje wymagane parametry wszystkich sześciu typów i odrzuca dom bez `plotAreaM2`.
- Walidator publicznego kreatora odrzuca dwa zdjęcia i akceptuje trzy.
- Schemat dashboardu przechodzi macierz `6 typów × 2 transakcje` i odrzuca dom bez `plotAreaM2`.
- Istniejący test procesu `createListingWithImages` potwierdza, że dashboard nie wywołuje API tworzenia poniżej trzech zdjęć.

Weryfikacja:

- Testy web: `42` testy w `4` zestawach — OK.
- Pełna regresja API: `374` testy w `65` zestawach — OK.
- Typecheck web i API — OK.
- Lint API — OK; lint web — bez błędów, `13` istniejących ostrzeżeń.

Etap 7 pozostaje otwarty. Testy kontraktowe przygotowują bezpieczną bazę, ale punktów „utworzenie oferty” nie oznaczono jako wykonane bez przejścia przez rzeczywisty endpoint. Kolejna iteracja powinna objąć żądania API dashboardu i publicznych zgłoszeń, a następnie scenariusze przeglądarkowe `localStorage`, edycji i katalogu publicznego.

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
