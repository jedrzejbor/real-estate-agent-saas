# Audyt spójności danych dashboardu po logowaniu

Data audytu: 2026-09-01  
Zakres: główny widok `/dashboard` po zalogowaniu agenta, endpointy `GET /api/dashboard/stats`, `GET /api/dashboard/today`, `GET /api/insights`, dane planu z `GET /api/auth/me` oraz liczniki nawigacji.  
Metoda: przegląd kodu frontend/backend. Nie wykonywano pełnego manualnego QA w przeglądarce na danych produkcyjnych.

## Wniosek główny

Dane są funkcjonalnie podłączone, ale nie są w pełni spójne semantycznie. Największy problem to mieszanie zakresów danych:

- `dashboard/stats` i `dashboard/today` liczą dane dla pojedynczego zalogowanego agenta.
- `insights` oraz `auth/me.usage` liczą dane dla całego workspace/agencji.
- UI nie komunikuje tego rozróżnienia, więc użytkownik może widzieć obok siebie liczby z różnych populacji danych.

Rekomendacja produktowo-techniczna: ujednolicić dashboard do jednego domyślnego zakresu, najlepiej `workspace`, i dodać przełącznik `Moje / Workspace`, albo jawnie oznaczyć każdy blok zakresem danych.

## Priorytety

| Priorytet | Obszar | Decyzja |
| --- | --- | --- |
| P0 | Zakres danych agent vs workspace | Ujednolicić kontrakt danych przed dalszą rozbudową KPI. |
| P1 | Liczniki z listy `today.items` | Oddzielić agregaty/liczniki od przyciętej listy akcji. |
| P1 | Brakujące statusy w rozbiciach | Dodać wszystkie statusy albo wyjaśnić, że część statusów jest pomijana. |
| P1 | Nazwy metryk finansowych | Doprecyzować, z jakich statusów liczone są wartości. |
| P2 | Copy i formatowanie | Usunąć raw enumy, wewnętrzne roadmapowe teksty i niejednoznaczne daty. |

## Szczegółowe uwagi i rozwiązania

### 1. Mieszanie zakresu danych: agent vs workspace

**Problem**  
`DashboardService.getStats()` i `getToday()` rozwiązują pojedynczego agenta przez `resolveAgent(userId)` i dalej filtrują po `agentId`. Dotyczy to ofert, klientów, spotkań, dokumentów, aktywności i listy zadań na dziś.  
Pliki:

- `apps/api/src/dashboard/dashboard.service.ts`, linie 164-184
- `apps/api/src/dashboard/dashboard.service.ts`, linie 197-217

Jednocześnie `InsightsService.getDashboardInsights()` pobiera `agencyAgentIds` i liczy insighty dla całego workspace.  
Plik:

- `apps/api/src/insights/insights.service.ts`, linie 82-99

Plan i limity w `auth/me` też bazują na `agencyAgentIds`.  
Plik:

- `apps/api/src/users/users.service.ts`, linie 240-286

**Skutek**  
Agent w zespole może zobaczyć np.:

- karta `Klienci`: tylko jego klienci,
- karta `Plan`: wykorzystanie całego workspace,
- `Insight dnia`: ryzyko z leadów/zadań innego agenta.

To wygląda jak niespójne dane, mimo że każda część osobno działa poprawnie.

**Rozwiązanie**  
Dodać jawny zakres do dashboardu:

- backend: `GET /dashboard/stats?scope=mine|workspace`, `GET /dashboard/today?scope=mine|workspace`;
- odpowiedzi API: dodać pole `scope: 'mine' | 'workspace'`;
- UI: dodać segment `Moje / Workspace` albo etykietę przy sekcjach, np. `Zakres: workspace`;
- plan/usage zostawić jako workspace, ale oznaczyć to w opisie.

Minimalny wariant: zostawić obecne filtrowanie, ale w UI dopisać `Moje dane` przy dashboard stats i `Workspace` przy planie oraz insightach.

### 2. Badge zakładki `Dzisiaj` nie pokazuje liczby akcji na dziś

**Problem**  
Badge zakładki `Dzisiaj` jest liczony jako suma: aktywne oferty + wszyscy klienci + spotkania w tym tygodniu.  
Plik:

- `apps/web/src/app/(dashboard)/dashboard/page.tsx`, linie 305-315

Jednocześnie panel `Dzisiaj` pokazuje `today.items.length`, czyli maksymalnie 10 wybranych akcji.  
Plik:

- `apps/web/src/app/(dashboard)/dashboard/page.tsx`, linie 589-600

**Skutek**  
Zakładka `Dzisiaj` może mieć badge `87`, a panel wewnątrz `3 akcje`. Dla użytkownika wygląda to jak błąd.

**Rozwiązanie**  
Badge zakładki `Dzisiaj` powinien korzystać z agregatu listy działań:

- dodać do `GET /dashboard/today` pole `summary.totalActions`;
- badge ustawić na `summary.totalActions`;
- jeżeli summary nie jest jeszcze załadowane, pokazać `...` albo ukryć badge.

### 3. Liczniki priorytetów dnia są liczone z przyciętej listy kart

**Problem**  
`TodayOperationalSummary` liczy nowe leady, zadania po terminie i spotkania dzisiaj z `today.items`. Ta lista jest po stronie backendu przycinana do 10 elementów.  
Pliki:

- `apps/api/src/dashboard/dashboard.service.ts`, linie 219-235
- `apps/web/src/app/(dashboard)/dashboard/page.tsx`, linie 486-499

Dodatkowo sidebar liczy `Zapytania`, `Zadania`, `Kalendarz` z tej samej przyciętej listy `today.items`.  
Plik:

- `apps/web/src/components/dashboard/sidebar.tsx`, linie 467-502

**Skutek**  
Jeżeli użytkownik ma np. 18 zaległych zadań, licznik może pokazać tylko te, które zmieściły się w top 10. Jeżeli priorytetowe dokumenty lub spotkania wypchną zadania poza listę, licznik `Zadania` może być zaniżony albo równy 0.

**Rozwiązanie**  
Rozdzielić listę kart od agregatów:

- `GET /dashboard/today` powinien zwracać:
  - `items`: lista top 10 do wyświetlenia,
  - `summary`: pełne liczniki, np. `publicLeads`, `overdueTasks`, `appointmentsToday`, `documentsAttention`, `staleListings`, `totalActions`,
  - opcjonalnie `hiddenCount`.
- sidebar powinien używać `today.summary` albo osobnego lekkiego endpointu `GET /dashboard/nav-counts`.

### 4. `Nowe leady` obejmują też leady `contacted` i tylko z ostatnich 24h

**Problem**  
Backend listy `today` pobiera leady o statusach `NEW` oraz `CONTACTED`, ale tylko utworzone w ostatnich 24h.  
Plik:

- `apps/api/src/dashboard/dashboard.service.ts`, linie 490-503

UI nazywa tę metrykę `Nowe leady`.  
Plik:

- `apps/web/src/app/(dashboard)/dashboard/page.tsx`, linie 501-512

**Skutek**  
`Nowe leady` może zawierać lead już obsłużony jako `contacted`, a starszy nieobsłużony lead `NEW` nie trafi do tej liczby. Równolegle insight może pokazać starszy lead oczekujący na obsługę, więc panel `Dzisiaj` może mówić `Czysto`, a insight nadal zgłasza ryzyko.

**Rozwiązanie**  
Wybrać jedną definicję:

- jeśli metryka ma oznaczać nowe nieobsłużone leady: filtrować tylko `PublicLeadStatus.NEW`, bez sztywnego okna 24h albo z osobnym podziałem `nowe` i `zaległe`;
- jeśli ma oznaczać zapytania do obsługi: zmienić label na `Zapytania do obsługi` i uwzględnić starsze `NEW`;
- dodać osobne liczniki `newLeads` i `staleLeads`.

### 5. Brakujące statusy ofert w statystykach i rozbiciu

**Problem**  
Backendowy enum ofert ma status `WITHDRAWN`, ale `ListingStats` i UI pipeline go nie pokazują.  
Pliki:

- `apps/api/src/common/enums/index.ts`, linie 25-33
- `apps/api/src/dashboard/dashboard.service.ts`, linie 241-262
- `apps/web/src/app/(dashboard)/dashboard/page.tsx`, linie 1475-1527

`stats.listings.total` liczy wszystkie statusy z zapytania, ale UI pokazuje tylko: aktywne, szkice, zarezerwowane, sprzedane, wynajęte, zarchiwizowane.

**Skutek**  
Jeżeli istnieją oferty wycofane, suma widocznych statusów nie będzie równa `total`. Pasek statusów może też nie wypełniać 100%.

**Rozwiązanie**  
Dodać `withdrawn` do:

- `ListingStats` backend/frontend;
- mapowania `getListingStats()`;
- `ListingStatusBreakdown`;
- testów dashboardu.

Alternatywnie wykluczyć `withdrawn` z `total`, ale wtedy nazwa `total` powinna być doprecyzowana.

### 6. Brakujące statusy klientów w pipeline

**Problem**  
Enum klientów zawiera `contacted`, `qualified` i `inactive`, ale dashboard stats zwraca tylko `new`, `active`, `negotiating`, `closedWon`, `closedLost`.  
Pliki:

- `apps/api/src/common/enums/index.ts`, linie 147-156
- `apps/api/src/dashboard/dashboard.service.ts`, linie 267-292
- `apps/web/src/app/(dashboard)/dashboard/page.tsx`, linie 1556-1636

**Skutek**  
`stats.clients.total` obejmuje więcej statusów niż pokazuje wykres pipeline. Użytkownik może mieć np. 20 klientów, a widoczne segmenty sumują się do 13.

**Rozwiązanie**  
Dodać brakujące statusy do `ClientStats` i `ClientPipelineBreakdown`:

- `contacted`,
- `qualified`,
- `inactive`.

Jeżeli dashboard ma pokazywać uproszczony pipeline, dodać w UI wiersz `Pozostałe` i tooltip z listą statusów.

### 7. Spotkania `today` i `thisWeek` liczą wszystkie statusy, a lista działań tylko zaplanowane

**Problem**  
`appointments.today` i `appointments.thisWeek` liczą spotkania po dacie bez filtra statusu. `upcoming` oraz lista `today.items` filtrują tylko `SCHEDULED`.  
Pliki:

- `apps/api/src/dashboard/dashboard.service.ts`, linie 318-348
- `apps/api/src/dashboard/dashboard.service.ts`, linie 473-488

UI w priorytetach dnia robi fallback: jeśli w `today.items` są spotkania, pokazuje liczbę zaplanowanych z listy; jeśli ich nie ma, pokazuje `stats.appointments.today`, czyli wszystkie statusy.  
Plik:

- `apps/web/src/app/(dashboard)/dashboard/page.tsx`, linie 497-499

**Skutek**  
`Spotkania dzisiaj` może raz oznaczać zaplanowane spotkania, a raz wszystkie spotkania z dzisiaj, w zależności od tego, czy lista akcji zawiera elementy.

**Rozwiązanie**  
Dodać osobne pola:

- `appointments.todayTotal`,
- `appointments.todayScheduled`,
- `appointments.todayCompleted`,
- `appointments.todayCancelled`,
- `appointments.todayNoShow`.

W UI używać `todayScheduled` dla operacyjnego planu dnia, a `todayTotal` tylko w raportowym kontekście.

### 8. Metryki planu są agencyjne i liczą `Not(ARCHIVED)`, mimo nazwy `activeListings`

**Problem**  
`auth/me.usage.activeListings` jest liczone jako wszystkie oferty w agencji poza `ARCHIVED`. To obejmuje m.in. szkice, zarezerwowane, sprzedane, wynajęte i wycofane.  
Plik:

- `apps/api/src/users/users.service.ts`, linie 256-286

UI opisuje tę metrykę jako `Aktywne oferty publikowane i obsługiwane w CRM`.  
Plik:

- `apps/web/src/lib/plan.ts`, konfiguracja `activeListings`

**Skutek**  
Karta planu może pokazywać inną liczbę niż karta `Aktywne oferty` na dashboardzie. Dla limitów może to być poprawne biznesowo, ale nazwa jest myląca.

**Rozwiązanie**  
Podjąć decyzję:

- jeśli limit dotyczy wszystkich niearchiwizowanych ofert: zmienić nazwę klucza/opisu na `Oferty w workspace` albo `Niearchiwizowane oferty`;
- jeśli limit dotyczy tylko aktywnych ofert: zmienić filtr backendu na `ListingStatus.ACTIVE`;
- przy karcie planu dodać dopisek `Zakres: cały workspace`.

### 9. Nazwy metryk finansowych nie mówią, z jakich statusów są liczone

**Problem**  
Backend liczy:

- `totalListedValue` i `avgPrice` tylko dla statusu `ACTIVE`,
- `soldValue` i `closedCommissionValue` dla statusów `SOLD` oraz `RENTED`.

Plik:

- `apps/api/src/dashboard/dashboard.service.ts`, linie 353-383

UI pokazuje:

- `Średnia cena oferty`,
- `Wartość sprzedaży`,
- `Prowizja zamknięta`.

Plik:

- `apps/web/src/app/(dashboard)/dashboard/page.tsx`, linie 444-469

**Skutek**  
`Średnia cena oferty` brzmi jak średnia ze wszystkich ofert, ale jest średnią aktywnych. `Wartość sprzedaży` obejmuje też wynajem, więc nazwa może być nieprawdziwa.

**Rozwiązanie**  
Zmienić etykiety:

- `Średnia cena aktywnej oferty`,
- `Wartość zamkniętych ofert`,
- `Szac. prowizja z aktywnych ofert`,
- `Szac. prowizja z zamkniętych ofert`.

Lepszy wariant: rozdzielić `soldValue` i `rentedValue`, jeśli wynajem ma inną interpretację przychodową.

### 10. `Ostatnia aktywność` pokazuje ostatnio utworzone rekordy, nie realną aktywność

**Problem**  
`getRecentActivity()` sortuje oferty, klientów i spotkania po `createdAt`. Nie uwzględnia aktualizacji statusu, notatek, publikacji, follow-upów ani zmian dokumentów.  
Plik:

- `apps/api/src/dashboard/dashboard.service.ts`, linie 388-439

**Skutek**  
Sekcja `Ostatnia aktywność` może nie pokazywać faktycznie ostatnich działań użytkownika. Jeżeli ktoś zaktualizował ofertę dziś, ale rekord powstał miesiąc temu, nie pojawi się w tej sekcji.

**Rozwiązanie**  
Opcje:

- zmienić nazwę sekcji na `Ostatnio dodane`;
- albo zbudować prawdziwy feed aktywności z eventów/listing activity, zadań, dokumentów i status changes.

### 11. Raw enumy w aktywności

**Problem**  
Backend składa subtitle jako `Klient · ${c.status}` i `Spotkanie · ${a.type}`.  
Plik:

- `apps/api/src/dashboard/dashboard.service.ts`, linie 417-429

W innych częściach frontendu istnieją polskie mapy etykiet statusów klientów i typów spotkań.

**Skutek**  
Użytkownik może zobaczyć teksty typu `Klient · active` albo `Spotkanie · viewing`, co wygląda niespójnie z resztą aplikacji.

**Rozwiązanie**  
Nie składać gotowego subtitle na backendzie albo zwracać strukturalne pola:

- `status`,
- `type`,
- `city`,
- `entityLabel`.

Frontend powinien użyć istniejących map:

- `CLIENT_STATUS_LABELS`,
- `APPOINTMENT_TYPE_LABELS`,
- `LISTING_STATUS_LABELS`.

Minimalnie: zmapować enumy na backendzie na polskie etykiety.

### 12. Format godziny w kartach `Dzisiaj` jest mylący dla zaległych dokumentów i starych ofert

**Problem**  
`TodayItemCard` pokazuje dla każdego `dueAt` tylko godzinę.  
Plik:

- `apps/web/src/app/(dashboard)/dashboard/page.tsx`, linie 900-903 oraz 1027-1034

Ale `dueAt` dla dokumentów może być datą z przeszłości, a dla starych ofert jest `updatedAt`, czyli data sprzed kilkunastu dni.

**Skutek**  
Karta starej oferty może pokazywać samo `10:00`, bez informacji, że chodzi o aktualizację sprzed 14 dni.

**Rozwiązanie**  
Formatować zależnie od typu i daty:

- spotkanie dzisiaj: `14:30`,
- zadanie po terminie: `Po terminie: 31 sie, 14:30`,
- dokument: `Termin: 28 sie`,
- stara oferta: `Bez zmian od 14 dni`.

### 13. Po oznaczeniu zadania jako wykonane nie odświeżają się insighty i statystyki

**Problem**  
`completeTask()` oznacza zadanie jako `done` i przeładowuje tylko `today`.  
Plik:

- `apps/web/src/hooks/use-dashboard-today.ts`, linie 61-78

W `DashboardPage` callback `onCompleteTask` nie odświeża `insights` ani `stats`.  
Plik:

- `apps/web/src/app/(dashboard)/dashboard/page.tsx`, linie 223-235

**Skutek**  
Po wykonaniu ostatniego zaległego zadania karta `Dzisiaj` może zniknąć, ale insight `Zaległe zadania wymagają reakcji` może zostać do ręcznego odświeżenia.

**Rozwiązanie**  
Po wykonaniu zadania wywołać wspólne odświeżenie:

- `refreshToday()`,
- `refreshInsights()`,
- opcjonalnie `refresh()` dla statystyk.

Lepszy wariant: użyć wspólnego cache/invalidation dla dashboardowych zapytań.

### 14. Teksty onboardingowe zdradzają roadmapę zamiast stanu użytkownika

**Problem**  
Checklista zawiera teksty typu `W kolejnym etapie odblokujemy...`, `Planowane w Sprintach 3-4`, `gdy wdrożymy...`.  
Pliki:

- `apps/web/src/lib/onboarding.ts`, sekcje `publish` i `share`
- `apps/web/src/components/dashboard/onboarding-checklist.tsx`, teksty po ukończeniu core onboardingu

**Skutek**  
Po zalogowaniu użytkownik widzi wewnętrzny język roadmapowy. To obniża wiarygodność produktu i może sugerować niedokończony dashboard.

**Rozwiązanie**  
Zamienić na język użytkownika:

- `Opublikuj ofertę` -> jeśli funkcja dostępna, użyć realnego stanu publikacji;
- jeśli niedostępna, ukryć krok albo pokazać neutralne `Dostępne w wyższych planach / Wkrótce`;
- usunąć wzmianki o sprintach.

### 15. `Pipeline` badge pokazuje `0%` także przy braku danych

**Problem**  
Karta konwersji pokazuje `—`, gdy nie ma zamkniętych spraw, ale badge zakładki `Pipeline` zawsze pokazuje `${stats.clients.conversionRate}%`.  
Pliki:

- `apps/web/src/app/(dashboard)/dashboard/page.tsx`, linie 333-338
- `apps/web/src/app/(dashboard)/dashboard/page.tsx`, sekcja `ConversionCard`

**Skutek**  
Nowy użytkownik widzi `0%`, co wygląda jak realnie słaba konwersja, mimo że nie ma danych.

**Rozwiązanie**  
Dodać do `ClientStats` pole `closedTotal` albo wyliczać je w UI i dla braku danych pokazywać badge `Brak danych` lub ukryć badge.

### 16. Panel dokumentów może zaniżać licznik przy dużej liczbie aktywnych ofert

**Problem**  
`getAttentionSummaryForAgent()` pobiera maksymalnie 100 aktywnych ofert, ale zwraca `total` bez informacji, że licznik może być ograniczony.  
Plik:

- `apps/api/src/listing-documents/listing-documents.service.ts`, linie 367-463

**Skutek**  
Workspace z więcej niż 100 aktywnymi ofertami może dostać zaniżony licznik dokumentów wymagających uwagi.

**Rozwiązanie**  
Opcje:

- liczyć agregaty bez `take: 100`;
- dodać paginację lub batch processing;
- dodać pole `isTruncated` i `scannedListingsCount`, ale to słabsze rozwiązanie dla KPI.

## Proponowany kontrakt docelowy

```ts
interface DashboardTodayResponse {
  scope: 'mine' | 'workspace';
  items: TodayItem[];
  summary: {
    totalActions: number;
    visibleActions: number;
    hiddenActions: number;
    publicLeadsNew: number;
    publicLeadsStale: number;
    overdueTasks: number;
    openTasksWithoutDueDate: number;
    appointmentsTodayScheduled: number;
    appointmentsTodayTotal: number;
    documentsAttention: number;
    staleListings: number;
  };
  generatedAt: string;
}
```

```ts
interface DashboardStats {
  scope: 'mine' | 'workspace';
  listings: {
    total: number;
    draft: number;
    active: number;
    reserved: number;
    sold: number;
    rented: number;
    withdrawn: number;
    archived: number;
  };
  clients: {
    total: number;
    new: number;
    contacted: number;
    qualified: number;
    active: number;
    negotiating: number;
    closedWon: number;
    closedLost: number;
    inactive: number;
    closedTotal: number;
    conversionRate: number | null;
  };
}
```

## Rekomendowana kolejność wdrożenia

1. Uzgodnić jeden domyślny zakres dashboardu: `mine` albo `workspace`.
2. Dodać `scope` do `stats`, `today` i `insights`.
3. Dodać `summary` do `GET /dashboard/today` i przepiąć badge oraz sidebar na agregaty.
4. Uzupełnić brakujące statusy ofert i klientów w DTO oraz UI.
5. Doprecyzować etykiety metryk finansowych i planu.
6. Zmienić `Ostatnia aktywność` na `Ostatnio dodane` albo zbudować prawdziwy feed aktywności.
7. Poprawić format dat/godzin w kartach `Dzisiaj`.
8. Po akcji `Oznacz jako wykonane` odświeżać też insighty.
9. Usunąć roadmapowy język z onboardingu.
10. Dodać testy kontraktu dla dashboardu:
    - status `withdrawn` w ofertach,
    - statusy `contacted`, `qualified`, `inactive` w klientach,
    - różnica `today.items.length` vs `today.summary.totalActions`,
    - brak `0%` konwersji przy braku zamkniętych spraw,
    - spójność zakresu `mine/workspace`.

## Minimalny pakiet zmian przed release

Jeżeli nie ma czasu na pełną przebudowę kontraktu, minimalnie warto zrobić:

1. Zmienić badge zakładki `Dzisiaj` na liczbę z `today.items.length` albo ukryć go.
2. Zmienić label `Nowe leady` na `Zapytania do obsługi`.
3. Zmienić `Średnia cena oferty` na `Średnia cena aktywnej oferty`.
4. Zmienić `Wartość sprzedaży` na `Wartość zamkniętych ofert`.
5. Dodać `withdrawn` do rozbicia ofert.
6. Dodać brakujące statusy klientów albo wiersz `Pozostałe`.
7. Zmapować raw enumy w `Ostatnia aktywność` na polskie etykiety.
8. Usunąć teksty o sprintach i wdrożeniach z checklisty.
9. Przy planie dodać dopisek `Zakres: cały workspace`.
