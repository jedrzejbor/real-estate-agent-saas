# Raporty — Specyfikacja Modułu

Dokument opisuje, jakie raporty warto wdrożyć w zakładce `Raporty` w EstateFlow, jakie mają cele biznesowe oraz jak powinny zostać zaimplementowane w obecnej architekturze aplikacji.

Zakres dokumentu:
- raporty dla agentów nieruchomości i biur nieruchomości
- raporty operacyjne, sprzedażowe i efektywnościowe
- priorytety wdrożenia
- sposób implementacji w obecnym stacku Next.js + NestJS + PostgreSQL

Dokument jest żywy i powinien być aktualizowany przy każdej zmianie:
- modelu danych
- statusów ofert, klientów i spotkań
- zakresu dashboardu
- wymagań biznesowych dla planów SaaS

---

## 0. Status wdrożenia

### Aktualizacja: 25.04.2026 — Iteracja 5

Stan realizacji:
- wdrożono trzeci dedykowany raport pionowy: `Spotkania`
- dodano backendowy endpoint `GET /api/reports/appointments`
- dodano frontendową sekcję `Raport Spotkania` na stronie `/dashboard/reports`
- utrzymano wspólne filtry raportowe i ten sam model serwerowego wymuszania scope danych

Zakres dostarczony w Iteracji 5:
- backend:
  - `summary` dla raportu spotkań
  - breakdown po `AppointmentStatus`
  - breakdown po `AppointmentType`
- frontend:
  - sekcja `Raport Spotkania`
  - karty podsumowujące dla kluczowych metryk spotkań
  - breakdown statusów i typów spotkań

Aktualnie raport `Spotkania` obejmuje:
- liczba spotkań łącznie w okresie
- liczba spotkań zakończonych
- liczba spotkań zaplanowanych
- liczba spotkań anulowanych
- liczba `no_show`
- liczba spotkań powiązanych z klientem
- liczba spotkań powiązanych z ofertą
- współczynnik zakończonych spotkań `completed / total`

Ważne założenia jakościowe i bezpieczeństwa:
- zakres danych jest nadal wymuszany po stronie backendu na podstawie roli użytkownika
- raport nie ufa samemu `agentId` z query stringa
- filtry przechodzą przez DTO i globalną walidację
- agregacje używają parametryzowanych zapytań QueryBuilder
- filtry `propertyType` i `transactionType` są stosowane w raporcie spotkań tylko do rekordów powiązanych z ofertą, aby wynik pozostał semantycznie poprawny

Świadome ograniczenia Iteracji 5:
- brak jeszcze analizy relacji spotkania → zamknięta sprawa jako osobnej metryki konwersji
- brak jeszcze raportu trendów spotkań rozbitego o skuteczność per typ spotkania
- część spotkań może nie mieć relacji do oferty, więc filtrowanie po typie nieruchomości / transakcji świadomie zawęża wynik tylko do spotkań z powiązaną ofertą

Walidacja Iteracji 5:
- `apps/api`: TypeScript compile OK
- `apps/web`: production build OK

Następny krok:
- wdrożyć dedykowany raport `Lejek`
- policzyć klientów na etapach i przejścia pomiędzy etapami w modelu MVP
- następnie przejść do raportu `Wartość i sprzedaż`

### Aktualizacja: 24.04.2026 — Iteracja 4

Stan realizacji:
- wdrożono drugi dedykowany raport pionowy: `Klienci`
- dodano backendowy endpoint `GET /api/reports/clients`
- dodano frontendową sekcję `Raport Klienci` na stronie `/dashboard/reports`
- utrzymano wspólne filtry raportowe i ten sam model serwerowego wymuszania scope danych

Zakres dostarczony w Iteracji 4:
- backend:
  - `summary` dla raportu klientów
  - breakdown po `ClientStatus`
  - breakdown po `ClientSource`
- frontend:
  - sekcja `Raport Klienci`
  - karty podsumowujące dla kluczowych metryk klientów
  - breakdown statusów i źródeł leadów

Aktualnie raport `Klienci` obejmuje:
- liczba klientów łącznie
- liczba nowych klientów w okresie
- liczba klientów w aktywnym pipeline
- liczba klientów w negocjacjach
- liczba spraw zakończonych sukcesem w okresie
- liczba spraw utraconych w okresie
- współczynnik konwersji `won / (won + lost)`

Ważne założenia jakościowe i bezpieczeństwa:
- zakres danych jest nadal wymuszany po stronie backendu na podstawie roli użytkownika
- raport nie ufa samemu `agentId` z query stringa
- filtry przechodzą przez DTO i globalną walidację
- agregacje używają parametryzowanych zapytań QueryBuilder
- filtr `propertyType` dla klientów działa na podstawie `ClientPreference.propertyType`
- filtr `transactionType` nie jest jeszcze stosowany w raporcie klientów, ponieważ obecny model klienta nie przechowuje preferencji typu transakcji

Świadome ograniczenia Iteracji 4:
- brak pełnej historii przejść klienta pomiędzy statusami
- metryki wygranych / straconych spraw w okresie opierają się na bieżącym statusie i `updatedAt`
- brak jeszcze funnel conversion per etap jako osobny raport

Walidacja Iteracji 4:
- `apps/api`: TypeScript compile OK
- `apps/web`: production build OK

Następny krok:
- wdrożyć dedykowany raport `Spotkania`
- dodać breakdown po `AppointmentType` i `AppointmentStatus`
- następnie przejść do raportu `Lejek`

### Aktualizacja: 24.04.2026 — Iteracja 3

Stan realizacji:
- wdrożono pierwszy dedykowany raport pionowy: `Oferty`
- dodano backendowy endpoint `GET /api/reports/listings`
- dodano frontendową sekcję `Raport Oferty` na stronie `/dashboard/reports`
- zachowano wspólne filtry raportowe i serwerowe wymuszanie zakresu danych

Zakres dostarczony w Iteracji 3:
- backend:
  - `summary` dla raportu ofert
  - breakdown po `ListingStatus`
  - breakdown po `PropertyType`
  - breakdown po `TransactionType`
- frontend:
  - sekcja `Raport Oferty`
  - karty podsumowujące dla kluczowych metryk ofert
  - breakdowny z udziałem procentowym i dodatkowymi detalami dla typów nieruchomości / transakcji

Aktualnie raport `Oferty` obejmuje:
- liczba ofert łącznie
- liczba nowych ofert w okresie
- liczba aktywacji na podstawie `publishedAt`
- liczba zamknięć (`sold` + `rented`) w okresie
- liczba wycofań / archiwizacji (`withdrawn` + `archived`) w okresie
- liczba aktywnych ofert na koniec okresu
- średni czas życia oferty dla rekordów zakończonych w okresie

Ważne założenia jakościowe i bezpieczeństwa:
- zakres danych jest nadal wymuszany po stronie backendu na podstawie roli użytkownika
- raport nie ufa samemu `agentId` z query stringa
- filtry przechodzą przez DTO i globalną walidację
- agregacje używają parametryzowanych zapytań QueryBuilder
- obecne metryki statusowe opierają się na bieżącym stanie rekordu oraz polach `createdAt`, `updatedAt`, `publishedAt`

Świadome ograniczenia Iteracji 3:
- brak historycznych snapshotów statusów ofert
- brak dokładnego raportowania momentów przejścia między wszystkimi statusami
- metryki zamknięć i wycofań są przybliżeniem MVP, dopóki nie zostanie rozbudowana historia zmian

Walidacja Iteracji 3:
- `apps/api`: TypeScript compile OK
- `apps/web`: production build OK

Następny krok:
- wdrożyć dedykowany raport `Klienci`
- dodać breakdown po `ClientSource` i `ClientStatus`
- następnie przejść do raportu `Spotkania`

### Aktualizacja: 24.04.2026 — Iteracja 2

Stan realizacji:
- rozbudowano `GET /api/reports/overview` o porównanie do poprzedniego okresu
- dodano bucketowane trendy dla widoku `Przegląd`
- frontend renderuje już rzeczywisty widok overview zamiast wyłącznie foundation placeholderów
- utrzymano wspólny kontrakt filtrów i serwerowe wymuszanie scope danych

Zakres dostarczony w Iteracji 2:
- backend:
  - `comparison.previousPeriod`
  - `comparison.deltas` dla KPI overview
  - `timeline` z bucketami `day / week / month`
  - helpery do bezpiecznego bucketowania i poprzedniego okresu
- frontend:
  - delty KPI w overview
  - karty trendów dla:
    - nowych ofert
    - nowych klientów
    - spotkań
  - sekcja porównania bieżącego zakresu do poprzedniego okresu

Decyzje implementacyjne w Iteracji 2:
- nie dodawano zewnętrznej biblioteki wykresowej na tym etapie
- trendy są renderowane przez lekkie, własne komponenty UI zgodne ze stylem aplikacji
- bucketowanie pozostaje kontrolowane po stronie backendu, co upraszcza spójność odpowiedzi API
- porównanie do poprzedniego okresu bazuje na zakresie o identycznej długości jak aktualny filtr

Walidacja Iteracji 2:
- `apps/api`: TypeScript compile OK
- `apps/web`: production build OK

Ograniczenia nadal świadomie pozostawione:
- brak osobnych endpointów `listings`, `clients`, `appointments`, `funnel`, `revenue`
- brak zaawansowanych tabel breakdown i insightów decyzyjnych per sekcja
- brak raportów opartych o pełną historię zmian statusów

Następny krok:
- wdrożyć dedykowany raport `listings`
- dodać breakdown po statusach, typie nieruchomości i typie transakcji
- przygotować analogiczny pionowy slice dla `clients`

### Aktualizacja: 24.04.2026 — Iteracja 1

Stan realizacji:
- faza 0 została ustalona i sformalizowana
- wdrożono foundation modułu `Reports`
- dodano dedykowany route frontendowy `/dashboard/reports`
- dodano pierwszy endpoint backendowy `GET /api/reports/overview`
- wdrożono wspólny kontrakt filtrów raportowych dla MVP:
  - `dateFrom`
  - `dateTo`
  - `groupBy`
  - `agentId`
  - `propertyType`
  - `transactionType`

Zrealizowane decyzje architektoniczne:
- raporty są rozwijane w osobnym `ReportsModule`, a nie w `DashboardModule`
- zakres danych jest wymuszany po stronie backendu na podstawie zalogowanego użytkownika
- walidacja filtrów raportowych odbywa się przez DTO + globalny `ValidationPipe`
- backend ogranicza zakres dat dla raportów MVP, aby zmniejszyć ryzyko kosztownych zapytań i błędów operacyjnych
- frontend korzysta z dedykowanego klienta API i hooka do raportów

Aktualnie gotowe technicznie:
- backend:
  - `apps/api/src/reports/reports.module.ts`
  - `apps/api/src/reports/reports.controller.ts`
  - `apps/api/src/reports/reports.service.ts`
  - `apps/api/src/reports/dto/report-filters.dto.ts`
- frontend:
  - `apps/web/src/app/(dashboard)/dashboard/reports/page.tsx`
  - `apps/web/src/lib/reports.ts`
  - `apps/web/src/hooks/use-reports.ts`
  - `apps/web/src/components/reports/*`

Zakres Iteracji 1:
- foundation only
- bez wykresów produkcyjnych
- bez dedykowanych endpointów `listings`, `clients`, `funnel`, `appointments`, `revenue`
- bez raportów zespołowych wykraczających poza bezpieczny scope agencyjny

Następny krok:
- wdrożony w Iteracji 2
- kolejne kroki są opisane wyżej w najnowszym statusie wdrożenia

---

## 1. Stan obecny

Aktualnie aplikacja posiada podstawowy dashboard oraz działający foundation modułu raportów z rozbudowanym widokiem `overview`.

Co już istnieje:
- `GET /api/dashboard/stats`
- `GET /api/reports/overview`
- widok dashboardu z podstawowymi KPI
- dedykowana strona `/dashboard/reports`
- porównanie bieżącego zakresu do poprzedniego okresu w `overview`
- bucketowane trendy `day / week / month` w `overview`
- agregacje dla:
  - ofert
  - klientów
  - spotkań
  - wartości aktywnych ofert i zamkniętych transakcji
- sekcje:
  - stat cards
  - recent activity
  - upcoming appointments
  - breakdown statusów ofert i klientów

Powiązane pliki:
- `apps/api/src/dashboard/dashboard.service.ts`
- `apps/api/src/dashboard/dashboard.controller.ts`
- `apps/api/src/reports/reports.service.ts`
- `apps/api/src/reports/reports.controller.ts`
- `apps/api/src/reports/dto/report-filters.dto.ts`
- `apps/web/src/lib/dashboard.ts`
- `apps/web/src/hooks/use-dashboard.ts`
- `apps/web/src/lib/reports.ts`
- `apps/web/src/hooks/use-reports.ts`
- `apps/web/src/app/(dashboard)/dashboard/page.tsx`
- `apps/web/src/app/(dashboard)/dashboard/[...slug]/page.tsx`
- `apps/web/src/app/(dashboard)/dashboard/reports/page.tsx`

Wniosek:
- obecny dashboard daje szybki przegląd sytuacji
- moduł `Raporty` jest już wydzielony jako osobny obszar i powinien być dalej rozwijany o trendy, porównania okresów, lejki i produktywność
- nie należy mieszać pełnych raportów z dashboardem głównym

---

## 2. Cel zakładki Raporty

Zakładka `Raporty` ma odpowiadać na pytania biznesowe, których dashboard nie rozwiązuje w pełni.

Najważniejsze pytania użytkownika:
- ile nowych ofert i klientów pozyskuję w czasie
- które działania prowadzą do zamkniętych transakcji
- ile czasu zajmuje przejście od leada do zamknięcia
- jak wygląda skuteczność mojej pracy miesiąc do miesiąca
- które typy ofert sprzedają się najlepiej
- ile spotkań faktycznie przekłada się na transakcje
- jak wygląda efektywność agenta lub zespołu

Zakładka `Raporty` powinna służyć do:
- analizy trendów
- porównywania okresów
- wykrywania wąskich gardeł
- rozliczania efektywności pracy
- wspierania decyzji biznesowych w biurze nieruchomości

---

## 3. Główne zasady projektowe

### 3.1. Dashboard nie jest raportownią

Dashboard główny ma pokazywać szybki stan „tu i teraz”.

Zakładka `Raporty` ma pokazywać:
- trendy
- porównania
- lejki
- skuteczność
- historię w czasie

### 3.2. Raporty muszą być filtrowalne

Każdy raport powinien wspierać przynajmniej:
- zakres dat
- widok dzienny / tygodniowy / miesięczny
- filtr po agencie
- filtr po typie nieruchomości
- filtr po typie transakcji

W kolejnych etapach:
- filtr po źródle klienta
- filtr po statusie oferty
- filtr po mieście / województwie

### 3.3. Raporty mają być decyzjocentryczne

Nie chodzi o „dużo wykresów”, tylko o raporty odpowiadające na realne potrzeby:
- co działa
- co nie działa
- gdzie tracimy leady
- gdzie mamy największy potencjał

### 3.4. Najpierw raporty z obecnych danych

Pierwsze wdrożenie powinno wykorzystywać to, co już mamy w modelu:
- `Listing`
- `Client`
- `Appointment`
- `ActivityLog`

Dopiero potem warto dodawać bardziej zaawansowane raporty zależne od:
- publikacji portalowych
- prowizji
- kosztów marketingowych
- czasu reakcji

---

## 4. Rekomendowane raporty

## 4.1. Raport ofert

Cel:
- pokazać, jak rozwija się baza ofert i jak zmieniają się statusy ofert w czasie

Najważniejsze metryki:
- liczba nowych ofert w okresie
- liczba aktywowanych ofert
- liczba ofert sprzedanych / wynajętych
- liczba ofert wycofanych / zarchiwizowanych
- średni czas życia oferty
- liczba aktywnych ofert na koniec okresu

Widoki:
- trend liczby nowych ofert w czasie
- breakdown po statusach
- breakdown po typie nieruchomości
- breakdown po typie transakcji

Wartość biznesowa:
- agent widzi, czy regularnie uzupełnia portfel ofert
- biuro widzi, czy pipeline ofert nie wysycha

## 4.2. Raport klientów i leadów

Cel:
- mierzyć napływ leadów oraz ich przejście przez pipeline klienta

Najważniejsze metryki:
- liczba nowych klientów w okresie
- liczba leadów per źródło
- liczba klientów aktywnych
- liczba klientów w negocjacjach
- liczba klientów zamkniętych sukcesem
- liczba klientów straconych
- współczynnik konwersji leadów

Widoki:
- trend nowych klientów
- breakdown po `ClientSource`
- breakdown po `ClientStatus`
- porównanie wygranych vs straconych

Wartość biznesowa:
- pokazuje jakość pozyskiwanych leadów
- pozwala ocenić, które źródła klientów działają najlepiej

## 4.3. Raport lejka sprzedażowego

Cel:
- pokazać przejścia między etapami klienta i miejsca utraty konwersji

Najważniejsze etapy:
- `new`
- `contacted`
- `qualified`
- `active`
- `negotiating`
- `closed_won`
- `closed_lost`

Najważniejsze metryki:
- liczba klientów na każdym etapie
- procent przejścia do kolejnego etapu
- współczynnik utraty na etapie
- średni czas spędzony na etapie

Widoki:
- funnel chart
- tabela konwersji między etapami
- lista etapów o największej utracie

Wartość biznesowa:
- jeden z najważniejszych raportów dla agenta i managera
- pokazuje, gdzie proces sprzedaży realnie się blokuje

## 4.4. Raport spotkań i aktywności

Cel:
- mierzyć produktywność operacyjną agenta

Najważniejsze metryki:
- liczba spotkań w okresie
- liczba spotkań zakończonych
- liczba anulowanych
- liczba `no_show`
- liczba oglądań, negocjacji, podpisań
- liczba aktywności na ofertach i klientach

Widoki:
- trend liczby spotkań
- breakdown po typie spotkania
- breakdown po statusie spotkania
- relacja spotkania → zamknięte sprawy

Wartość biznesowa:
- agent widzi swoją aktywność
- manager widzi, czy zespół pracuje regularnie i skutecznie

## 4.5. Raport skuteczności oferty

Cel:
- ocenić, które oferty i typy nieruchomości pracują najlepiej

Najważniejsze metryki:
- liczba aktywnych ofert per typ nieruchomości
- liczba sprzedanych / wynajętych per typ
- średni czas do zamknięcia
- średnia cena ofert aktywnych i zamkniętych
- wskaźnik zamknięcia per typ nieruchomości

Widoki:
- tabela typów nieruchomości
- ranking najlepiej działających segmentów
- porównanie sprzedaż vs wynajem

Wartość biznesowa:
- agent i biuro widzą, na jakich typach nieruchomości zarabiają najskuteczniej

## 4.6. Raport przychodowy i wartości portfela

Cel:
- pokazać wartość obecnego portfela oraz wartość transakcji zamkniętych

Najważniejsze metryki:
- łączna wartość aktywnych ofert
- łączna wartość ofert sprzedanych
- łączna wartość ofert wynajętych
- średnia cena ofert aktywnych
- średnia wartość zamkniętej sprawy

Widoki:
- trend wartości portfela
- trend wartości zamknięć
- breakdown po sprzedaży i wynajmie

Wartość biznesowa:
- kluczowy raport dla właściciela biura
- wspiera ocenę skali biznesu i progresu miesiąc do miesiąca

Uwaga:
- jeśli w przyszłości dodamy prowizje, raport powinien zostać rozszerzony o realny przychód, a nie tylko wartość ofert

## 4.7. Raport efektywności agenta lub zespołu

Cel:
- porównać skuteczność agentów w planach wieloosobowych

Najważniejsze metryki:
- liczba ofert dodanych przez agenta
- liczba nowych klientów
- liczba spotkań
- liczba spraw zamkniętych sukcesem
- konwersja klienta
- wartość zamkniętych transakcji

Widoki:
- ranking agentów
- tabela porównawcza
- porównanie okres do okresu

Wartość biznesowa:
- ważne dla ownera i admina
- niekoniecznie potrzebne w planie solo jako osobny raport

## 4.8. Raport czasu procesu

Cel:
- mierzyć, ile czasu realnie trwa przejście przez kluczowe etapy procesu

Najważniejsze metryki:
- średni czas od utworzenia klienta do `closed_won`
- średni czas od utworzenia oferty do `active`
- średni czas od `active` do `sold` / `rented`
- średni czas od pierwszego kontaktu do pierwszego spotkania

Widoki:
- KPI z medianą i średnią
- wykres rozkładu
- porównanie między agentami i typami ofert

Wartość biznesowa:
- bardzo cenny raport operacyjny
- pomaga identyfikować opóźnienia w procesie

Wymaganie:
- ten raport będzie działał najlepiej po szerszym wykorzystaniu `ActivityLog`

---

## 5. Priorytety wdrożenia

## Etap 1 — MVP zakładki Raporty

Raporty do wdrożenia najpierw:
- raport ofert
- raport klientów i leadów
- raport lejka sprzedażowego
- raport spotkań i aktywności
- raport przychodowy i wartości portfela

Powód:
- bazują na danych już obecnych w systemie
- odpowiadają na najważniejsze pytania biznesowe
- są najbardziej przydatne dla pojedynczego agenta i małego biura

## Etap 2 — Rozszerzenie analityczne

Raporty do wdrożenia później:
- raport skuteczności oferty
- raport efektywności agenta lub zespołu
- raport czasu procesu

Powód:
- wymagają bardziej dopracowanego modelu zdarzeń i filtrów
- część z nich jest szczególnie cenna dopiero w planach zespołowych

## Etap 3 — Raporty zaawansowane

Do rozważenia później:
- raport skuteczności publikacji portalowych
- raport źródeł leadów vs zamknięcia
- raport prowizji i realnych przychodów
- raport jakości danych i braków w ofertach

---

## 6. Proponowany układ zakładki Raporty

Zakładka `Raporty` nie powinna być jedną długą stroną z losowymi kartami.

Rekomendowany układ:

### 6.1. Pasek filtrów globalnych

Filtry wspólne dla całego modułu:
- zakres dat
- preset: 7 dni / 30 dni / kwartał / rok / custom
- agent
- typ nieruchomości
- typ transakcji

### 6.2. Sekcje raportowe

Rekomendowane sekcje:
- `Przegląd`
- `Oferty`
- `Klienci`
- `Lejek`
- `Spotkania`
- `Wartość i sprzedaż`
- `Zespół` — tylko jeśli użytkownik ma odpowiednią rolę

### 6.3. Forma prezentacji

Każdy raport powinien mieć:
- krótkie KPI u góry
- jeden główny wykres trendu
- jeden breakdown tabelaryczny lub słupkowy
- krótki insight tekstowy w UI

Przykład:
- „W ostatnich 30 dniach liczba nowych leadów wzrosła o 18% względem poprzedniego okresu”

---

## 7. Sposób wdrożenia w obecnej architekturze

## 7.1. Backend

Rekomendacja:
- dodać nowy `ReportsModule` zamiast rozbudowywać bez końca `DashboardModule`

Powód:
- dashboard i raporty to różne przypadki użycia
- moduł raportów będzie miał własne DTO, agregacje i endpointy
- łatwiej utrzymać i rozwijać logikę

Proponowana struktura:
- `apps/api/src/reports/reports.module.ts`
- `apps/api/src/reports/reports.controller.ts`
- `apps/api/src/reports/reports.service.ts`
- `apps/api/src/reports/dto/*`

Przykładowe endpointy:
- `GET /api/reports/overview`
- `GET /api/reports/listings`
- `GET /api/reports/clients`
- `GET /api/reports/funnel`
- `GET /api/reports/appointments`
- `GET /api/reports/revenue`
- `GET /api/reports/team-performance`

Każdy endpoint powinien przyjmować wspólny zestaw filtrów:
- `dateFrom`
- `dateTo`
- `groupBy`
- `agentId`
- `propertyType`
- `transactionType`

## 7.2. Frontend

Rekomendacja:
- dodać dedykowaną stronę `apps/web/src/app/(dashboard)/dashboard/reports/page.tsx`
- nie używać już placeholdera z `[...slug]` dla `reports`

Dodatkowo:
- `apps/web/src/lib/reports.ts` — typy, API fetch, helpery
- `apps/web/src/hooks/use-reports.ts` — pobieranie i refetch danych
- komponenty raportowe, np.:
  - `reports-filter-bar.tsx`
  - `reports-kpi-strip.tsx`
  - `report-section-card.tsx`
  - `funnel-report.tsx`
  - `revenue-report.tsx`

## 7.3. Dane i agregacje

Na start raporty mogą być liczone on-demand z SQL/QueryBuilder.

To wystarczy dla MVP, jeśli:
- skala danych jest mała lub średnia
- raporty są filtrowane po agencie

W kolejnych etapach warto rozważyć:
- preagregacje dzienne
- materialized views
- snapshoty raportowe

Szczególnie dla:
- raportów zespołowych
- długich zakresów dat
- planów enterprise

## 7.4. Role i uprawnienia

Raporty powinny respektować role:
- `agent` widzi swoje dane
- `admin` i `owner` mogą widzieć dane wielu agentów lub całego biura
- `viewer` może mieć tylko odczyt wybranych raportów

To oznacza, że backend nie może polegać wyłącznie na filtrze z query stringa.
Zakres danych musi być wymuszany po stronie serwisu na podstawie zalogowanego użytkownika.

---

## 8. Wymagania danych do raportów

Większość raportów MVP można wdrożyć już teraz na bazie:
- `Listing.createdAt`
- `Listing.status`
- `Listing.propertyType`
- `Listing.transactionType`
- `Listing.price`
- `Client.createdAt`
- `Client.status`
- `Client.source`
- `Appointment.startTime`
- `Appointment.status`
- `Appointment.type`

Do dokładniejszych raportów w przyszłości przydadzą się dodatkowe dane:
- daty wejścia i wyjścia z poszczególnych statusów
- prowizja od transakcji
- koszt pozyskania leada
- portal publikacji oferty
- liczba zapytań o ofertę
- liczba oglądań oferty

---

## 9. Testy i scenariusze weryfikacyjne

Minimalny zakres testów dla modułu raportów:

1. Raport zwraca dane tylko dla zalogowanego agenta.
2. Owner/admin może filtrować dane zespołu.
3. Zmiana zakresu dat zmienia agregacje poprawnie.
4. Grupowanie dzienne / tygodniowe / miesięczne daje poprawne bucketowanie.
5. Raport lejka poprawnie liczy konwersję między etapami.
6. Raport przychodowy poprawnie sumuje wartości ofert według statusów.
7. Raport spotkań poprawnie rozdziela `scheduled`, `completed`, `cancelled`, `no_show`.
8. Brak danych zwraca poprawny empty state, a nie błąd.

Na froncie należy sprawdzić:
- loading state
- error state
- empty state
- zgodność filtrów globalnych ze wszystkimi sekcjami raportowymi

---

## 10. Rekomendowana kolejność wdrożenia

### Krok 1

- stworzyć `ReportsModule` w API
- dodać wspólne DTO filtrów raportowych
- wdrożyć `GET /api/reports/overview`
- dodać stronę `/dashboard/reports`

### Krok 2

- wdrożyć raport ofert
- wdrożyć raport klientów i leadów
- wdrożyć raport spotkań

### Krok 3

- wdrożyć raport lejka sprzedażowego
- wdrożyć raport wartości portfela i sprzedaży

### Krok 4

- wdrożyć raport zespołowy
- wdrożyć raport czasu procesu
- dodać bardziej zaawansowane porównania okresów

---

## 11. Podsumowanie

Najbardziej wartościowa zakładka `Raporty` dla EstateFlow to nie zbiór przypadkowych statystyk, tylko zestaw raportów odpowiadających na codzienną pracę agenta i biura:
- ile mam ofert i jak się zmieniają
- skąd mam leady i jak konwertują
- ile spotkań przekłada się na wynik
- jaka jest wartość portfela i zamkniętych spraw
- gdzie proces sprzedaży się blokuje

Najlepszy kierunek wdrożenia:
- osobny `ReportsModule`
- osobna strona `/dashboard/reports`
- raporty budowane etapami, zaczynając od danych, które już istnieją w systemie

To pozwoli dowieźć realną wartość biznesową szybko, bez nadmiernego komplikowania obecnego dashboardu.
