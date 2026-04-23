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

## 1. Stan obecny

Aktualnie aplikacja posiada podstawowy dashboard, ale nie ma jeszcze osobnego modułu raportów.

Co już istnieje:
- `GET /api/dashboard/stats`
- widok dashboardu z podstawowymi KPI
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
- `apps/web/src/lib/dashboard.ts`
- `apps/web/src/hooks/use-dashboard.ts`
- `apps/web/src/app/(dashboard)/dashboard/page.tsx`
- `apps/web/src/app/(dashboard)/dashboard/[...slug]/page.tsx`

Wniosek:
- obecny dashboard daje szybki przegląd sytuacji
- moduł `Raporty` powinien być osobnym obszarem do analizy trendów, porównań okresów, lejków i produktywności
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
