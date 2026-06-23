# Sprint: zabezpieczenie limitów po downgrade i braku płatności

## Cel

Przygotować bezpieczne zachowanie aplikacji na sytuację, w której workspace miał wyższy plan i utworzył więcej danych, a następnie spadł na niższy plan albo subskrypcja przeszła w `past_due` / `canceled`.

Sprint obejmuje:

- oferty,
- klientów,
- spotkania,
- komunikację limitów w UI,
- backendową egzekucję reguł,
- audyt i monitoring automatycznych zmian.

Najważniejsza zasada: **nie usuwamy danych użytkownika**. Limity ograniczają aktywne użycie produktu i tworzenie nowych zasobów, ale nie powinny niszczyć ani ukrywać historii bez jasnego procesu.

## Decyzje produktowe

### Oferty

Limit planu dotyczy aktywnych ofert, czyli ofert, które realnie zajmują miejsce w CRM i/lub są publicznie używane.

Rekomendowana interpretacja MVP:

- limit `activeListings` liczony po ofertach niearchiwalnych,
- oferty publiczne ponad limit mogą zostać odpublikowane po karencji,
- oferta pozostaje w CRM i może być edytowana,
- użytkownik nie może aktywować / opublikować kolejnej oferty, jeśli jest ponad limitem.

W przypadku downgrade:

1. Dane zostają w bazie.
2. Workspace dostaje stan `over_limit`.
3. Użytkownik widzi banner z informacją, np. `Masz 23/5 aktywnych ofert`.
4. Przez okres karencji użytkownik może sam wybrać, które oferty zostają aktywne.
5. Po karencji system automatycznie zostawia limitowaną liczbę ofert, a nadmiar oznacza jako nieaktywny / odpublikowany.

Domyślna reguła automatycznego wyboru ofert po karencji:

1. oferty ręcznie oznaczone przez użytkownika jako zachowane,
2. oferty publicznie opublikowane,
3. najnowsze aktywne,
4. pozostałe.

Nie usuwamy zdjęć, historii, leadów ani dokumentów.

### Klienci

Limit klientów powinien blokować tworzenie nowych klientów ponad limit, ale nie powinien automatycznie usuwać ani archiwizować istniejących kontaktów.

W przypadku downgrade:

- istniejący klienci pozostają dostępni,
- edycja istniejących klientów zostaje dostępna,
- tworzenie nowego klienta jest blokowane, jeśli liczba klientów przekracza limit,
- import klientów jest blokowany albo wymaga zmniejszenia liczby importowanych rekordów,
- użytkownik może ręcznie archiwizować / usuwać klientów, żeby zejść poniżej limitu.

Nie rekomendujemy automatycznego dezaktywowania klientów, bo klient może być powiązany z transakcjami, spotkaniami, leadami i dokumentacją. Automatyczne ukrywanie kontaktów byłoby ryzykowne operacyjnie.

### Spotkania

Limit spotkań jest miesięczny, więc powinien dotyczyć tworzenia nowych spotkań w bieżącym okresie rozliczeniowym / miesiącu kalendarzowym.

W przypadku downgrade albo `past_due`:

- istniejące spotkania pozostają widoczne,
- edycja istniejących spotkań zostaje dostępna,
- tworzenie nowych spotkań jest blokowane po przekroczeniu limitu miesięcznego,
- przeniesienie spotkania do bieżącego miesiąca powinno być traktowane jak użycie limitu,
- spotkania historyczne nie powinny być usuwane ani ukrywane.

Nie dezaktywujemy automatycznie spotkań, bo są elementem kalendarza i historii pracy.

## Model stanów

### Proponowane stany workspace

- `within_limit` - użycie mieści się w aktualnym planie.
- `near_limit` - użycie przekracza próg ostrzegawczy, np. 80%.
- `over_limit_grace` - użycie przekracza limit, ale trwa okres karencji.
- `over_limit_enforced` - karencja minęła, system egzekwuje ograniczenia.
- `past_due` - subskrypcja nieopłacona; może współistnieć z `over_limit`.
- `canceled` - subskrypcja anulowana; obowiązuje plan fallback, np. Free.

Stan nie musi od razu być osobną kolumną, ale backend powinien umieć go wyliczyć deterministycznie z:

- `Agency.plan`,
- `Agency.subscription`,
- aktualnego usage,
- limitów z `AgencyPlanService`,
- daty wejścia w over-limit / downgrade.

## Sprint 1 - polityka backendowa i źródło prawdy

Status: Zrobione.

Wykonano:

- dodano `AgencyLimitEnforcementService` jako centralną warstwę kalkulacji stanu limitów,
- serwis ocenia zasoby:
  - `activeListings`,
  - `clients`,
  - `monthlyAppointments`,
  - `users`,
- serwis zwraca dla każdego zasobu:
  - `usage`,
  - `limit`,
  - `remaining`,
  - `usageRatio`,
  - `isUnlimited`,
  - `isNearLimit`,
  - `isOverLimit`,
  - `isInGracePeriod`,
  - `enforcementAction`,
- serwis zwraca status workspace:
  - `within_limit`,
  - `near_limit`,
  - `over_limit_grace`,
  - `over_limit_enforced`,
- zachowano `AgencyPlanService` jako źródło limitów planu,
- podpięto serwis w `UsersModule` i wyeksportowano go do użycia w kolejnych modułach,
- dodano testy jednostkowe dla:
  - stanu poniżej limitu,
  - ostrzeżenia przy 80% limitu,
  - przekroczenia limitu,
  - aktywnej karencji,
  - limitów `null` jako nielimitowanych,
  - normalizacji progu ostrzegawczego.

Cel: przygotować centralne miejsce, które liczy stan limitów i pozwala wszystkim modułom korzystać z tych samych reguł.

Zakres:

- dodać serwis np. `AgencyLimitEnforcementService`,
- dodać strukturę wyniku dla zasobów:
  - `activeListings`,
  - `clients`,
  - `monthlyAppointments`,
  - `users` w przyszłości,
- zwracać dla każdego zasobu:
  - `usage`,
  - `limit`,
  - `remaining`,
  - `isNearLimit`,
  - `isOverLimit`,
  - `isInGracePeriod`,
  - `enforcementAction`,
- zachować `AgencyPlanService` jako źródło limitów planu,
- dodać testy jednostkowe dla kalkulacji stanów.

Kryteria akceptacji:

- backend potrafi jednoznacznie powiedzieć, czy workspace jest ponad limitem,
- wynik jest niezależny od UI,
- wszystkie limity używają tej samej logiki porównywania usage do limitu,
- limity `null` są traktowane jako brak limitu.

## Sprint 2 - egzekucja tworzenia i reaktywacji zasobów

Status: Zrobione.

Wykonano:

- przepięto tworzenie ofert na `AgencyLimitEnforcementService`,
- dodano blokadę przywracania oferty ze statusu `archived` do statusu niearchiwalnego ponad limit,
- dodano tę samą blokadę dla cofania statusu oferty z historii, jeśli cofnięcie zwiększyłoby liczbę niearchiwalnych ofert,
- przepięto tworzenie klienta na `AgencyLimitEnforcementService`,
- przepięto import klientów na `AgencyLimitEnforcementService`,
- przepięto tworzenie spotkań na `AgencyLimitEnforcementService`,
- dodano blokadę przeniesienia spotkania do innego miesiąca, jeśli miesiąc docelowy przekracza limit planu,
- zachowano możliwość edycji istniejących ofert, klientów i spotkań, jeśli edycja nie zwiększa przekroczenia limitu,
- rozszerzono odpowiedź `PlanLimitReachedException` o precyzyjne pole `limitCode`:
  - `LISTING_LIMIT_EXCEEDED`,
  - `CLIENT_LIMIT_EXCEEDED`,
  - `APPOINTMENT_LIMIT_EXCEEDED`,
  - `IMAGE_LIMIT_EXCEEDED`,
  - `USER_LIMIT_EXCEEDED`,
- zachowano kompatybilne pole `code: PLAN_LIMIT_REACHED`,
- zaktualizowano typ błędu limitu w kliencie web.

Cel: zablokować działania, które zwiększają przekroczenie limitu.

Zakres dla ofert:

- blokować tworzenie kolejnej aktywnej oferty ponad limit,
- blokować publikację / reaktywację oferty, jeśli workspace jest ponad limitem,
- pozwalać edytować istniejące oferty,
- pozwalać archiwizować / odpublikować oferty,
- zwracać czytelny błąd API z kodem np. `LISTING_LIMIT_EXCEEDED`.

Zakres dla klientów:

- blokować tworzenie klienta ponad limit,
- blokować import klientów, jeśli import przekroczy limit,
- pozwalać edytować istniejących klientów,
- zwracać kod np. `CLIENT_LIMIT_EXCEEDED`.

Zakres dla spotkań:

- blokować tworzenie spotkania ponad miesięczny limit,
- blokować przeniesienie spotkania do miesiąca, który przekracza limit,
- pozwalać edytować istniejące spotkania bez zmiany miesiąca,
- zwracać kod np. `APPOINTMENT_LIMIT_EXCEEDED`.

Kryteria akceptacji:

- limitów nie da się ominąć requestem API,
- frontend może pokazać precyzyjny komunikat na podstawie kodu błędu,
- istniejące dane pozostają dostępne.

## Sprint 3 - UI over-limit i wybór aktywnych ofert

Status: W trakcie - etap 2 zrobiony.

Wykonano w etapie 1:

- dodano reużywalny komponent `PlanLimitStatusBanner`,
- dodano globalny banner limitów w dashboardzie,
- dodano kontekstowy banner limitu na liście ofert,
- dodano kontekstowy banner limitu na liście klientów,
- dodano kontekstowy banner limitu na kalendarzu,
- banner rozróżnia stany:
  - `near_limit`,
  - `limit_reached`,
  - `over_limit`,
- banner pokazuje użycie w formacie `usage/limit`,
- banner wyjaśnia, które działania są blokowane:
  - oferty: dodawanie albo przywracanie ofert,
  - klienci: dodawanie i import klientów,
  - spotkania: tworzenie i przenoszenie spotkań do miesiąca z wykorzystanym limitem,
- CTA do upgrade zapisuje analytics `upgrade_cta_clicked` z kontekstem zasobu,
- przyciski tworzenia w formularzach ofert, klientów i spotkań są wyłączone po osiągnięciu limitu,
- edycja istniejących rekordów pozostaje dostępna.

Pozostało na kolejną iterację Sprintu 3:

- widok ręcznego wyboru aktywnych ofert, gdy `activeListings > limit`,
- backendowy endpoint zapisu wyboru ofert do zachowania,
- blokada / ograniczenie importu CSV klientów na podstawie pozostałego limitu przed wysłaniem requestu,
- dokładniejszy komunikat w formularzu spotkania przy przenoszeniu terminu do miesiąca z wykorzystanym limitem.

Cel: użytkownik rozumie problem i może sam zdecydować, które oferty zostają aktywne.

Zakres:

- dodać banner globalny w dashboardzie dla `over_limit`,
- dodać osobne komunikaty na:
  - liście ofert,
  - formularzu tworzenia oferty,
  - liście klientów,
  - formularzu klienta,
  - kalendarzu / formularzu spotkania,
- dodać widok wyboru aktywnych ofert, gdy `activeListings > limit`,
- pokazać licznik np. `Wybrane 5 z 5`,
- pozwolić zapisać wybór ofert do zachowania,
- dla klientów i spotkań pokazać jasne CTA:
  - usuń / zarchiwizuj rekordy,
  - przejdź na wyższy plan,
  - skontaktuj się z supportem.

Kryteria akceptacji:

- użytkownik nie dostaje tylko błędu API bez kontekstu,
- wiadomo, które zasoby są ponad limitem,
- dla ofert użytkownik może ręcznie wybrać rekordy do zachowania.

## Sprint 4 - karencja i automatyczne odpublicznienie ofert

Status: W trakcie - etap 1 zrobiony.

Wykonano w etapie 1:

- dodano pola karencji na agencji:
  - `limitGraceStartedAt`,
  - `limitGraceEndsAt`,
  - `limitGraceEnforcedAt`,
- dodano migrację `20260619_plan_limit_grace.sql`,
- dodano `AgencyLimitDowngradeEnforcementService`,
- serwis potrafi znaleźć agencje po zakończonej karencji,
- serwis potrafi wymusić limit ofert dla konkretnej agencji,
- nadmiarowe oferty są wybierane deterministycznie:
  - najpierw `isPremium`,
  - potem oferty publicznie opublikowane,
  - potem najnowsze,
  - potem stabilnie po `id`,
- serwis archiwizuje nadmiarowe oferty po karencji przez ustawienie:
  - `status = archived`,
  - `publicationStatus = unpublished`,
  - `unpublishedAt = now`,
- dla opublikowanych nadmiarowych ofert operacja działa również jako odpublicznienie:
  - `publicationStatus = unpublished`,
  - `unpublishedAt = now`,
- dodano endpoint administracyjny `POST /api/admin/agencies/:id/plan/enforce-limits` do ręcznego wymuszenia egzekucji limitu dla wskazanej agencji,
- serwis nie usuwa ofert, zdjęć, leadów ani klientów,
- operacja zapisuje `limitGraceEnforcedAt`,
- operacja wysyła monitoring event `plan_limit_enforced` w flow `plan_limit_enforcement`,
- dodano testy jednostkowe dla:
  - pominięcia aktywnej karencji,
  - pominięcia agencji mieszczącej się w limicie,
  - odpublicznienia nadmiaru po karencji.

Pozostało na kolejną iterację Sprintu 4:

- dodać właściwy scheduler / command uruchamiający `enforceExpiredListingGracePeriods`,
- dodać audyt activity dla automatycznie odpublicznionych ofert,
- dodać mechanizm startowania karencji przy webhooku billingowym / zmianie planu.

Cel: bezpiecznie obsłużyć przypadek, gdy użytkownik nie podejmie decyzji w okresie karencji.

Zakres:

- dodać datę wejścia w over-limit, np. `limitGraceStartedAt`,
- dodać datę końca karencji, np. `limitGraceEndsAt`,
- dodać job cykliczny np. `enforcePlanDowngradeLimits`,
- job powinien:
  - znaleźć workspace po karencji,
  - policzyć aktualne limity,
  - dla ofert wybrać rekordy do zachowania,
  - odpublicznić / zdezaktywować nadmiar,
  - zapisać audyt decyzji,
  - wysłać monitoring event,
- job nie powinien:
  - usuwać rekordów,
  - usuwać zdjęć,
  - usuwać leadów,
  - usuwać klientów,
  - usuwać spotkań.

Kryteria akceptacji:

- po karencji workspace nie ma publicznie aktywnych ofert ponad limit,
- operacja jest idempotentna,
- każda automatyczna zmiana ma wpis audytowy,
- można wyjaśnić użytkownikowi, dlaczego konkretna oferta została odpubliczniona.

## Sprint 4.5 - automatyczny scheduler egzekucji limitów

Status: W trakcie - etap 1 zrobiony.

Obecny stan:

- mamy `AgencyLimitDowngradeEnforcementService`,
- mamy metodę `enforceExpiredListingGracePeriods`,
- mamy ręczny endpoint administracyjny `POST /api/admin/agencies/:id/plan/enforce-limits`,
- mamy podpięty scheduler API, który automatycznie uruchamia egzekucję po zakończeniu karencji.

Wykonano w etapie 1:

- dodano `AgencyLimitDowngradeEnforcementScheduler`,
- scheduler uruchamia `AgencyLimitDowngradeEnforcementService.enforceExpiredListingGracePeriods`,
- scheduler działa raz dziennie o konfigurowanej godzinie:
  - `PLAN_LIMIT_ENFORCEMENT_SCHEDULER_HOUR`,
  - `PLAN_LIMIT_ENFORCEMENT_SCHEDULER_MINUTE`,
- scheduler można wyłączyć przez `PLAN_LIMIT_ENFORCEMENT_SCHEDULER_ENABLED=false`,
- scheduler jest domyślnie wyłączony w `NODE_ENV=test`,
- dodano blokadę przed równoległym uruchomieniem tego samego procesu w jednej instancji API,
- dodano monitoring eventy:
  - `scheduler_run_completed`,
  - `scheduler_run_failed`,
  - `scheduler_run_skipped_already_running`,
- wzmocniono batch egzekucji:
  - błąd jednej agencji jest logowany i raportowany jako `plan_limit_agency_enforcement_failed`,
  - pozostałe agencje nadal są przetwarzane,
- dodano konfigurację do `.env.example`,
- dodano opis operacyjny do `docs/LOCAL_SETUP.md`,
- dodano testy jednostkowe schedulera i batch failure handling.

Wykonano w etapie 2:

- przy zmianie planu agencji przez panel admina backend sprawdza aktualne użycie aktywnych ofert względem nowego limitu,
- jeśli `activeListings > limit`, backend automatycznie ustawia:
  - `limitGraceStartedAt = now`,
  - `limitGraceEndsAt = now + PLAN_LIMIT_DOWNGRADE_GRACE_DAYS`,
  - `limitGraceEnforcedAt = null`,
- jeśli użycie mieści się w nowym limicie albo plan nie ma limitu ofert, backend czyści pola karencji,
- dodano konfigurację `PLAN_LIMIT_DOWNGRADE_GRACE_DAYS` z domyślną wartością `7`,
- dodano testy jednostkowe dla startu i czyszczenia karencji po zmianie planu.

Pozostało na kolejną iterację Sprintu 4.5:

- dodać transakcyjny lock / advisory lock dla środowisk z wieloma instancjami API,
- dodać audyt activity dla każdej automatycznie zarchiwizowanej / odpublicznionej oferty,
- rozważyć dokładniejsze okno czasowe per timezone agencji, jeśli aplikacja będzie działać globalnie.

Cel: automatycznie egzekwować zakończone okresy karencji bez ręcznej akcji supportu.

Zakres:

- dodać moduł schedulera w API, jeśli nie jest jeszcze zarejestrowany,
- dodać job cykliczny, np. `PlanLimitDowngradeEnforcementScheduler`,
- job powinien uruchamiać `AgencyLimitDowngradeEnforcementService.enforceExpiredListingGracePeriods`,
- ustawić bezpieczną częstotliwość MVP, np. raz dziennie w godzinach nocnych,
- dodać lock / zabezpieczenie przed równoległym wykonaniem tej samej egzekucji:
  - minimum: idempotencja na `limitGraceEnforcedAt`,
  - docelowo: transakcyjny lock albo advisory lock, jeśli aplikacja działa w wielu instancjach,
- job powinien logować:
  - start,
  - liczbę znalezionych agencji,
  - liczbę egzekucji,
  - błędy per agencja bez przerywania całej paczki,
- job powinien wysyłać monitoring eventy:
  - sukces batcha,
  - błąd batcha,
  - błąd pojedynczej agencji,
- dodać testy jednostkowe schedulera:
  - wywołuje serwis egzekucji,
  - nie uruchamia drugiej egzekucji, gdy poprzednia nadal trwa,
  - loguje błąd i nie wysadza procesu,
- dodać dokumentację operacyjną:
  - kiedy job działa,
  - jak ręcznie wymusić egzekucję endpointem admina,
  - jak sprawdzić wynik w monitoring/logach.

Kryteria akceptacji:

- po zakończeniu `limitGraceEndsAt` nadmiarowe oferty są automatycznie archiwizowane / odpubliczniane bez ręcznej akcji,
- job jest idempotentny,
- równoległe uruchomienia nie powodują podwójnej albo niespójnej egzekucji,
- błąd jednej agencji nie blokuje przetworzenia pozostałych,
- support nadal może wymusić egzekucję ręcznie przez endpoint admina,
- monitoring pozwala sprawdzić, czy scheduler realnie działa.

## Sprint 5 - monitoring, audyt i testy E2E

Status: W trakcie - etap 1 zrobiony.

Wykonano w etapie 1:

- dodano monitoring event `plan_limit_exceeded` przy wykryciu przekroczenia limitu aktywnych ofert po zmianie planu przez panel admina,
- dodano monitoring event `plan_limit_grace_started` przy automatycznym starcie karencji po downgrade planu,
- dodano monitoring event `plan_limit_resource_blocked` przy blokadzie nowego użycia ponad limit dla:
  - aktywnych ofert,
  - klientów,
  - miesięcznych spotkań,
- uzupełniono automatyczną egzekucję limitu ofert o wpisy activity dla każdej oferty zarchiwizowanej przez system,
- wpis activity dla automatycznie zarchiwizowanej oferty zapisuje:
  - zmianę `status`,
  - zmianę `publicationStatus`,
  - zmianę `unpublishedAt`,
  - limit planu,
  - usage przed egzekucją,
  - powód `plan_limit_downgrade_enforcement`,
- podłączono potrzebne moduły monitoringu do serwisów klientów, spotkań i admin planów,
- dodano testy jednostkowe dla:
  - monitoringu startu karencji,
  - monitoringu wykrycia przekroczenia limitu,
  - audytu ofert archiwizowanych automatycznie.

Wykonano w etapie 2:

- dodano regresyjne testy jednostkowe monitoringu `plan_limit_resource_blocked` dla:
  - aktywnych ofert,
  - batch importu klientów,
  - miesięcznych spotkań,
- testy potwierdzają, że monitoring jest emitowany przed rzuceniem `PlanLimitReachedException`,
- testy sprawdzają metadane eventu:
  - `agencyId`,
  - `resource`,
  - `planCode`,
  - `limit`,
  - `currentUsage`,
  - `attemptedUsage`,
- dodano manualny test plan operacyjny dla scenariuszy:
  - downgrade przez admina,
  - egzekucja po karencji,
  - ręczne wymuszenie egzekucji,
  - blokady tworzenia ponad limit,
  - upgrade / powrót do wyższego planu,
  - przypadki negatywne.

Pozostało na kolejną iterację Sprintu 5:

- dodać monitoring `plan_limit_near`, jeśli zdecydujemy gdzie i jak często go emitować bez spamowania logów,
- dodać pełne testy integracyjne endpointów limitów,
- rozszerzyć widoczność audytu w panelu admin/support,
- dodać monitoring blokad limitów obrazów per oferta, jeśli ma być raportowany razem z limitami planu.

Cel: zapewnić obserwowalność i regresję dla krytycznego flow billingowego.

Zakres:

- dodać monitoring eventy:
  - `plan_limit_near`,
  - `plan_limit_exceeded`,
  - `plan_limit_grace_started`,
  - `plan_limit_enforced`,
  - `plan_limit_resource_blocked`,
- dodać audyt zmian automatycznych dla ofert,
- dodać testy jednostkowe serwisu limitów,
- dodać testy integracyjne endpointów:
  - tworzenie oferty ponad limit,
  - publikacja oferty ponad limit,
  - tworzenie klienta ponad limit,
  - import klientów ponad limit,
  - tworzenie spotkania ponad limit,
- dodać manualny test plan:
  - upgrade,
  - downgrade,
  - past_due,
  - canceled,
  - powrót do wyższego planu.

Kryteria akceptacji:

- każdy krytyczny scenariusz ma test lub opisany manualny test,
- support może zobaczyć powód blokady,
- monitoring pokazuje skalę problemu po wdrożeniu billing flow.

### Manualny test plan Sprintu 5

#### 1. Downgrade przez panel admina

Warunki:

- agencja ma więcej aktywnych ofert niż limit planu docelowego,
- przykład: `activeListings = 9`, nowy limit `5`.

Kroki:

1. Admin zmienia plan agencji na niższy.
2. Otwiera szczegóły planu agencji.
3. Sprawdza usage i warningi limitów.
4. Sprawdza logi monitoringu.

Oczekiwany wynik:

- backend ustawia `limitGraceStartedAt`,
- backend ustawia `limitGraceEndsAt`,
- backend czyści `limitGraceEnforcedAt`,
- monitoring zapisuje `plan_limit_exceeded`,
- monitoring zapisuje `plan_limit_grace_started`,
- użytkownik widzi banner ponad limitem w dashboardzie.

#### 2. Blokady tworzenia ponad limit

Warunki:

- agencja jest na planie, którego limit został osiągnięty albo przekroczony.

Kroki:

1. Użytkownik próbuje dodać nową ofertę ponad limit.
2. Użytkownik próbuje dodać klienta ponad limit.
3. Użytkownik próbuje zaimportować klientów ponad limit.
4. Użytkownik próbuje dodać spotkanie w miesiącu z wykorzystanym limitem.

Oczekiwany wynik:

- API zwraca `PLAN_LIMIT_REACHED`,
- odpowiedź zawiera właściwy `limitCode`,
- monitoring zapisuje `plan_limit_resource_blocked`,
- istniejące dane pozostają dostępne do odczytu i edycji.

#### 3. Egzekucja po końcu karencji

Warunki:

- agencja ma `limitGraceEndsAt` w przeszłości,
- liczba aktywnych ofert nadal przekracza limit.

Kroki:

1. Poczekać na scheduler albo wywołać ręcznie `POST /api/admin/agencies/:id/plan/enforce-limits`.
2. Sprawdzić listę ofert agencji.
3. Sprawdzić historię ofert zarchiwizowanych automatycznie.
4. Sprawdzić logi monitoringu.

Oczekiwany wynik:

- nadmiarowe oferty mają `status = archived`,
- nadmiarowe oferty mają `publicationStatus = unpublished`,
- `limitGraceEnforcedAt` jest ustawione,
- monitoring zapisuje `plan_limit_enforced`,
- każda automatycznie zarchiwizowana oferta ma wpis `activity_logs` z powodem `plan_limit_downgrade_enforcement`.

#### 4. Ręczne wymuszenie przez support

Warunki:

- support zna `agencyId`,
- agencja jest ponad limitem aktywnych ofert.

Kroki:

1. Support wywołuje `POST /api/admin/agencies/:id/plan/enforce-limits`.
2. Support sprawdza odpowiedź endpointu.
3. Support sprawdza, które oferty zostały zachowane i które zarchiwizowane.

Oczekiwany wynik:

- endpoint zwraca `keptListingIds`,
- endpoint zwraca `archivedListingIds`,
- endpoint zwraca `unpublishedListingIds`,
- operacja nie usuwa ofert, zdjęć, leadów ani klientów.

#### 5. Upgrade / powrót do wyższego planu

Warunki:

- agencja była ponad limitem albo miała aktywną karencję.

Kroki:

1. Admin zmienia plan na wyższy.
2. Sprawdza usage względem nowego limitu.
3. Sprawdza pola karencji.

Oczekiwany wynik:

- jeśli usage mieści się w nowym limicie, pola karencji są czyszczone,
- nowe tworzenie zasobów działa zgodnie z nowym limitem,
- wcześniej automatycznie zarchiwizowane oferty nie są przywracane bez świadomej akcji użytkownika/admina.

#### 6. Przypadki negatywne

Scenariusze:

- agencja ma limit `null` dla aktywnych ofert,
- agencja nie ma agentów,
- agencja mieści się w limicie,
- scheduler trafia na błąd jednej agencji w batchu.

Oczekiwany wynik:

- brak automatycznego archiwizowania, jeśli limit jest nielimitowany,
- brak błędu dla agencji bez agentów,
- brak egzekucji, jeśli usage mieści się w limicie,
- błąd jednej agencji jest raportowany i nie blokuje pozostałych.

## Pozostałe sprinty do zamknięcia zakresu

Poniższe sprinty porządkują prace, które pozostały po wykonaniu MVP limitów,
karencji i schedulera. Ich celem jest domknięcie flow produktowo-operacyjnego:
użytkownik wybiera co zostaje aktywne, system ma pełny audyt, billing automatycznie
startuje karencję, a support może diagnozować każdy przypadek.

## Sprint 6 - ręczny wybór ofert do zachowania

Status: Zrobione w zakresie MVP.

Wykonano w etapie 1:

- dodano tabelę `agency_retained_listing_choices` do przechowywania wyboru ofert, które mają zostać aktywne po downgrade,
- dodano encję `AgencyRetainedListingChoice`,
- dodano migrację `20260622_retained_listing_choices.sql`,
- dodano endpoint `GET /api/listings/retention-choices`, który zwraca:
  - `agencyId`,
  - limit aktywnych ofert,
  - aktualne użycie,
  - informację, czy workspace jest ponad limitem,
  - `limitGraceEndsAt`,
  - aktualnie wybrane oferty,
  - aktywne oferty dostępne do wyboru,
- dodano endpoint `PATCH /api/listings/retention-choices` do zapisu wyboru ofert,
- zapis wyboru:
  - deduplikuje `listingIds`,
  - blokuje wybór większej liczby ofert niż limit planu,
  - blokuje zapis, jeśli workspace nie przekracza limitu,
  - blokuje ofertę spoza workspace,
  - blokuje ofertę archiwalną,
  - zapisuje wybór w transakcji,
- podłączono zapisany wybór do `AgencyLimitDowngradeEnforcementService`,
- automatyczna egzekucja po karencji zachowuje najpierw oferty wskazane przez użytkownika,
- jeśli zapisany wybór nie wypełnia limitu albo część wybranych ofert przestała być aktywna, system uzupełnia limit dotychczasową deterministyczną regułą fallback,
- dodano testy jednostkowe dla:
  - pobierania kandydatów i filtrowania nieaktywnych zapisanych wyborów,
  - blokady zapisu powyżej limitu,
  - transakcyjnego zapisu poprawnego wyboru,
  - respektowania wyboru użytkownika przez automatyczną egzekucję.

Wykonano w etapie 2:

- dodano klienta API web dla endpointów:
  - `GET /api/listings/retention-choices`,
  - `PATCH /api/listings/retention-choices`,
- dodano panel `ListingRetentionChoicePanel` na stronie ofert dla workspace ponad limitem aktywnych ofert,
- panel pokazuje:
  - licznik `Wybrane X/Y`,
  - datę końca karencji,
  - listę aktywnych ofert możliwych do zachowania,
  - status publikacji każdej oferty,
  - typ nieruchomości, typ transakcji, lokalizację, datę dodania i cenę,
- dodano filtrowanie ofert po statusie publikacji,
- dodano wyszukiwanie po tytule, mieście, dzielnicy, typie nieruchomości i typie transakcji,
- dodano sortowanie po:
  - dacie dodania rosnąco/malejąco,
  - tytule,
  - cenie rosnąco/malejąco,
- UI blokuje zaznaczanie kolejnych ofert po osiągnięciu limitu,
- zapis wyboru pokazuje komunikat sukcesu albo błąd walidacji z API,
- `PlanLimitStatusBanner` dostał opcjonalny slot na akcję kontekstową,
- na stronie ofert dodano CTA `Wybierz oferty`, które prowadzi z bannera do panelu wyboru.

Wykonano w etapie 3:

- zgodnie z decyzją produktową przeniesiono wybór ofert ze stałego panelu do modala,
- CTA `Wybierz oferty` w bannerze otwiera teraz modal bez przewijania strony,
- modal ładuje kandydatów dopiero po otwarciu, żeby nie wykonywać zbędnego requestu przy samym wejściu na stronę ofert,
- modal można zamknąć przyciskiem, kliknięciem w tło albo klawiszem `Escape`,
- podczas zapisu zamknięcie modala jest blokowane, żeby nie ukryć trwającej operacji,
- dodano analytics:
  - `listing_retention_choices_opened` przy otwarciu modala,
  - `listing_retention_choices_saved` po poprawnym zapisie wyboru,
- zachowano dotychczasowe filtrowanie, sortowanie, licznik `Wybrane X/Y`, datę końca karencji i komunikaty walidacyjne.

Follow-up poza MVP Sprintu 6:

- po zapisie wyboru odświeżać globalny stan użytkownika / banner, jeśli backend zacznie zwracać dodatkowy stan wyboru w `me`,
- dodać test komponentu UI dla limitu zaznaczania oraz zapisu wyboru po decyzji o test runnerze dla `apps/web`.

Cel: pozwolić użytkownikowi samodzielnie wskazać, które oferty mają pozostać
aktywne przed końcem karencji.

Zakres backend:

- dodać strukturę przechowywania wyboru ofert do zachowania, np.:
  - osobna tabela `agency_retained_listing_choices`,
  - albo pole na agencji, jeśli MVP ma być prostsze i tymczasowe,
- dodać endpoint pobierania kandydatów ponad limit:
  - zwraca aktywne oferty,
  - zwraca limit planu,
  - zwraca aktualnie wybrane oferty,
  - zwraca czas końca karencji,
- dodać endpoint zapisu wyboru:
  - waliduje, że oferta należy do agencji,
  - waliduje, że liczba wybranych ofert nie przekracza limitu,
  - waliduje, że oferty nie są archiwalne,
  - działa tylko dla agencji ponad limitem,
- podłączyć wybór do `AgencyLimitDowngradeEnforcementService`, żeby automatyczna
  egzekucja najpierw zachowywała oferty wskazane przez użytkownika,
- jeśli wybrane oferty przestaną być aktywne przed końcem karencji, egzekucja
  powinna uzupełnić limit deterministyczną regułą fallback.

Zakres frontend:

- dodać widok / modal wyboru ofert w kontekście bannera `PlanLimitStatusBanner`,
- pokazać licznik `Wybrane X z Y`,
- zablokować zapis, jeśli użytkownik wybierze więcej niż limit,
- umożliwić filtrowanie/sortowanie ofert po:
  - statusie publikacji,
  - dacie dodania,
  - tytule,
  - cenie,
- jasno pokazać datę końca karencji,
- po zapisie pokazać potwierdzenie i odświeżyć banner.

Kryteria akceptacji:

- użytkownik ponad limitem może wskazać dokładnie, które oferty zostają aktywne,
- zapis wyboru nie pozwala wybrać cudzej ani archiwalnej oferty,
- automatyczna egzekucja po karencji respektuje zapisany wybór,
- jeśli użytkownik nic nie wybierze, działa obecna deterministyczna reguła fallback.

## Sprint 7 - audyt automatycznych zmian i support visibility

Status: Zrobione w zakresie MVP.

Wykonano w etapie 1:

- doprecyzowano istniejący activity audit automatycznej egzekucji limitów ofert,
- dla każdej oferty archiwizowanej przez `AgencyLimitDowngradeEnforcementService` audyt zapisuje teraz jawnie:
  - `agencyId`,
  - `listingId`,
  - poprzedni `status`,
  - nowy `status`,
  - poprzedni `publicationStatus`,
  - nowy `publicationStatus`,
  - `unpublishedAt`,
  - limit planu,
  - usage przed egzekucją,
  - powód `plan_limit_downgrade_enforcement`,
  - `enforcedAt`,
- zachowano dotychczasowe logowanie jako `ActivityAction.ARCHIVED`, żeby historia oferty nadal działała w istniejącym mechanizmie activity,
- rozszerzono test jednostkowy egzekucji downgrade o weryfikację pełnego kontraktu audytu.

Wykonano w etapie 2:

- dodano endpoint admin/support `GET /api/admin/agencies/:id/plan/enforcements`,
- endpoint zwraca ostatnie automatyczne egzekucje limitów dla wskazanej agencji na podstawie `activity_logs`,
- filtrowanie jest oparte o:
  - `agencyId` zapisane w `changes`,
  - powód `plan_limit_downgrade_enforcement`,
- dodano limit wyników:
  - domyślnie `25`,
  - maksymalnie `100`,
- odpowiedź endpointu mapuje activity log na supportowy kontrakt:
  - `agencyId`,
  - `listingId`,
  - `agentId`,
  - akcję,
  - powód,
  - poprzedni i nowy status oferty,
  - poprzedni i nowy status publikacji,
  - limit planu,
  - usage przed egzekucją,
  - `enforcedAt`,
  - `createdAt`,
- endpoint waliduje istnienie agencji przed zwróceniem audytu,
- rozszerzono testy `AdminAgencyPlansService` o filtrowanie, limitowanie i mapowanie odpowiedzi supportowej.

Wykonano w etapie 3:

- rozszerzono odpowiedź `GET /api/admin/agencies/:id/plan` o pola karencji:
  - `limitGraceStartedAt`,
  - `limitGraceEndsAt`,
  - `limitGraceEnforcedAt`,
- dodano klienta web dla `GET /api/admin/agencies/:id/plan/enforcements`,
- w panelu admina planów dodano sekcję `Karencja i egzekucje limitów`,
- sekcja pokazuje:
  - stan karencji (`Brak karencji`, `Karencja aktywna`, `Karencja po terminie`, `Egzekucja wykonana`),
  - datę końca karencji,
  - datę ostatniej egzekucji,
  - liczbę ostatnich automatycznie zarchiwizowanych ofert,
  - listę ostatnich wpisów audytu egzekucji z `listingId`, statusem przed/po, publikacją przed/po, limitem, usage i datą egzekucji,
- dane audytu są pobierane po wyborze agencji i odświeżane razem z panelem,
- dodano regresję backendową potwierdzającą zwracanie pól karencji w odpowiedzi planu agencji.

Follow-up poza MVP Sprintu 7:

- rozważyć dedykowaną tabelę audytu egzekucji, jeśli support będzie potrzebował raportowania niezależnego od historii pojedynczej oferty.

Cel: każdą automatyczną zmianę wykonaną po downgrade da się wyjaśnić użytkownikowi
i supportowi.

Zakres backend:

- dodać audyt activity dla ofert zmienianych automatycznie przez egzekucję limitów,
- dla każdej zarchiwizowanej / odpublicznionej oferty zapisać:
  - `agencyId`,
  - `listingId`,
  - poprzedni `status`,
  - poprzedni `publicationStatus`,
  - nowy `status`,
  - nowy `publicationStatus`,
  - limit planu,
  - usage przed egzekucją,
  - powód `plan_limit_downgrade_enforcement`,
  - czas egzekucji,
- dodać endpoint admin/support do podglądu ostatnich egzekucji limitów dla agencji,
- dodać monitoring event `plan_limit_grace_started` przy starcie karencji,
- dodać monitoring event `plan_limit_resource_blocked` przy blokadzie tworzenia zasobu,
- dodać monitoring event `plan_limit_exceeded` przy wykryciu przekroczenia limitu po zmianie planu.

Zakres frontend:

- w panelu admina planów pokazać:
  - czy trwa karencja,
  - kiedy się kończy,
  - kiedy egzekucja została wykonana,
  - ile ofert zostało automatycznie zarchiwizowanych,
- dodać czytelne komunikaty supportowe przy agencji ponad limitem.

Kryteria akceptacji:

- support może sprawdzić, dlaczego konkretna oferta została zarchiwizowana,
- automatyczna egzekucja zostawia ślad audytowy per oferta,
- monitoring rozróżnia start karencji, blokadę nowego użycia i egzekucję po karencji.

## Sprint 8 - billing webhooki i automatyczne downgrade/past_due/canceled

Status: W trakcie - etap 3 zrobiony.

Wykonano w etapie 1:

- dodano tabelę `billing_webhook_events` do trwałej idempotencji zdarzeń billingowych,
- dodano migrację `20260623_billing_webhook_events.sql`,
- dodano encję `BillingWebhookEvent` z unikalnym kluczem `provider + eventId`,
- dodano `BillingModule`,
- dodano `BillingSubscriptionEventsService` jako provider-agnosticzną warstwę domenową dla zdarzeń subskrypcji,
- serwis obsługuje znormalizowane zdarzenia:
  - `subscription_updated`,
  - `subscription_past_due`,
  - `subscription_canceled`,
- serwis wyszukuje agencję po:
  - `agencyId`,
  - `billingSubscriptionId`,
  - `billingCustomerId`,
- powtórzone zdarzenie `provider + eventId` jest ignorowane bez ponownej zmiany agencji,
- `subscription_canceled` ustawia subskrypcję na `canceled` i fallback planu na `free`, jeśli event nie wskaże innego planu,
- `subscription_past_due` ustawia status `past_due` i zachowuje obecny plan, jeśli event nie wskaże zmiany planu,
- `subscription_updated` aktualizuje plan, status subskrypcji, billing interval i `currentPeriodEnd`,
- po zmianie planu/statusu serwis przelicza użycie aktywnych ofert i:
  - uruchamia karencję, jeśli `activeListings > limit`,
  - czyści karencję, jeśli użycie mieści się w limicie albo plan nie ma limitu,
- billingowy start karencji emituje monitoring:
  - `plan_limit_exceeded`,
  - `plan_limit_grace_started`,
  - z `source: billing_webhook`,
- dodano testy jednostkowe dla:
  - ignorowania duplikatu eventu,
  - `canceled` -> fallback `free` + start karencji,
  - upgrade/aktualizacji subskrypcji czyszczącej karencję, gdy usage mieści się w nowym limicie.

Wykonano w etapie 2:

- dodano publiczny endpoint `POST /api/billing/webhooks/subscription-events`,
- endpoint przyjmuje znormalizowane zdarzenia subskrypcji i przekazuje je do `BillingSubscriptionEventsService`,
- dodano DTO `BillingSubscriptionWebhookDto` z walidacją:
  - `provider`,
  - `eventId`,
  - `eventType`,
  - identyfikatorów agencji/subskrypcji/klienta billingowego,
  - planu,
  - statusu subskrypcji,
  - billing interval,
  - dat `currentPeriodEnd` i `occurredAt`,
  - `rawPayload`,
- endpoint wymaga podpisu HMAC-SHA256 w nagłówku `x-estateflow-billing-signature`,
- podpis jest liczony z kanonicznego JSON payloadu i sekretu `BILLING_WEBHOOK_SECRET`,
- brak sekretu zwraca kontrolowany błąd konfiguracji `503`,
- brak albo niepoprawny podpis zwraca `401` i nie wywołuje serwisu domenowego,
- dodano `BILLING_WEBHOOK_SECRET` do `.env.example` i `docs/LOCAL_SETUP.md`,
- dodano testy jednostkowe kontrolera webhooka dla:
  - poprawnego podpisu,
  - błędnego podpisu,
  - braku skonfigurowanego sekretu.

Wykonano w etapie 3:

- dodano trwałe oznaczanie błędnych eventów billingowych w `billing_webhook_events`,
- jeśli przetwarzanie zdarzenia zakończy się błędem, event jest zapisywany ze statusem `failed`,
- zapis `failed` zawiera:
  - `provider`,
  - `eventId`,
  - `eventType`,
  - payload audytowy,
  - komunikat błędu,
  - `agencyId = null`, jeśli agencji nie udało się ustalić,
- po zapisaniu błędnego eventu serwis nadal rzuca oryginalny błąd do kontrolera,
- powtórzenie tego samego `provider + eventId` jest potem ignorowane przez mechanizm idempotencji,
- dodano test jednostkowy dla błędu lookupu agencji, który potwierdza:
  - brak zapisu zmian na agencji,
  - zapis eventu ze statusem `failed`,
  - zachowanie komunikatu błędu.

Pozostało na kolejną iterację Sprintu 8:

- zmapować realne payloady providera płatności, np. Stripe, na `BillingSubscriptionEventsService`,
- doprecyzować produktową regułę `past_due`, jeśli ma mieć osobną krótszą karencję albo blokady inne niż standardowy downgrade,
- dodać testy integracyjne endpointu webhooka.

Cel: flow limitów działa nie tylko po ręcznej zmianie planu przez admina, ale też
po realnych zdarzeniach billingowych.

Zakres:

- podłączyć webhooki providera płatności dla zdarzeń:
  - zmiana planu,
  - `past_due`,
  - `canceled`,
  - powrót do aktywnej subskrypcji,
- po downgrade albo `canceled` przeliczyć usage i uruchomić karencję, jeśli agencja jest ponad limitem,
- po `past_due` ustalić osobną regułę:
  - czy natychmiast blokujemy nowe użycie,
  - czy dajemy krótszą karencję,
  - czy tylko pokazujemy ostrzeżenie przez kilka dni,
- po powrocie do wyższego planu:
  - wyczyścić karencję, jeśli usage mieści się w limicie,
  - nie przywracać automatycznie archiwizowanych ofert bez świadomej akcji użytkownika/admina,
- dodać idempotencję webhooków na podstawie event id,
- dodać testy jednostkowe i integracyjne dla najważniejszych eventów.

Kryteria akceptacji:

- realny downgrade z systemu płatności ustawia te same pola karencji co panel admina,
- powtarzany webhook nie duplikuje efektów,
- `past_due` i `canceled` mają jasno opisane, testowalne zachowanie,
- upgrade usuwa niepotrzebne ostrzeżenia, jeśli agencja mieści się w nowym limicie.

## Sprint 9 - odporność schedulera w wielu instancjach

Status: Do zrobienia.

Cel: scheduler pozostaje bezpieczny, gdy API działa w kilku instancjach.

Zakres:

- dodać transakcyjny lock albo PostgreSQL advisory lock dla batcha egzekucji,
- lock powinien obejmować:
  - uruchomienie schedulera,
  - wybór agencji po zakończonej karencji,
  - egzekucję limitu dla konkretnej agencji,
- zabezpieczyć przed sytuacją, w której dwie instancje archiwizują te same oferty równolegle,
- dodać metrykę / monitoring, gdy instancja pomija run, bo lock jest zajęty,
- dodać test integracyjny albo test serwisu z mockiem lock managera.

Kryteria akceptacji:

- równoległe instancje API nie wykonują tej samej egzekucji dwa razy,
- jeśli lock jest zajęty, scheduler kończy bez błędu i raportuje skip,
- idempotencja na `limitGraceEnforcedAt` nadal działa jako dodatkowe zabezpieczenie.

## Sprint 10 - testy integracyjne, regresja i manualny test plan

Status: Do zrobienia.

Cel: domknąć jakość flow, które dotyka billing, dane użytkownika i publiczne oferty.

Zakres testów automatycznych:

- downgrade agencji z ofertami ponad limit startuje karencję,
- scheduler po końcu karencji archiwizuje nadmiar ofert,
- ręczny wybór ofert jest respektowany przez egzekucję,
- tworzenie oferty ponad limit jest blokowane,
- przywracanie oferty ponad limit jest blokowane,
- tworzenie klienta ponad limit jest blokowane,
- import klientów ponad limit jest blokowany,
- tworzenie spotkania ponad limit jest blokowane,
- przeniesienie spotkania do miesiąca z wykorzystanym limitem jest blokowane,
- webhook downgrade jest idempotentny,
- webhook upgrade czyści karencję, jeśli usage mieści się w limicie.

Manualny test plan:

- admin zmienia plan z wyższego na niższy,
- użytkownik widzi banner ponad limitem,
- użytkownik wybiera oferty do zachowania,
- kończy się karencja,
- scheduler archiwizuje nadmiar,
- support widzi audyt zmian,
- użytkownik przechodzi na wyższy plan,
- użytkownik ręcznie przywraca wybrane oferty, jeśli ma już wolny limit.

Kryteria akceptacji:

- krytyczne scenariusze mają test automatyczny albo opisany test manualny,
- testy można uruchomić lokalnie bez produkcyjnego providera płatności,
- dokument jasno opisuje, co support powinien sprawdzić przy zgłoszeniu dotyczącym limitów.

## Reguły bezpieczeństwa danych

- Nie usuwamy danych automatycznie.
- Nie ukrywamy historii pracy użytkownika.
- Nie blokujemy logowania.
- Nie blokujemy odczytu własnych danych.
- Nie blokujemy eksportu danych, jeśli zostanie dodany.
- Nie blokujemy edycji istniejących danych, chyba że edycja zwiększa przekroczenie limitu.
- Blokujemy tworzenie albo reaktywację zasobów ponad limit.
- Publiczne użycie oferty może zostać ograniczone po karencji.

## Copy UX

Przykład dla ofert:

> Twój obecny plan pozwala na 5 aktywnych ofert. Masz teraz 23 aktywne oferty. Wybierz 5 ofert, które mają pozostać aktywne, albo przejdź na wyższy plan.

Przykład dla klientów:

> Twój obecny plan pozwala na 25 klientów. Masz 84 klientów. Możesz nadal edytować istniejące kontakty, ale dodanie nowych klientów jest zablokowane do czasu zmniejszenia liczby kontaktów albo zmiany planu.

Przykład dla spotkań:

> Twój obecny plan pozwala na 20 spotkań miesięcznie. Limit na ten miesiąc został wykorzystany. Możesz edytować istniejące spotkania, ale nowe spotkania wymagają wyższego planu.

## Otwarte decyzje

- Czy karencja ma trwać 7, 14 czy 30 dni?
- Czy `past_due` ma mieć krótszą karencję niż świadomy downgrade?
- Czy limit ofert liczymy jako wszystkie niearchiwalne, czy tylko publicznie opublikowane?
- Czy użytkownik może zachować ponadlimitowe oferty jako szkice bez publikacji?
- Czy klient może zostać „zarchiwizowany”, czy tylko usunięty?
- Czy spotkania liczymy po dacie rozpoczęcia, dacie utworzenia, czy okresie rozliczeniowym?
- Czy admin/support może nadać ręczne przedłużenie karencji?

## Rekomendacja MVP

Na start wdrożyć:

1. blokady backendowe dla tworzenia zasobów ponad limit,
2. jasny UI `over_limit`,
3. ręczny wybór aktywnych ofert,
4. brak automatycznego ruszania klientów i spotkań,
5. automatyczne odpublicznienie tylko ofert i tylko po karencji,
6. audyt i monitoring wszystkich automatycznych zmian.
